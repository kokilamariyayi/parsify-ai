from typing import Any, Optional

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: Optional[str] = None
    qty: Optional[float] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None


class Party(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


class Education(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[str] = None


class Experience(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    duration: Optional[str] = None
    responsibilities: Optional[list[str]] = None


class Signature(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None


class FieldConfidence(BaseModel):
    field: str
    confidence: float


class ExtractionResult(BaseModel):
    document_type: str
    confidence: float
    fields: dict[str, Any]
    field_confidences: dict[str, float] = Field(default_factory=dict)
    raw_text_preview: str
    processing_time_ms: int
    filename: Optional[str] = None


class TextExtractionRequest(BaseModel):
    text: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


class BatchSummary(BaseModel):
    total_files: int
    successful: int
    failed: int
    avg_confidence: float


class BatchExtractionResponse(BaseModel):
    results: list[ExtractionResult | ErrorResponse]
    summary: BatchSummary


class HealthResponse(BaseModel):
    status: str
    service: str = "ParseIQ"


class TranscriptionResponse(BaseModel):
    transcribed_text: str
    duration_seconds: float
    language_detected: Optional[str] = None
