"""Contract tests for the Google SDK adapter without external API calls."""

import base64
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from google.genai import errors, types

from app.modules.ai_demo.provider import GeminiProvider, GeminiTurn, ProviderError

CALL = {
    "language": "English",
    "level": "B1",
    "scenario": "At the restaurant",
    "objective": "Make a polite request.",
    "history": [],
    "text": "A table for two, please.",
    "audio": None,
    "audio_mime": None,
}


class FakeClient:
    def __init__(self, responses: list[object]):
        self.responses = responses
        self.calls: list[dict] = []
        self.aio = self
        self.models = self
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        self.closed = True

    async def generate_content(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def text_response(transcript: str = "A table for two, please.") -> types.GenerateContentResponse:
    return types.GenerateContentResponse(
        parsed=GeminiTurn(transcript=transcript, reply="Welcome! Would you like a menu?")
    )


def wav_response() -> types.GenerateContentResponse:
    return types.GenerateContentResponse(
        candidates=[
            types.Candidate(
                content=types.Content(
                    parts=[
                        types.Part(inline_data=types.Blob(mime_type="audio/wav", data=b"RIFFdemo"))
                    ]
                )
            )
        ]
    )


def api_error(code: int) -> errors.APIError:
    return errors.APIError(code, {"error": {"code": code, "message": "upstream detail"}})


class GeminiProviderTests(unittest.IsolatedAsyncioTestCase):
    def test_response_schema_omits_unsupported_additional_properties(self) -> None:
        self.assertNotIn("additionalProperties", GeminiTurn.model_json_schema())

    async def test_missing_key_fails_before_creating_client(self) -> None:
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": ""}),
            patch("app.modules.ai_demo.provider.genai.Client") as factory,
        ):
            with self.assertRaises(ProviderError) as caught:
                await GeminiProvider().reply(**CALL)
        self.assertEqual(caught.exception.code, "AI_NOT_CONFIGURED")
        factory.assert_not_called()

    async def test_text_uses_sdk_schema_and_returns_wav(self) -> None:
        fake = FakeClient([text_response("Model paraphrase"), wav_response()])
        with (
            patch.dict(
                os.environ,
                {
                    "GEMINI_API_KEY": "test-key",
                    "GEMINI_MODEL": "gemini-3.8-flash",
                    "GEMINI_TTS_MODEL": "gemini-3.8-flash-lite-tts",
                },
            ),
            patch("app.modules.ai_demo.provider.genai.Client", return_value=fake) as factory,
        ):
            transcript, reply, audio = await GeminiProvider().reply(**CALL)
        self.assertEqual(transcript, CALL["text"])
        self.assertEqual(reply, "Welcome! Would you like a menu?")
        self.assertEqual(audio, base64.b64encode(b"RIFFdemo").decode("ascii"))
        self.assertEqual(len(fake.calls), 2)
        self.assertEqual(fake.calls[0]["model"], "gemini-3.8-flash")
        config = fake.calls[0]["config"]
        self.assertEqual(config.response_mime_type, "application/json")
        self.assertIs(config.response_schema, GeminiTurn)
        self.assertEqual(config.thinking_config.thinking_level, types.ThinkingLevel.LOW)
        self.assertEqual(fake.calls[1]["model"], "gemini-3.8-flash-lite-tts")
        self.assertEqual(fake.calls[1]["config"].response_modalities, ["AUDIO"])
        self.assertTrue(fake.closed)
        self.assertEqual(factory.call_args.kwargs["api_key"], "test-key")

    async def test_audio_is_decoded_into_an_sdk_part(self) -> None:
        fake = FakeClient([text_response("I would like a table."), wav_response()])
        payload = {
            **CALL,
            "text": None,
            "audio": base64.b64encode(b"voice").decode(),
            "audio_mime": "audio/webm",
        }
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch("app.modules.ai_demo.provider.genai.Client", return_value=fake),
        ):
            transcript, _, _ = await GeminiProvider().reply(**payload)
        self.assertEqual(transcript, "I would like a table.")
        part = fake.calls[0]["contents"][0].parts[-1]
        self.assertEqual(part.inline_data.data, b"voice")
        self.assertEqual(part.inline_data.mime_type, "audio/webm")

    async def test_permission_denial_has_a_safe_actionable_error(self) -> None:
        fake = FakeClient([api_error(403)])
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch("app.modules.ai_demo.provider.genai.Client", return_value=fake),
        ):
            with self.assertRaises(ProviderError) as caught:
                await GeminiProvider().reply(**CALL)
        self.assertEqual(caught.exception.code, "AI_ACCESS_DENIED")
        self.assertNotIn("upstream detail", caught.exception.message)
        self.assertEqual(len(fake.calls), 1)
        self.assertTrue(fake.closed)

    async def test_missing_model_is_reported_separately(self) -> None:
        fake = FakeClient([api_error(404)])
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch("app.modules.ai_demo.provider.genai.Client", return_value=fake),
        ):
            with self.assertRaises(ProviderError) as caught:
                await GeminiProvider().reply(**CALL)
        self.assertEqual(caught.exception.code, "AI_MODEL_UNAVAILABLE")

    async def test_tts_failure_keeps_the_text_answer(self) -> None:
        fake = FakeClient([text_response(), api_error(403)])
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch("app.modules.ai_demo.provider.genai.Client", return_value=fake),
        ):
            transcript, reply, audio = await GeminiProvider().reply(**CALL)
        self.assertEqual(transcript, CALL["text"])
        self.assertTrue(reply)
        self.assertIsNone(audio)

    async def test_invalid_model_output_is_rejected(self) -> None:
        fake = FakeClient([SimpleNamespace(parsed={"transcript": "Hi", "reply": ""})])
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}),
            patch("app.modules.ai_demo.provider.genai.Client", return_value=fake),
        ):
            with self.assertRaises(ProviderError) as caught:
                await GeminiProvider().reply(**CALL)
        self.assertEqual(caught.exception.code, "AI_BAD_RESPONSE")
