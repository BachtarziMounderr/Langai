"""Real PostgreSQL grading and isolation; AI calls use a deterministic double."""

import unittest

from httpx import Response
from sqlalchemy import select

from app.integrations.lesson_questions import GenerationError, get_question_generator
from app.modules.catalog.seed_demo import seed_demo_languages
from app.modules.identity.models import User
from app.modules.learning.practice_models import PracticeAttempt
from app.modules.learning.schemas import GeneratedQuiz, Question
from app.modules.tenancy.models import School, SchoolMembership
from tests.integration import test_routing_context as fixtures

PASSWORD = fixtures.PASSWORD

API = "/api/v1/student/learning"


class Generator:
    def __init__(self) -> None:
        self.calls = 0
        self.material = None

    async def generate(self, lesson: dict) -> GeneratedQuiz:
        self.calls += 1
        self.material = lesson
        return GeneratedQuiz(
            questions=[
                Question(
                    prompt=f"Yesterday I visited the city. Question {i}?",
                    options=["visited", "visit", "visiting"],
                    correct_index=0,
                    explanation="A completed past action uses the past form.",
                    category="grammar" if i % 2 else "conjugation",
                )
                for i in range(6)
            ]
        )


class LearningTests(unittest.TestCase):
    def setUp(self) -> None:
        fixtures.RoutingContextTests.setUp(self)
        seed_demo_languages(self.db)

    user = fixtures.RoutingContextTests.user
    school = fixtures.RoutingContextTests.school
    school_role = fixtures.RoutingContextTests.school_role

    def student(self) -> tuple[User, School, str]:
        user, school = self.user(), self.school()
        self.school_role(user, school, "STUDENT")
        context = f"school:{school.id}:STUDENT"
        login = self.client.post(
            "/api/v1/auth/login", json={"email": user.email, "password": PASSWORD}
        )
        self.headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        return user, school, context

    def practice(self, context: str, kind: str = "lesson") -> Response:
        return self.client.post(
            API + "/practice-sets",
            headers=self.headers,
            json={
                "context_id": context,
                "course_id": "past-experiences",
                "lesson_id": "past-simple",
                "kind": kind,
            },
        )

    def submit(self, context: str, practice_id: str, answers: list[int]) -> Response:
        return self.client.post(
            API + f"/practice-sets/{practice_id}/attempts",
            headers=self.headers,
            json={"context_id": context, "answers": answers},
        )

    def stats(self, context: str, language: str | None = None) -> Response:
        query = {"context_id": context}
        if language:
            query["language_code"] = language
        return self.client.get(API + "/statistics", headers=self.headers, params=query)

    def test_empty_is_unassessed_and_auth_required(self) -> None:
        _, _, context = self.student()
        data = self.stats(context).json()
        self.assertIsNone(data["percent"])
        self.assertEqual(data["attempts"], 0)
        self.assertTrue(all(s["percent"] is None for s in data["skills"]))
        self.assertFalse(data["teacher_grades_available"])
        self.assertEqual(
            self.client.get(API + "/statistics", params={"context_id": context}).status_code, 401
        )

    def test_server_grading_and_persistent_idempotence(self) -> None:
        _, _, context = self.student()
        response = self.practice(context)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertNotIn("correct_index", response.text)
        quiz = response.json()
        self.assertEqual(self.practice(context).json()["id"], quiz["id"])
        result = self.submit(context, quiz["id"], [1, 0]).json()
        self.assertEqual((result["score"], result["total"], result["percent"]), (1, 2, 50))
        duplicate = self.submit(context, quiz["id"], [1, 1]).json()
        self.assertEqual(duplicate, result)
        self.assertEqual(self.practice(context).json()["result"]["id"], result["id"])
        stats = self.stats(context).json()
        self.assertEqual((stats["correct"], stats["questions"], stats["attempts"]), (1, 2, 1))
        skills = {s["id"]: s for s in stats["skills"]}
        self.assertEqual(skills["conjugation"]["percent"], 50)
        self.assertIsNone(skills["oral"]["percent"])
        self.assertIsNone(skills["grammar"]["percent"])
        self.assertEqual(len(stats["trend"]), 1)
        self.assertEqual(self.stats(context, "de").json()["attempts"], 0)

    def test_other_user_and_other_school_cannot_submit(self) -> None:
        user, school, context = self.student()
        quiz = self.practice(context).json()
        other_school = self.school()
        self.school_role(user, other_school, "STUDENT")
        other_context = f"school:{other_school.id}:STUDENT"
        self.assertEqual(self.submit(other_context, quiz["id"], [1, 1]).status_code, 404)
        self.assertEqual(self.stats(other_context).json()["attempts"], 0)
        other = self.user()
        self.school_role(other, school, "STUDENT")
        login = self.client.post(
            "/api/v1/auth/login", json={"email": other.email, "password": PASSWORD}
        )
        self.headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        self.assertEqual(self.submit(context, quiz["id"], [1, 1]).status_code, 404)
        self.assertEqual(self.stats(context).json()["attempts"], 0)

    def test_inactive_membership_and_teacher_role_denied(self) -> None:
        user, school, context = self.student()
        quiz = self.practice(context).json()
        membership = self.db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id, SchoolMembership.school_id == school.id
            )
        )
        membership.status = "SUSPENDED"
        self.db.commit()
        self.assertEqual(self.submit(context, quiz["id"], [1, 1]).status_code, 403)
        self.assertEqual(self.stats(context).status_code, 403)
        teacher, school = self.user(), self.school()
        self.school_role(teacher, school, "TEACHER")
        login = self.client.post(
            "/api/v1/auth/login", json={"email": teacher.email, "password": PASSWORD}
        )
        self.headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        self.assertEqual(self.stats(f"school:{school.id}:STUDENT").status_code, 403)

    def test_invalid_answers_and_client_score_rejected(self) -> None:
        _, _, context = self.student()
        quiz = self.practice(context).json()
        for answers in ([1], [-1, 0], [3, 0]):
            self.assertEqual(self.submit(context, quiz["id"], answers).status_code, 422)
        self.assertEqual(
            self.client.post(
                API + f"/practice-sets/{quiz['id']}/attempts",
                headers=self.headers,
                json={"context_id": context, "answers": [0, 0], "score": 100},
            ).status_code,
            422,
        )
        self.assertEqual(self.stats(context).json()["attempts"], 0)

    def test_generation_uses_pdf_cached_and_graded_by_categories(self) -> None:
        _, _, context = self.student()
        generator = Generator()
        self.app.dependency_overrides[get_question_generator] = lambda: generator
        quiz = self.practice(context, "generated")
        self.assertEqual(quiz.status_code, 200)
        self.assertEqual(len(quiz.json()["questions"]), 6)
        self.assertGreater(len(generator.material["source_text"]), 7000)
        self.assertEqual(self.practice(context, "generated").status_code, 200)
        self.assertEqual(generator.calls, 1)
        self.submit(context, quiz.json()["id"], [0, 1, 0, 1, 0, 1])
        data = self.stats(context).json()
        self.assertEqual(data["percent"], 50)
        skills = {s["id"]: s for s in data["skills"]}
        self.assertEqual(skills["conjugation"]["percent"], 100)
        self.assertEqual(skills["grammar"]["percent"], 0)
        self.assertIsNone(skills["oral"]["percent"])

    def test_provider_failure_creates_no_false_result_and_limits_retry(self) -> None:
        user, _, context = self.student()

        class FailedGenerator:
            async def generate(self, _lesson: dict) -> GeneratedQuiz:
                raise GenerationError("Generation unavailable.")

        self.app.dependency_overrides[get_question_generator] = FailedGenerator
        self.assertEqual(self.practice(context, "generated").status_code, 503)
        self.assertEqual(self.practice(context, "generated").status_code, 429)
        self.assertEqual(self.stats(context).json()["attempts"], 0)
        self.assertEqual(self.practice(context).status_code, 200)
        self.assertEqual(
            self.db.scalar(select(PracticeAttempt.id).where(PracticeAttempt.user_id == user.id)),
            None,
        )

    def test_invalid_generated_shape_rejected(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            Question(
                prompt="Invalid question",
                options=["same", "same", "other"],
                correct_index=0,
                explanation="An explanation",
                category="grammar",
            )
        with self.assertRaises(ValidationError):
            Question(
                prompt="Invalid question",
                options=["one", "two", "three"],
                correct_index=3,
                explanation="An explanation",
                category="oral",
            )


if __name__ == "__main__":
    unittest.main()
