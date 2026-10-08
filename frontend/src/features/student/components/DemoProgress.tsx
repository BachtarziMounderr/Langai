"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { courses, languages } from "../demo-data";

type Result = { lessonId: string; courseId: string; score: number; total: number; completedAt: string };
type ProgressContext = { results: Result[]; saveResult: (result: Omit<Result, "completedAt">) => void; getLanguageProgress: (languageId: string) => { percent: number; completed: number; total: number; average: number }; recentResult?: Result };
const Context = createContext<ProgressContext | null>(null);

function isResult(value: unknown): value is Result {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Result>;
  return typeof item.lessonId === "string" && typeof item.courseId === "string" && typeof item.score === "number" && typeof item.total === "number" && typeof item.completedAt === "string";
}

export function DemoProgressProvider({ userId, contextId, children }: { userId: string; contextId: string; children: React.ReactNode }) {
  const key = `lingua-demo-progress:${userId}:${contextId}`;
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try { const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]"); if (Array.isArray(stored)) setResults(stored.filter(isResult)); } catch { /* A corrupt demo record starts fresh. */ }
    });
    return () => { cancelled = true; };
  }, [key]);

  const saveResult = useCallback((result: Omit<Result, "completedAt">) => {
    setResults((previous) => {
      const next = [...previous.filter((item) => item.lessonId !== result.lessonId), { ...result, completedAt: new Date().toISOString() }];
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Progress remains visible for this tab. */ }
      return next;
    });
  }, [key]);

  const getLanguageProgress = useCallback((languageId: string) => {
    const language = languages.find((item) => item.id === languageId);
    const relevantCourses = courses.filter((course) => course.languageId === languageId);
    const relevantIds = new Set(relevantCourses.flatMap((course) => course.lessons.map((lesson) => lesson.id)));
    const relevant = results.filter((item) => relevantIds.has(item.lessonId));
    const baseLessons = language?.baseLessons ?? 0;
    const total = language?.totalLessons ?? relevantIds.size;
    const completed = Math.min(total, baseLessons + relevant.length);
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const average = relevant.length ? Math.round(relevant.reduce((sum, item) => sum + item.score / item.total * 100, 0) / relevant.length) : language?.averageScore ?? 0;
    return { percent, completed, total, average };
  }, [results]);

  const value = useMemo(() => ({ results, saveResult, getLanguageProgress, recentResult: [...results].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] }), [results, saveResult, getLanguageProgress]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProgressProvider is required");
  return context;
}
