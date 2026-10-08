import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { courses } from "@/features/student/demo-data";
import { StudentCourseList } from "@/features/student/components/StudentCourseList";
import { TeacherResources } from "@/features/student/components/TeacherResources";
import { VisualAsset } from "@/features/student/components/VisualAsset";

export default function LearnPage() {
  return <div className="student-academic-page pb-12">
    <header className="student-section-hero student-section-hero-academic"><div><span className="student-section-path">Academic Path</span><h1>Learn it, one clear step at a time.</h1><p>Short lessons, useful examples and material from your teacher, all in one place.</p><Link href={`/student/learn/${courses[0].id}/${courses[0].lessons[0].id}`} className="student-primary-button student-button-light">Continue a lesson <ArrowRight size={16} aria-hidden="true" /></Link></div><VisualAsset kind="academic" className="student-section-hero-art" /></header>
    <section className="student-section-block" aria-labelledby="academic-courses-title"><div className="student-section-title"><div><h2 id="academic-courses-title">Your courses</h2><p>Choose a course and build on what you already know.</p></div><span>{courses.length} courses in this demo</span></div><StudentCourseList /></section>
    <section className="student-teacher-feature" aria-labelledby="teacher-resources-title"><div className="student-teacher-feature-intro"><span className="student-resource-badge"><FileText size={21} aria-hidden="true" /></span><div><p className="student-foot-label">From your teacher</p><h2 id="teacher-resources-title">A resource for the lesson</h2><p>The Past Simple worksheet revisits A1 basics alongside your English B1 sample course.</p></div></div><TeacherResources courseId={courses[0].id} /></section>
  </div>;
}
