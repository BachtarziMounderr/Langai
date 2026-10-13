"""Structured-output provider contract without any network calls."""

import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.integrations.lesson_questions import GeminiQuestionGenerator, GenerationError
from app.modules.learning.catalog import LESSONS
from tests.unit import test_gemini_provider as fixtures


def valid_response() -> SimpleNamespace:
    return SimpleNamespace(
        text=json.dumps(
            {
                "questions": [
                    {
                        "prompt": f"Question {i}: Yesterday I ___ home.",
                        "options": ["went", "go", "going"],
                        "correct_index": 0,
                        "explanation": "Went is the past form of go.",
                        "category": "conjugation",
                    }
                    for i in range(6)
                ]
            }
        )
    )


class LessonGeneratorTests(unittest.IsolatedAsyncioTestCase):
    async def test_json_schema_and_only_lesson_material_are_sent(self) -> None:
        client = fixtures.FakeClient([valid_response()])
        lesson = {**LESSONS[0], "user_id": "private-identity", "student_answers": [1, 2]}
        with (
            patch.dict(
                os.environ,
                {"GEMINI_API_KEY": "unit-test-value", "GEMINI_EXERCISE_MODEL": "exercise-model"},
            ),
            patch("app.integrations.lesson_questions.genai.Client", return_value=client),
        ):
            result = await GeminiQuestionGenerator().generate(lesson)
        self.assertEqual(len(result.questions), 6)
        self.assertTrue(client.closed)
        call = client.calls[0]
        self.assertEqual(call["model"], "exercise-model")
        sent = json.loads(call["contents"])
        self.assertNotIn("user_id", sent)
        self.assertNotIn("student_answers", sent)
        self.assertEqual(sent["source_text"], lesson["source_text"])
        self.assertIsNotNone(call["config"].response_json_schema)
        self.assertIsNone(call["config"].response_schema)

    async def test_default_exercise_model_is_independent_of_conversation(self) -> None:
        client = fixtures.FakeClient([valid_response()])
        with (
            patch.dict(
                os.environ,
                {
                    "GEMINI_API_KEY": "unit-test-value",
                    "GEMINI_EXERCISE_MODEL": "",
                    "GEMINI_MODEL": "conversation-model",
                },
            ),
            patch("app.integrations.lesson_questions.genai.Client", return_value=client),
        ):
            await GeminiQuestionGenerator().generate(LESSONS[0])
        self.assertEqual(client.calls[0]["model"], "gemini-3.1-flash-lite")

    async def test_missing_key_does_not_call_provider(self) -> None:
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": ""}),
            patch("app.integrations.lesson_questions.genai.Client") as client,
        ):
            with self.assertRaises(GenerationError):
                await GeminiQuestionGenerator().generate(LESSONS[0])
            client.assert_not_called()

    async def test_invalid_payload_is_not_accepted(self) -> None:
        client = fixtures.FakeClient([SimpleNamespace(text='{"questions": []}')])
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "unit-test-value"}),
            patch("app.integrations.lesson_questions.genai.Client", return_value=client),
        ):
            with self.assertRaises(GenerationError):
                await GeminiQuestionGenerator().generate(LESSONS[0])

    async def test_upstream_error_detail_is_not_exposed(self) -> None:
        client = fixtures.FakeClient([fixtures.api_error(503)])
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "unit-test-value"}),
            patch("app.integrations.lesson_questions.genai.Client", return_value=client),
        ):
            with self.assertRaises(GenerationError) as caught:
                await GeminiQuestionGenerator().generate(LESSONS[0])
            self.assertNotIn("upstream detail", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
