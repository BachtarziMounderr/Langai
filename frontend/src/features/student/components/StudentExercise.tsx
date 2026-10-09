"use client";

import { studentClassName } from "@/features/student/components/student-class-name";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, X } from "lucide-react";
import type { Course, Lesson } from "../demo-data";
import { useDemoProgress } from "./DemoProgress";

export function StudentExercise({ course, lesson }: { course: Course; lesson: Lesson }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const { saveResult } = useDemoProgress();
  const score = lesson.exercises.filter((exercise) => answers[exercise.id] === exercise.answer).length;
  const complete = lesson.exercises.every((exercise) => Boolean(answers[exercise.id]));

  function submit() {
    if (!complete || submitted) return;
    saveResult({ courseId: course.id, lessonId: lesson.id, score, total: lesson.exercises.length });
    setSubmitted(true);
  }

  return <div className={studentClassName("student-exercise-page mx-auto max-w-3xl pb-12")}>
    <Link href={`/student/learn/${course.id}/${lesson.id}`} className={studentClassName("student-text-link")}><ArrowLeft size={15} aria-hidden="true" /> Back to lesson</Link>
    <header className={studentClassName("mt-7")}><span className={studentClassName("text-sm font-medium text-[var(--student-accent)]")}>Quick practice · {course.title}</span><h1 className={studentClassName("mt-3 text-[clamp(2rem,3.6vw,3rem)] font-semibold tracking-[-0.05em]")}>{lesson.title}</h1><p className={studentClassName("mt-2 text-sm text-[var(--student-muted)]")}>Choose one answer for each question. You’ll see why it works after submitting.</p></header>
    <div className={studentClassName("mt-7 space-y-5")}>{lesson.exercises.map((exercise, index) => { const correct = answers[exercise.id] === exercise.answer; return <fieldset key={exercise.id} className={studentClassName("student-panel p-6 sm:p-8")}><legend className={studentClassName("sr-only")}>Question {index + 1}: {exercise.prompt}</legend><span className={studentClassName("text-xs font-semibold text-[var(--student-accent)]")}>Question {index + 1}</span><p className={studentClassName("mt-3 text-lg font-semibold")}>{exercise.prompt}</p><div className={studentClassName("mt-5 grid gap-2")}>{exercise.options.map((option) => { const selected = answers[exercise.id] === option; return <label key={option} className={studentClassName(`student-answer ${selected ? "student-answer-selected" : ""} ${submitted && option === exercise.answer ? "student-answer-correct" : ""}`)}><input type="radio" name={exercise.id} value={option} checked={selected} disabled={submitted} onChange={() => setAnswers((previous) => ({ ...previous, [exercise.id]: option }))} /><span>{option}</span></label>; })}</div>{submitted && <p className={studentClassName(`mt-4 flex items-start gap-2 text-sm ${correct ? "text-[#206c5a]" : "text-[#a04f40]"}`)}>{correct ? <Check size={17} aria-hidden="true" /> : <X size={17} aria-hidden="true" />}{exercise.explanation}</p>}</fieldset>; })}</div>
    <div role={submitted ? "status" : undefined} className={studentClassName(`student-panel mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between ${submitted ? "student-exercise-result" : ""}`)}><div>{submitted ? <div className={studentClassName("flex items-start gap-3")}><span className={studentClassName("student-exercise-check")}><CheckCircle2 size={22} aria-hidden="true" /></span><div><strong className={studentClassName("text-lg")}>{score} / {lesson.exercises.length} correct · {Math.round(score / lesson.exercises.length * 100)}%</strong><p className={studentClassName("mt-1 text-sm text-[var(--student-muted)]")}>Your demo progress has been updated for this session.</p></div></div> : <p className={studentClassName("text-sm text-[var(--student-muted)]")}>{Object.keys(answers).length} of {lesson.exercises.length} answered</p>}</div>{submitted ? <Link href="/student" className={studentClassName("student-primary-button")}>Continue to dashboard <ArrowRight size={16} aria-hidden="true" /></Link> : <button type="button" disabled={!complete} onClick={submit} className={studentClassName("student-primary-button disabled:cursor-not-allowed disabled:opacity-40")}>Check answers <ArrowRight size={16} aria-hidden="true" /></button>}</div>
  </div>;
}
