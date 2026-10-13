"""Published V2 demo lessons; replace with authorized CMS versions later."""

import hashlib
import json
from pathlib import Path

LESSONS = json.loads(Path(__file__).with_name("lesson_catalog.json").read_text(encoding="utf-8"))


def find_lesson(course_id: str, lesson_id: str) -> dict | None:
    return next(
        (x for x in LESSONS if x["course_id"] == course_id and x["lesson_id"] == lesson_id), None
    )


def content_revision(lesson: dict) -> str:
    return hashlib.sha256(
        json.dumps(lesson, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
