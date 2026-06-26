import logging
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from extractor import extract_from_text
from parser import parse_document
from schemas import (
    BatchExtractionResponse,
    BatchSummary,
    ErrorResponse,
    ExtractionResult,
    HealthResponse,
    TextExtractionRequest,
    TranscriptionResponse,
)
from transcribe import transcribe_audio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("parseiq")

app = FastAPI(
    title="ParseIQ",
    description="Structured Data Extraction API powered by Groq LLM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://parsify-ai.web.app",
        "https://parsify-ai.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="ParseIQ")


@app.post("/extract", response_model=ExtractionResult)
async def extract_file(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        text = parse_document(file_bytes, file.filename, file.content_type)
        result = extract_from_text(text, filename=file.filename)
        return ExtractionResult(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("ParseIQ: extraction failed")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {exc}. Please retry.",
        ) from exc


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: UploadFile = File(...),
    duration_seconds: Optional[float] = Form(None),
):
    """Transcribe audio only. Structured extraction uses extract_from_text via POST /extract-text."""
    try:
        result = await transcribe_audio(file)
        return TranscriptionResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("ParseIQ: transcription failed")
        raise HTTPException(
            status_code=500,
            detail="Transcription failed, please use text input instead",
        ) from exc


@app.post("/extract-text", response_model=ExtractionResult)
async def extract_text(body: TextExtractionRequest):
    try:
        if not body.text or not body.text.strip():
            raise ValueError("Document is empty.")
        result = extract_from_text(body.text)
        return ExtractionResult(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("ParseIQ: text extraction failed")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {exc}. Please retry.",
        ) from exc


@app.post("/batch", response_model=BatchExtractionResponse)
async def batch_extract(files: list[UploadFile] = File(...)):
    results: list[ExtractionResult | ErrorResponse] = []
    successful = 0
    failed = 0
    confidence_sum = 0.0

    for upload in files:
        try:
            file_bytes = await upload.read()
            text = parse_document(file_bytes, upload.filename, upload.content_type)
            result = extract_from_text(text, filename=upload.filename)
            extraction = ExtractionResult(**result)
            results.append(extraction)
            successful += 1
            confidence_sum += extraction.confidence
        except ValueError as exc:
            results.append(ErrorResponse(error=str(exc), detail=upload.filename))
            failed += 1
        except RuntimeError as exc:
            results.append(ErrorResponse(error=str(exc), detail=upload.filename))
            failed += 1
        except Exception as exc:
            results.append(
                ErrorResponse(
                    error=f"Extraction failed: {exc}",
                    detail=upload.filename,
                )
            )
            failed += 1

    avg_confidence = confidence_sum / successful if successful > 0 else 0.0

    summary = BatchSummary(
        total_files=len(files),
        successful=successful,
        failed=failed,
        avg_confidence=round(avg_confidence, 3),
    )

    return BatchExtractionResponse(results=results, summary=summary)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
        headers={"X-Service": "ParseIQ"},
    )
