"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Clock3 } from "lucide-react";
import { courses, findLanguage } from "../demo-data";
import { useDemoProgress } from "./DemoProgress";
import { ProgressBar } from "./StudentPrimitives";
import { VisualAsset } from "./VisualAsset";

export function StudentCourseList() {
  const { getLanguageProgress } = useDemoProgress();
  return <div className="student-course-grid">{courses.map((course) => {
    const language = findLanguage(course.languageId);
    const progress = getLanguageProgress(course.languageId);
    return <article key={course.id} className="student-course-card">
      <VisualAsset kind="course" imageSrc={course.coverImageSrc} className="student-course-cover" />
      <div className="student-course-content"><div className="student-course-topline"><span className="student-level">{language?.name} · {language?.level}</span><span><Clock3 size={14} aria-hidden="true" /> {course.lessons.reduce((sum, lesson) => sum + lesson.duration, 0)} min</span></div><h3>{course.title}</h3><p>{course.subtitle}</p>
        <div className="student-course-progress"><div><span>Language journey · demo</span><strong>{progress.percent}%</strong></div><ProgressBar value={progress.percent} label={`${language?.name} illustrative progress`} /><small>{progress.completed} of {progress.total} lessons in the sample journey</small></div>
        <div className="student-course-next"><BookOpenText size={18} aria-hidden="true" /><div><span>Start with</span><strong>{course.lessons[0].title}</strong><small>{course.lessons.length} lessons available in this demo</small></div></div>
        <Link href={`/student/learn/${course.id}`} className="student-primary-button student-button-ink">Open course <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>;
  })}</div>;
}
