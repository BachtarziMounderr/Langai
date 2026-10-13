"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { courses } from "../demo-data";
import { learningApi } from "../learning/api";
import type { Statistics } from "../learning/types";

type ProgressContext = {
  contextId: string; statistics: Statistics | null; error: string | null; refresh: () => Promise<void>;
  getLanguageProgress: (id: string) => { percent: number; completed: number; total: number; average: number | null };
  recentResult?: { score: number; total: number };
};
const Context = createContext<ProgressContext | null>(null);

// The original component name is retained for existing layouts. Results now
// come from FastAPI; browser-session fixtures are never imported as evidence.
export function DemoProgressProvider({ contextId, children }: { userId: string; contextId: string; children: React.ReactNode }) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setStatistics(await learningApi.statistics(contextId)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Progress could not be loaded."); }
  }, [contextId]);
  useEffect(() => {
    let active = true;
    learningApi.statistics(contextId).then(data => { if (active) { setStatistics(data); setError(null); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Progress could not be loaded."); });
    return () => { active = false; };
  }, [contextId]);
  const getLanguageProgress = useCallback((id: string) => {
    const language = statistics?.languages.find(item => item.id === id);
    const completed = language?.completed ?? 0;
    const total = language?.total ?? courses.filter(course => course.languageId === id).reduce((sum, course) => sum + course.lessons.length, 0);
    return { completed, total, percent: total ? Math.round(completed / total * 100) : 0, average: language?.percent ?? null };
  }, [statistics]);
  const value = useMemo(() => ({ contextId, statistics, error, refresh, getLanguageProgress, recentResult: statistics?.history[0] }), [contextId, statistics, error, refresh, getLanguageProgress]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("Student progress provider is required");
  return context;
}
