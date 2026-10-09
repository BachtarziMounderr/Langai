"use client";

import { studentClassName } from "@/features/student/components/student-class-name";

import Link from "next/link";
import { ArrowRight, BookOpenText, Clock3 } from "lucide-react";
import { courses, findLanguage } from "../demo-data";
import { useDemoProgress } from "./DemoProgress";
import { ProgressBar } from "./StudentPrimitives";
import { LearningPhoto } from "@/components/ui/LearningPhoto";
import { learningVisuals } from "@/config/learning-visuals";

export function StudentCourseList() {
  const { getLanguageProgress } = useDemoProgress();
  return <div className={studentClassName("student-course-grid")}>{courses.map((course) => {
    const language = findLanguage(course.languageId);
    const progress = getLanguageProgress(course.languageId);
    return <article key={course.id} className={studentClassName("student-course-card")}>
      <LearningPhoto {...learningVisuals.courses[course.id]} sizes="(max-width:600px) 100vw, (max-width:1200px) 50vw, 550px" src={learningVisuals.courses[course.id]?.src ?? course.coverImageSrc} alt={learningVisuals.courses[course.id]?.alt || course.title} className={studentClassName("student-course-cover")} />
      <div className={studentClassName("student-course-content")}><div className={studentClassName("student-course-topline")}><span className={studentClassName("student-level")}>{language?.name} · {language?.level}</span><span><Clock3 size={14} aria-hidden="true" /> {course.lessons.reduce((sum, lesson) => sum + lesson.duration, 0)} min</span></div><h3>{course.title}</h3><p>{course.subtitle}</p>
        <div className={studentClassName("student-course-progress")}><div><span>Language journey · demo</span><strong>{progress.percent}%</strong></div><ProgressBar value={progress.percent} label={`${language?.name} illustrative progress`} /><small>{progress.completed} of {progress.total} lessons in the sample journey</small></div>
        <div className={studentClassName("student-course-next")}><BookOpenText size={18} aria-hidden="true" /><div><span>Start with</span><strong>{course.lessons[0].title}</strong><small>{course.lessons.length} lessons available in this demo</small></div></div>
        <Link href={`/student/learn/${course.id}`} className={studentClassName("student-primary-button student-button-ink")}>Open course <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>;
  })}</div>;
}
