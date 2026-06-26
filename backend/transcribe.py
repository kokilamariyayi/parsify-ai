import os

import httpx
from fastapi import UploadFile


async def transcribe_audio(file: UploadFile) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    audio_bytes = await file.read()

    print(f"Audio size: {len(audio_bytes)} bytes")
    print(f"File name: {file.filename}")
    print(f"Content type: {file.content_type}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={
                "file": (file.filename, audio_bytes, file.content_type)
            },
            data={
                "model": "whisper-large-v3",
                "response_format": "verbose_json",
                "language": "en"
            }
        )

    result = response.json()

    return {
        "transcribed_text": result.get("text", ""),
        "duration_seconds": result.get("duration", 0),
        "language_detected": result.get("language", "en")
    }
