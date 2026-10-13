"""Authorize SELF access, grade on the server and aggregate actual evidence."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.integrations.lesson_questions import GenerationError, QuestionGenerator
from app.modules.learning import repository
from app.modules.learning.catalog import LESSONS, content_revision, find_lesson
from app.modules.learning.practice_models import PracticeAttempt, PracticeSet
from app.modules.learning.schemas import (
    AnswerFeedback,
    AttemptRead,
    LanguageRead,
    PracticeCreate,
    PracticeRead,
    Question,
    QuestionRead,
    SkillRead,
    StatisticsRead,
    TrendRead,
)
from app.modules.tenancy.public import resolve_routing_contexts

SKILLS = {
    "grammar": "Grammar",
    "conjugation": "Conjugation",
    "vocabulary": "Vocabulary",
    "comprehension": "Reading comprehension",
    "oral": "Speaking",
}


class LearningFailure(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        self.status, self.code, self.message = status, code, message


def student_tenant(db: Session, user_id: UUID, context_id: str) -> UUID:
    """SELF policy: active student membership or owned personal workspace only."""
    _, contexts = resolve_routing_contexts(db, user_id)
    for context in contexts:
        if (
            context.role == "STUDENT"
            and context.tenant_id
            and context_id == f"{context.type}:{context.tenant_id}:{context.role}"
        ):
            return context.tenant_id
    raise LearningFailure(403, "CONTEXT_UNAVAILABLE", "Student workspace unavailable")


def attempt_read(attempt: PracticeAttempt, practice: PracticeSet) -> AttemptRead:
    feedback = [
        AnswerFeedback(
            question_id=str(i),
            category=q["category"],
            selected_index=attempt.answers[i],
            correct_index=q["correct_index"],
            correct=attempt.answers[i] == q["correct_index"],
            explanation=q["explanation"],
        )
        for i, q in enumerate(practice.questions)
    ]
    return AttemptRead(
        id=attempt.id,
        course_id=practice.course_id,
        lesson_id=practice.lesson_id,
        language_code=practice.language_code,
        title=practice.title,
        kind=practice.kind,
        score=attempt.score,
        total=attempt.total,
        percent=round(attempt.score / attempt.total * 100, 1),
        completed_at=attempt.created_at,
        feedback=feedback,
    )


def practice_read(
    db: Session, tenant_id: UUID, user_id: UUID, practice: PracticeSet
) -> PracticeRead:
    attempt = repository.saved_attempt(db, tenant_id, user_id, practice.id)
    return PracticeRead(
        id=practice.id,
        course_id=practice.course_id,
        lesson_id=practice.lesson_id,
        kind=practice.kind,
        source_label=practice.source_label,
        questions=[
            QuestionRead(
                id=str(i), prompt=q["prompt"], options=q["options"], category=q["category"]
            )
            for i, q in enumerate(practice.questions)
        ],
        result=attempt_read(attempt, practice) if attempt else None,
    )


async def create_practice(
    db: Session, user_id: UUID, payload: PracticeCreate, generator: QuestionGenerator
) -> PracticeRead:
    tenant_id = student_tenant(db, user_id, payload.context_id)
    lesson = find_lesson(payload.course_id, payload.lesson_id)
    if not lesson:
        raise LearningFailure(404, "LESSON_UNAVAILABLE", "Lesson unavailable")
    practice = repository.cached_practice(
        db,
        tenant_id,
        user_id,
        payload.course_id,
        payload.lesson_id,
        content_revision(lesson),
        payload.kind,
    )
    now = datetime.now(UTC)
    if practice and practice.status == "READY":
        return practice_read(db, tenant_id, user_id, practice)
    if practice and practice.generation_started_at:
        elapsed = now - practice.generation_started_at
        if elapsed < timedelta(seconds=60):
            raise LearningFailure(
                429, "GENERATION_PENDING", "Please wait a minute before retrying generation."
            )
        if elapsed > timedelta(days=1):
            practice.generation_count = 0
        if practice.generation_count >= 5:
            raise LearningFailure(
                429,
                "GENERATION_LIMIT",
                "Generation limit reached. Retry tomorrow or use lesson practice.",
            )
    if not practice:
        practice = PracticeSet(
            tenant_id=tenant_id,
            user_id=user_id,
            course_id=payload.course_id,
            lesson_id=payload.lesson_id,
            language_code=lesson["language_code"],
            title=lesson["title"],
            revision=content_revision(lesson),
            kind=payload.kind,
            source_label=lesson["source_label"],
            status="GENERATING",
            questions=[],
            generation_count=0,
        )
        db.add(practice)
    if payload.kind == "lesson":
        practice.questions = [Question.model_validate(q).model_dump() for q in lesson["questions"]]
        practice.status = "READY"
    else:
        practice.status = "GENERATING"
        practice.generation_count += 1
        practice.generation_started_at = now
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(exc.orig, "sqlstate", None) != "23505":
            raise
        raise LearningFailure(
            409, "GENERATION_CONFLICT", "This practice is already being prepared. Retry shortly."
        ) from exc
    if payload.kind == "generated":
        # Durable reservation is committed before the network call. No DB lock is
        # held while Gemini responds. Concurrent requests reuse or wait for it.
        try:
            generated = await generator.generate(lesson)
        except GenerationError as exc:
            practice.status = "FAILED"
            db.commit()
            raise LearningFailure(503, "GENERATION_UNAVAILABLE", str(exc)) from exc
        # Membership may have changed while the provider was running.
        student_tenant(db, user_id, payload.context_id)
        practice.questions = [q.model_dump() for q in generated.questions]
        practice.status = "READY"
        db.commit()
    return practice_read(db, tenant_id, user_id, practice)


def submit_attempt(
    db: Session, user_id: UUID, context_id: str, practice_id: UUID, answers: list[int]
) -> AttemptRead:
    tenant_id = student_tenant(db, user_id, context_id)
    practice = repository.owned_practice(db, tenant_id, user_id, practice_id)
    if not practice or practice.status != "READY":
        raise LearningFailure(404, "PRACTICE_UNAVAILABLE", "Practice unavailable")
    existing = repository.saved_attempt(db, tenant_id, user_id, practice_id)
    if existing:
        return attempt_read(existing, practice)
    if len(answers) != len(practice.questions) or any(
        type(a) is not int or a < 0 or a >= len(q["options"])
        for a, q in zip(answers, practice.questions, strict=False)
    ):
        raise LearningFailure(422, "INVALID_ANSWERS", "Answer every question with a valid option.")
    score = sum(a == q["correct_index"] for a, q in zip(answers, practice.questions, strict=True))
    attempt = PracticeAttempt(
        tenant_id=tenant_id,
        user_id=user_id,
        practice_id=practice_id,
        answers=answers,
        score=score,
        total=len(answers),
    )
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = repository.saved_attempt(db, tenant_id, user_id, practice_id)
        if existing:
            return attempt_read(existing, practice)
        raise
    return attempt_read(attempt, practice)


def statistics(
    db: Session, user_id: UUID, context_id: str, language_code: str | None
) -> StatisticsRead:
    tenant_id = student_tenant(db, user_id, context_id)
    rows = repository.student_attempts(db, tenant_id, user_id, language_code)
    counts = {key: [0, 0] for key in SKILLS}
    for attempt, practice in rows:
        for i, question in enumerate(practice.questions):
            counts[question["category"]][0] += int(attempt.answers[i] == question["correct_index"])
            counts[question["category"]][1] += 1
    skills = [
        SkillRead(
            id=key,
            label=label,
            score=counts[key][0],
            total=counts[key][1],
            percent=round(counts[key][0] / counts[key][1] * 100, 1) if counts[key][1] else None,
        )
        for key, label in SKILLS.items()
    ]
    language_names = {x["language_code"]: x["language"] for x in LESSONS}
    languages = []
    for code, name in language_names.items():
        own = [(a, p) for a, p in rows if p.language_code == code]
        total = sum(a.total for a, _ in own)
        languages.append(
            LanguageRead(
                id=code,
                name=name,
                completed=len({p.lesson_id for _, p in own}),
                total=sum(x["language_code"] == code for x in LESSONS),
                percent=round(sum(a.score for a, _ in own) / total * 100, 1) if total else None,
            )
        )
    total = sum(a.total for a, _ in rows)
    score = sum(a.score for a, _ in rows)
    return StatisticsRead(
        attempts=len(rows),
        correct=score,
        questions=total,
        percent=round(score / total * 100, 1) if total else None,
        skills=skills,
        languages=languages,
        history=[attempt_read(a, p) for a, p in reversed(rows[-20:])],
        trend=[
            TrendRead(
                completed_at=a.created_at, percent=round(a.score / a.total * 100, 1), title=p.title
            )
            for a, p in rows[-20:]
        ],
    )
