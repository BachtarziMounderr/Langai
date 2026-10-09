import { studentClassName } from "@/features/student/components/student-class-name";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, ListChecks } from "lucide-react";
import { findCourse, findLanguage } from "@/features/student/demo-data";
import { TeacherResources } from "@/features/student/components/TeacherResources";
import { LearningPhoto } from "@/components/ui/LearningPhoto";
import { learningVisuals } from "@/config/learning-visuals";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = findCourse(courseId);
  if (!course) notFound();
  const language = findLanguage(course.languageId);

  return <div className={studentClassName("student-course-page mx-auto max-w-5xl pb-12")}>
    <Link href="/student/learn" className={studentClassName("student-text-link")}><ArrowLeft size={15} aria-hidden="true" /> All courses</Link>
    <header className={studentClassName("student-course-hero")}><div><span className={studentClassName("student-section-path")}>Academic Path · {language?.name} {language?.level}</span><h1>{course.title}</h1><p>{course.subtitle}</p><div className={studentClassName("student-course-hero-facts")}><span>{course.lessons.length} lessons in this demo</span><span><Clock3 size={15} aria-hidden="true" /> {course.lessons.reduce((sum, lesson) => sum + lesson.duration, 0)} min of content</span></div></div><LearningPhoto priority {...(learningVisuals.courses[course.id] ?? learningVisuals.lesson)} sizes="(max-width:600px) 100vw, 340px" src={learningVisuals.courses[course.id]?.src ?? course.coverImageSrc ?? learningVisuals.lesson.src} alt={learningVisuals.courses[course.id]?.alt || course.title} className={studentClassName("student-course-hero-art")} /></header>
    <div className={studentClassName("student-course-layout")}><section aria-labelledby="course-lessons-title"><div className={studentClassName("student-section-title")}><div><h2 id="course-lessons-title">Your lesson sequence</h2><p>Read, try an exercise, then bring the idea into conversation.</p></div></div><div className={studentClassName("student-lesson-sequence")}>{course.lessons.map((lesson, index) => <Link key={lesson.id} href={`/student/learn/${course.id}/${lesson.id}`} className={studentClassName("student-lesson-row")}><span className={studentClassName("student-lesson-number")}>{String(index + 1).padStart(2, "0")}</span><span className={studentClassName("min-w-0 flex-1")}><strong>{lesson.title}</strong><span>{lesson.objective}</span></span><span className={studentClassName("student-lesson-duration")}><Clock3 size={14} aria-hidden="true" /> {lesson.duration} min</span><ArrowRight size={18} aria-hidden="true" /></Link>)}</div></section><aside className={studentClassName("student-course-side")}><div className={studentClassName("student-course-activity")}><span className={studentClassName("student-resource-badge")}><ListChecks size={20} aria-hidden="true" /></span><h2>Try what you learned</h2><p>A short exercise gives immediate feedback in this demo.</p><Link href={`/student/learn/${course.id}/${course.lessons[0].id}/exercise`} className={studentClassName("student-primary-button student-button-ink")}>Open exercise <ArrowRight size={16} aria-hidden="true" /></Link></div><TeacherResources courseId={course.id} /></aside></div>
  </div>;
}
