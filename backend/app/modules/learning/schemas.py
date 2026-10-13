"""Validated lesson practice and evidence-based progress contracts."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal["grammar", "conjugation", "vocabulary", "comprehension"]


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=5, max_length=500)
    options: list[str] = Field(min_length=3, max_length=4)
    correct_index: int = Field(ge=0, le=3, strict=True)
    explanation: str = Field(min_length=5, max_length=600)
    category: Category

    @model_validator(mode="after")
    def check_options(self) -> "Question":
        if self.correct_index >= len(self.options):
            raise ValueError("Answer must reference an option")
        if any(not x.strip() or len(x) > 300 for x in self.options):
            raise ValueError("Options must be nonempty and bounded")
        if len(set(x.strip().casefold() for x in self.options)) != len(self.options):
            raise ValueError("Options must be distinct")
        return self


class GeneratedQuiz(BaseModel):
    model_config = ConfigDict(extra="forbid")
    questions: list[Question] = Field(min_length=6, max_length=6)

    @model_validator(mode="after")
    def distinct_questions(self) -> "GeneratedQuiz":
        if len({q.prompt.strip().casefold() for q in self.questions}) != 6:
            raise ValueError("Questions must be distinct")
        return self


class PracticeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    context_id: str = Field(min_length=1, max_length=150)
    course_id: str = Field(min_length=1, max_length=80)
    lesson_id: str = Field(min_length=1, max_length=80)
    kind: Literal["lesson", "generated"] = "lesson"


class AttemptCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    context_id: str = Field(min_length=1, max_length=150)
    answers: list[Annotated[int, Field(strict=True)]] = Field(min_length=1, max_length=6)


class QuestionRead(BaseModel):
    id: str
    prompt: str
    options: list[str]
    category: Category


class AnswerFeedback(BaseModel):
    question_id: str
    category: Category
    selected_index: int
    correct_index: int
    correct: bool
    explanation: str


class AttemptRead(BaseModel):
    id: UUID
    course_id: str
    lesson_id: str
    language_code: str
    title: str
    kind: str
    score: int
    total: int
    percent: float
    completed_at: datetime
    feedback: list[AnswerFeedback]


class PracticeRead(BaseModel):
    id: UUID
    course_id: str
    lesson_id: str
    kind: str
    source_label: str
    questions: list[QuestionRead]
    result: AttemptRead | None = None


class SkillRead(BaseModel):
    id: str
    label: str
    score: int
    total: int
    percent: float | None
    teacher_percent: float | None = None


class LanguageRead(BaseModel):
    id: str
    name: str
    completed: int
    total: int
    percent: float | None


class TrendRead(BaseModel):
    completed_at: datetime
    percent: float
    title: str


class StatisticsRead(BaseModel):
    attempts: int
    correct: int
    questions: int
    percent: float | None
    skills: list[SkillRead]
    languages: list[LanguageRead]
    history: list[AttemptRead]
    trend: list[TrendRead]
    teacher_grades_available: bool = False
