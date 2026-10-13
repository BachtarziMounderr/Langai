"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import type { Course, Lesson } from "../demo-data";
import { learningApi } from "../learning/api";
import type { Practice } from "../learning/types";
import { useDemoProgress } from "./DemoProgress";
import { studentClassName } from "./student-class-name";

const skillLabels: Record<string, string> = { grammar: "Grammar", conjugation: "Conjugation", vocabulary: "Vocabulary", comprehension: "Reading comprehension" };

export function StudentExercise({ course, lesson }: { course: Course; lesson: Lesson }) {
  const { contextId, refresh } = useDemoProgress();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"lesson" | "generated">("lesson");
  const [requestedKind, setRequestedKind] = useState<"lesson" | "generated">("lesson");
  useEffect(() => {
    let active = true;
    learningApi.practice(contextId, course.id, lesson.id, "lesson").then(data => { if (active) { setPractice(data); setAnswers(Object.fromEntries(data.result?.feedback.map(f => [f.question_id, f.selected_index]) ?? [])); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Practice could not be loaded."); });
    return () => { active = false; };
  }, [contextId, course.id, lesson.id]);
  const complete = practice?.questions.every(q => answers[q.id] !== undefined);

  async function load(nextKind: "lesson" | "generated") {
    setBusy(true); setError(null); setRequestedKind(nextKind);
    try {
      const data = await learningApi.practice(contextId, course.id, lesson.id, nextKind);
      setPractice(data); setKind(nextKind);
      setAnswers(Object.fromEntries(data.result?.feedback.map(f => [f.question_id, f.selected_index]) ?? []));
    } catch (e) { setError(e instanceof Error ? e.message : "Practice could not be loaded."); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!practice || !complete || practice.result || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await learningApi.submit(contextId, practice.id, practice.questions.map(q => answers[q.id]));
      setPractice({ ...practice, result }); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Your result was not saved. Retry."); }
    finally { setBusy(false); }
  }
  return <div className={studentClassName("student-exercise-page mx-auto max-w-3xl pb-12")}>
    <Link href={`/student/learn/${course.id}/${lesson.id}`} className={studentClassName("student-text-link")}><ArrowLeft size={15} aria-hidden="true" /> Back to lesson</Link>
    <header className={studentClassName("mt-7")}><span className={studentClassName("student-section-path")}>{course.title}</span><h1>{lesson.title}</h1><p className={studentClassName("mt-3 text-sm text-[var(--student-muted)]")}>Practise this lesson, then see your results by skill. Your first submission for each practice set is saved.</p></header>
    <div className={studentClassName("mt-6 flex flex-wrap gap-3")} aria-label="Practice sets">
      <button className={studentClassName("student-secondary-button")} type="button" aria-pressed={kind === "lesson"} disabled={busy} onClick={() => load("lesson")}>Lesson practice</button>
      <button className={studentClassName("student-primary-button")} type="button" aria-pressed={kind === "generated"} disabled={busy} onClick={() => load("generated")}><Sparkles size={16} aria-hidden="true" />{busy ? "Preparing…" : "Generate from this lesson"}</button>
    </div>
    <p className={studentClassName("mt-3 text-xs text-[var(--student-muted)]")}>{practice?.source_label ?? "Loading lesson practice…"}. Generated questions are AI practice, rather than a teacher-issued grade.</p>
    {error && <div role="alert" className={studentClassName("student-panel mt-5 p-5")}><p>{error}</p><button type="button" disabled={busy} onClick={() => load(requestedKind)} className={studentClassName("student-text-link")}>Retry {requestedKind === "generated" ? "generation" : "loading practice"}</button></div>}
    {!practice && !error && <p role="status" className={studentClassName("mt-6")}>Loading your practice…</p>}
    {practice && <>
      <div className={studentClassName("mt-7 space-y-5")}>{practice.questions.map((q, index) => {
        const feedback = practice.result?.feedback.find(f => f.question_id === q.id);
        return <fieldset key={`${practice.id}:${q.id}`} className={studentClassName("student-panel p-6 sm:p-8")} disabled={busy || Boolean(practice.result)}>
          <legend className={studentClassName("sr-only")}>Question {index + 1}: {q.prompt}</legend>
          <span className={studentClassName("text-xs font-semibold text-[var(--student-accent)]")}>Question {index + 1} · {skillLabels[q.category]}</span><p className={studentClassName("mt-3 text-lg font-semibold")}>{q.prompt}</p>
          <div className={studentClassName("mt-5 grid gap-2")}>{q.options.map((option, i) => <label key={i} className={studentClassName(`student-answer ${answers[q.id] === i ? "student-answer-selected" : ""} ${feedback?.correct_index === i ? "student-answer-correct" : ""}`)}><input type="radio" name={`${practice.id}:${q.id}`} value={i} checked={answers[q.id] === i} onChange={() => setAnswers(previous => ({ ...previous, [q.id]: i }))} /><span>{option}</span></label>)}</div>
          {feedback && <p className={studentClassName(`mt-4 flex items-start gap-2 text-sm ${feedback.correct ? "text-[#206c5a]" : "text-[#a04f40]"}`)}>{feedback.correct ? <Check size={17} aria-hidden="true" /> : <X size={17} aria-hidden="true" />}{feedback.correct ? "Correct. " : "Review this answer. "}{feedback.explanation}</p>}
        </fieldset>;
      })}</div>
      <div role="status" className={studentClassName("student-panel mt-6 flex flex-wrap items-center justify-between gap-4 p-6")}>
        {practice.result ? <><div><strong className={studentClassName("text-lg")}>{practice.result.score} / {practice.result.total} correct · {practice.result.percent}%</strong><p className={studentClassName("mt-1 text-sm text-[var(--student-muted)]")}>Saved to your learning record.</p></div><Link href="/student/progress" className={studentClassName("student-primary-button")}>See my statistics <ArrowRight size={16} aria-hidden="true" /></Link></> : <><p>{Object.keys(answers).length} of {practice.questions.length} answered</p><button type="button" disabled={!complete || busy} onClick={submit} className={studentClassName("student-primary-button")}>{busy ? "Saving…" : "Check answers"}<ArrowRight size={16} aria-hidden="true" /></button></>}
      </div>
    </>}
  </div>;
}
