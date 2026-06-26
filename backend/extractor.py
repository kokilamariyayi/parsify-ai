import json
import logging
import os
import re
import time
from typing import Any, Optional

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logger = logging.getLogger("parseiq")

MODEL = "llama3-8b-8192"
PREVIEW_LENGTH = 500

CLASSIFICATION_PROMPT = """You are a document classifier. Given the following text, classify it as one of: invoice, contract, resume, general.
Respond with ONLY a JSON object: {{"type": "<type>", "confidence": <0-1>}}

Document text:
\"\"\"
{text}
\"\"\"
"""

EXTRACTION_SYSTEM = """You are a data extraction engine. You ONLY output valid JSON. You NEVER respond conversationally. You NEVER say 'I' or 'you'. No matter what the input is, always extract structured fields and return ONLY a JSON object. No explanation. No preamble."""

EXTRACTION_PROMPT = """You are a data extraction engine. You ONLY output valid JSON. You NEVER respond conversationally. You NEVER say 'I' or 'you'. No matter what the input is, always extract structured fields and return ONLY a JSON object. No explanation. No preamble.

Extract all structured fields from the following {document_type} document.

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code fences.
- If a field is not present, set its value to null.
- For arrays, return empty array [] if nothing found.
- Dates must be in ISO 8601 format (YYYY-MM-DD) where possible.
- Amounts must be numeric (float), not strings.
- For line items, extract every row completely.

For invoice documents, extract: invoice_number, invoice_date, due_date, vendor_name, vendor_address, client_name, client_address, line_items (array of {{description, qty, unit_price, total}}), subtotal, tax, total_amount, currency, payment_terms

For contract documents, extract: contract_title, parties (array of {{name, role}}), effective_date, expiry_date, governing_law, key_obligations (array), penalty_clauses (array), signatures (array of {{name, date}})

For resume documents, extract: full_name, email, phone, location, skills (array), education (array of {{degree, institution, year}}), experience (array of {{title, company, duration, responsibilities}}), certifications (array)

For general documents, extract: entities (people, orgs, locations), dates, amounts, key_phrases, document_type_guess

Document text:
\"\"\"
{text}
\"\"\"

Return the JSON extraction now:
"""

CONFIDENCE_PROMPT = """You are a field-level confidence scorer for document extraction.

Given the source document text and the extracted fields JSON, score each top-level field (and nested array items as "field_name[index].subfield") from 0.0 to 1.0 based on how clearly the value appeared in the source text.

Rules:
- Return ONLY valid JSON: {{"field_name": 0.95, "line_items[0].description": 0.8, ...}}
- 1.0 = explicitly and unambiguously present in text
- 0.5 = inferred or partially present
- 0.0 = not found in source (likely hallucinated)
- Include all fields from the extraction, use dot/bracket notation for nested fields

Source text:
\"\"\"
{text}
\"\"\"

Extracted fields:
{fields}

Return confidence scores now:
"""


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_key_here":
        raise RuntimeError(
            "Groq API key not configured. Set GROQ_API_KEY in backend/.env"
        )
    return Groq(api_key=api_key)


def _parse_json_response(content: str) -> dict[str, Any]:
    content = content.strip()
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Invalid JSON from LLM: {exc}") from exc


def _groq_chat(client: Groq, system: str, user: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
        max_tokens=4096,
    )
    return response.choices[0].message.content or ""


def classify_document(client: Groq, text: str) -> tuple[str, float]:
    truncated = text[:8000]
    content = _groq_chat(
        client,
        "You are a document classifier. Respond with ONLY valid JSON.",
        CLASSIFICATION_PROMPT.format(text=truncated),
    )
    result = _parse_json_response(content)
    doc_type = str(result.get("type", "general")).lower()
    if doc_type not in ("invoice", "contract", "resume", "general"):
        doc_type = "general"
    confidence = float(result.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))
    return doc_type, confidence


def extract_fields(client: Groq, text: str, document_type: str) -> dict[str, Any]:
    truncated = text[:12000]
    content = _groq_chat(
        client,
        EXTRACTION_SYSTEM,
        EXTRACTION_PROMPT.format(document_type=document_type, text=truncated),
    )
    return _parse_json_response(content)


def score_field_confidences(
    client: Groq, text: str, fields: dict[str, Any]
) -> dict[str, float]:
    truncated = text[:8000]
    fields_str = json.dumps(fields, indent=2)
    content = _groq_chat(
        client,
        "You are a field confidence scorer. Return ONLY valid JSON.",
        CONFIDENCE_PROMPT.format(text=truncated, fields=fields_str),
    )
    raw = _parse_json_response(content)
    return {k: max(0.0, min(1.0, float(v))) for k, v in raw.items()}


def flatten_field_keys(fields: dict[str, Any], prefix: str = "") -> list[str]:
    keys: list[str] = []
    for key, value in fields.items():
        full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        if isinstance(value, dict):
            keys.extend(flatten_field_keys(value, full_key))
        elif isinstance(value, list):
            if not value:
                keys.append(full_key)
            else:
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        keys.extend(flatten_field_keys(item, f"{full_key}[{i}]"))
                    else:
                        keys.append(f"{full_key}[{i}]")
        else:
            keys.append(full_key)
    return keys


def extract_from_text(
    text: str, filename: Optional[str] = None
) -> dict[str, Any]:
    start = time.perf_counter()

    if not text or not text.strip():
        raise ValueError("Document is empty.")

    print("EXTRACTING FROM VOICE TEXT:", text[:100])

    client = _get_client()

    doc_type, classify_confidence = classify_document(client, text)
    logger.info("ParseIQ: document type detected: %s (confidence: %.2f)", doc_type, classify_confidence)

    fields = extract_fields(client, text, doc_type)
    field_count = len(flatten_field_keys(fields))
    logger.info("ParseIQ: extracted %d fields", field_count)

    try:
        field_confidences = score_field_confidences(client, text, fields)
    except Exception as exc:
        logger.warning("ParseIQ: field confidence scoring failed: %s", exc)
        field_confidences = {}

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    logger.info("ParseIQ: processing completed in %d ms", elapsed_ms)

    preview = text[:PREVIEW_LENGTH]
    if len(text) > PREVIEW_LENGTH:
        preview += "..."

    return {
        "document_type": doc_type,
        "confidence": classify_confidence,
        "fields": fields,
        "field_confidences": field_confidences,
        "raw_text_preview": preview,
        "processing_time_ms": elapsed_ms,
        "filename": filename,
    }
