import { authClient } from "@/lib/auth/client";
import type { Attempt, Practice, Statistics } from "./types";

const base = "/api/v1/student/learning";
export const learningApi = {
  statistics(contextId: string, languageCode?: string): Promise<Statistics> {
    const query = new URLSearchParams({ context_id: contextId });
    if (languageCode) query.set("language_code", languageCode);
    return authClient.request(`${base}/statistics?${query}`);
  },
  practice(contextId: string, courseId: string, lessonId: string, kind: "lesson" | "generated"): Promise<Practice> {
    return authClient.request(`${base}/practice-sets`, { method: "POST", body: JSON.stringify({ context_id: contextId, course_id: courseId, lesson_id: lessonId, kind }) });
  },
  submit(contextId: string, practiceId: string, answers: number[]): Promise<Attempt> {
    return authClient.request(`${base}/practice-sets/${practiceId}/attempts`, { method: "POST", body: JSON.stringify({ context_id: contextId, answers }) });
  },
};
