import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText, Clock3, Lightbulb, MessageCircleMore } from "lucide-react";
import { findCourse, findLanguage, findLesson, scenarios } from "@/features/student/demo-data";
import { TeacherResources } from "@/features/student/components/TeacherResources";

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const course = findCourse(courseId);
  const lesson = findLesson(courseId, lessonId);
  if (!course || !lesson) notFound();
  const language = findLanguage(course.languageId);
  const position = course.lessons.findIndex((item) => item.id === lesson.id);
  const nextLesson = course.lessons[position + 1];
  const scenario = scenarios.find((item) => item.languageId === course.languageId);

  return <div className="student-lesson-page mx-auto max-w-5xl pb-12">
    <nav aria-label="Breadcrumb" className="student-breadcrumb"><Link href="/student/learn">Learn</Link><span>/</span><Link href={`/student/learn/${course.id}`}>{course.title}</Link><span>/</span><strong>{lesson.title}</strong></nav>
    <header className="student-lesson-hero"><div className="student-lesson-hero-copy"><span className="student-section-path">Academic Path · {language?.name} {language?.level}</span><h1>{lesson.title}</h1><p>{lesson.objective}</p><div className="student-lesson-hero-meta"><span><BookOpenText size={16} aria-hidden="true" /> Lesson {position + 1} of {course.lessons.length}</span><span><Clock3 size={16} aria-hidden="true" /> About {lesson.duration} min</span></div></div><div className="student-lesson-hero-mark" aria-hidden="true"><span>{String(position + 1).padStart(2, "0")}</span><small>/{String(course.lessons.length).padStart(2, "0")}</small></div></header>
    <div className="student-lesson-layout"><article className="student-lesson-reading"><section aria-labelledby="lesson-idea-title"><div className="student-reading-heading"><span className="student-resource-badge"><Lightbulb size={20} aria-hidden="true" /></span><div><p>Start with the idea</p><h2 id="lesson-idea-title">What to remember</h2></div></div><ul className="student-lesson-notes">{lesson.notes.map((note) => <li key={note}>{note}</li>)}</ul></section><section aria-labelledby="lesson-examples-title" className="student-lesson-examples"><p>See it in a sentence</p><h2 id="lesson-examples-title">In context</h2><div>{lesson.examples.map((example, index) => <blockquote key={example}><span>{String(index + 1).padStart(2, "0")}</span>{example}</blockquote>)}</div></section><section className="student-lesson-next-action"><div><p>Now try it yourself</p><h2>Check your understanding</h2><span>{lesson.exercises.length} short questions with immediate feedback</span></div><Link href={`/student/learn/${course.id}/${lesson.id}/exercise`} className="student-primary-button student-button-ink">Start exercise <ArrowRight size={16} aria-hidden="true" /></Link></section><TeacherResources courseId={course.id} /></article>
      <aside className="student-lesson-aside"><div className="student-lesson-outline"><p>In this lesson</p><span className="current">01 · The idea</span><span>02 · Examples</span><span>03 · Exercise</span></div>{scenario && <div className="student-lesson-transfer"><MessageCircleMore size={23} aria-hidden="true" /><p>Take it into conversation</p><h2>{scenario.title}</h2><span>{scenario.bridge}</span><Link href={`/student/practice/${scenario.id}`} className="student-text-link">Practice with AI <ArrowRight size={15} aria-hidden="true" /></Link></div>}{nextLesson && <Link href={`/student/learn/${course.id}/${nextLesson.id}`} className="student-next-lesson-link"><span>Next in this course</span><strong>{nextLesson.title}</strong><ArrowRight size={17} aria-hidden="true" /></Link>}</aside>
    </div><Link href={`/student/learn/${course.id}`} className="student-text-link mt-8"><ArrowLeft size={15} aria-hidden="true" /> Back to course</Link>
  </div>;
}
