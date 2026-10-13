export type Skill = { id: string; label: string; score: number; total: number; percent: number | null; teacher_percent: number | null };
export type Feedback = { question_id: string; category: string; selected_index: number; correct_index: number; correct: boolean; explanation: string };
export type Attempt = { id: string; course_id: string; lesson_id: string; language_code: string; title: string; kind: string; score: number; total: number; percent: number; completed_at: string; feedback: Feedback[] };
export type Practice = { id: string; course_id: string; lesson_id: string; kind: "lesson" | "generated"; source_label: string; questions: { id: string; prompt: string; options: string[]; category: string }[]; result: Attempt | null };
export type Statistics = {
  attempts: number; correct: number; questions: number; percent: number | null;
  skills: Skill[];
  languages: { id: string; name: string; completed: number; total: number; percent: number | null }[];
  history: Attempt[];
  trend: { completed_at: string; percent: number; title: string }[];
  teacher_grades_available: boolean;
};
