import { studentClassName } from "@/features/student/components/student-class-name";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download, FileText } from "lucide-react";
import { findLanguage, findTeacherResource } from "@/features/student/demo-data";

export default async function TeacherResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = findTeacherResource(id);
  if (!resource) notFound();
  const language = findLanguage(resource.languageId);

  return <div className={studentClassName("student-resource-page pb-12")}><Link href={`/student/learn/${resource.courseId}`} className={studentClassName("student-text-link")}><ArrowLeft size={16} aria-hidden="true" /> Back to course</Link>
    <header className={studentClassName("student-resource-hero")}><div className={studentClassName("student-resource-hero-copy")}><span className={studentClassName("student-section-path")}><FileText size={16} aria-hidden="true" /> Shared by your teacher</span><h1>{resource.title}</h1><p>A worksheet to revisit the foundations before you practise them in conversation.</p><div className={studentClassName("student-resource-facts")}><span>{resource.format}</span><span>{language?.name} · {resource.level}</span>{resource.pages && <span>{resource.pages} pages</span>}{resource.sizeLabel && <span>{resource.sizeLabel}</span>}</div><div className={studentClassName("student-resource-actions")}><a href={resource.href} target="_blank" rel="noopener noreferrer" className={studentClassName("student-primary-button student-button-ink")}>Open PDF <ArrowUpRight size={16} aria-hidden="true" /></a><a href={resource.href} download className={studentClassName("student-outline-button")}>Download <Download size={16} aria-hidden="true" /></a></div></div><div className={studentClassName("student-resource-cover")} aria-hidden="true"><span className={studentClassName("student-resource-cover-sheet")}><FileText size={36} /><strong>{resource.title}</strong><span>Student worksheet</span><small>PDF · {resource.pages ?? "—"} pages</small></span></div></header>
    <section className={studentClassName("student-resource-viewer")} aria-labelledby="resource-preview-title"><div className={studentClassName("student-resource-viewer-bar")}><div><h2 id="resource-preview-title">Read the worksheet</h2><p>Use the viewer below, or open the PDF in a new tab.</p></div><span>Teacher material · demo</span></div><div className={studentClassName("student-pdf-frame")}><iframe src={`${resource.href}#toolbar=1`} title={`${resource.title} PDF`} className={studentClassName("h-full w-full border-0")} loading="lazy" /><p className={studentClassName("sr-only")}>If the PDF preview is unavailable, use Open PDF or Download above.</p></div></section><p className={studentClassName("mt-4 text-xs text-[var(--student-muted)]")}>This public sample is for the demo. Future private school files will use authorised storage.</p>
  </div>;
}
