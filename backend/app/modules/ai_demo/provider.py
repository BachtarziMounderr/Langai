"""Google Gen AI adapter for the context-scoped student conversation demo."""

import base64
import binascii
import json
import logging
from os import environ
from typing import Protocol

from google import genai
from google.genai import errors, types
from google.genai.client import AsyncClient
from pydantic import BaseModel, Field, ValidationError

LOGGER = logging.getLogger(__name__)
DEFAULT_MODEL = "gemini-3.8-flash"
DEFAULT_TTS_MODEL = "gemini-3.8-flash-lite-tts"


class ProviderError(Exception):
    """A safe provider error to show without leaking upstream details."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class ConversationProvider(Protocol):
    async def reply(
        self,
        *,
        language: str,
        level: str,
        scenario: str,
        objective: str,
        history: list[dict[str, str]],
        text: str | None,
        audio: str | None,
        audio_mime: str | None,
    ) -> tuple[str, str, str | None]: ...


class GeminiTurn(BaseModel):
    """Only the two fields needed by the student UI may leave the model boundary."""

    transcript: str = Field(min_length=1, max_length=500)
    reply: str = Field(min_length=1, max_length=500)


class GeminiProvider:
    """Generate a short tutor turn and optionally synthesize it as WAV audio."""

    def __init__(self) -> None:
        self.key = environ.get("GEMINI_API_KEY", "").strip()
        self.model = environ.get("GEMINI_MODEL", "").strip() or DEFAULT_MODEL
        self.tts_model = environ.get("GEMINI_TTS_MODEL", "").strip() or DEFAULT_TTS_MODEL

    @staticmethod
    def _api_error(exc: errors.APIError) -> ProviderError:
        if exc.code in (401, 403):
            return ProviderError(
                "AI_ACCESS_DENIED",
                "AI conversation is unavailable for this project. Ask its administrator to check Gemini access.",
            )
        if exc.code == 404:
            return ProviderError(
                "AI_MODEL_UNAVAILABLE",
                "The configured AI model is unavailable. Ask the project administrator to update it.",
            )
        if exc.code == 429:
            return ProviderError(
                "AI_RATE_LIMITED", "The AI request limit was reached. Try again later."
            )
        return ProviderError(
            "AI_UNAVAILABLE", "The AI partner is unavailable right now. Please retry."
        )

    @staticmethod
    def _parse_turn(response: types.GenerateContentResponse) -> GeminiTurn:
        try:
            parsed = response.parsed
            if isinstance(parsed, GeminiTurn):
                turn = parsed
            elif parsed is not None:
                turn = GeminiTurn.model_validate(parsed)
            else:
                turn = GeminiTurn.model_validate_json(response.text or "")
            transcript = turn.transcript.strip()
            reply = turn.reply.strip()
            if not transcript or not reply:
                raise ValueError("Empty conversation turn")
            return GeminiTurn(transcript=transcript, reply=reply)
        except (ValidationError, ValueError, TypeError) as exc:
            raise ProviderError(
                "AI_BAD_RESPONSE", "The AI partner could not complete this turn. Please retry."
            ) from exc

    async def _synthesize(self, client: AsyncClient, answer: str) -> str | None:
        try:
            speech = await client.models.generate_content(
                model=self.tts_model,
                contents=answer,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(voice="Kore")),
                ),
            )
            for candidate in speech.candidates or []:
                for part in candidate.content.parts if candidate.content else []:
                    blob = part.inline_data
                    # Gemini 3.8 unary TTS returns a WAV container. The browser expects audio/wav.
                    if blob and isinstance(blob.data, bytes) and blob.data.startswith(b"RIFF"):
                        return base64.b64encode(blob.data).decode("ascii")
            LOGGER.warning("Gemini speech returned no WAV data model=%s", self.tts_model)
        except Exception as exc:
            # Speech is optional: a failed TTS call must not discard a valid text answer.
            LOGGER.warning(
                "Gemini speech failed model=%s error_type=%s",
                self.tts_model,
                type(exc).__name__,
            )
        return None

    async def reply(
        self,
        *,
        language: str,
        level: str,
        scenario: str,
        objective: str,
        history: list[dict[str, str]],
        text: str | None,
        audio: str | None,
        audio_mime: str | None,
    ) -> tuple[str, str, str | None]:
        if not self.key:
            raise ProviderError("AI_NOT_CONFIGURED", "Gemini is not configured for this demo.")
        if not (text and text.strip()) and not audio:
            raise ProviderError("AI_BAD_INPUT", "A text or voice message is required.")

        instruction = (
            f"You are a friendly language tutor role-playing '{scenario}' in {language} at {level}. "
            f"Learning objective: {objective}. Reply naturally in {language}, in one or two short sentences, "
            "then ask a simple follow-up. Keep the conversation on the scenario. "
            "If a voice clip is supplied, transcribe the learner's spoken words accurately. "
            "Do not include personal data in the response."
        )
        parts = []
        if history:
            parts.append(
                types.Part.from_text(
                    text="Recent turns for context: " + json.dumps(history, ensure_ascii=False)
                )
            )
        if text and text.strip():
            parts.append(types.Part.from_text(text="Learner says: " + text.strip()))
        if audio and audio_mime:
            try:
                audio_bytes = base64.b64decode(audio, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise ProviderError("AI_BAD_AUDIO", "The voice recording is invalid.") from exc
            parts.append(types.Part.from_bytes(data=audio_bytes, mime_type=audio_mime))
        async with genai.Client(
            api_key=self.key, http_options=types.HttpOptions(timeout=35_000)
        ).aio as client:
            try:
                response = await client.models.generate_content(
                    model=self.model,
                    contents=[types.Content(role="user", parts=parts)],
                    config=types.GenerateContentConfig(
                        system_instruction=instruction,
                        response_mime_type="application/json",
                        response_schema=GeminiTurn,
                        thinking_config=types.ThinkingConfig(thinking_level="low"),
                        max_output_tokens=800,
                    ),
                )
            except errors.APIError as exc:
                LOGGER.warning(
                    "Gemini conversation failed status=%s model=%s", exc.code, self.model
                )
                raise self._api_error(exc) from exc
            except Exception as exc:
                LOGGER.warning(
                    "Gemini conversation failed model=%s error_type=%s",
                    self.model,
                    type(exc).__name__,
                )
                raise ProviderError(
                    "AI_UNAVAILABLE", "The AI partner is unavailable right now. Please retry."
                ) from exc

            turn = self._parse_turn(response)
            audio_out = await self._synthesize(client, turn.reply)
            return text.strip() if text and text.strip() else turn.transcript, turn.reply, audio_out


def get_provider() -> ConversationProvider:
    return GeminiProvider()
