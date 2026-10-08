import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { findLanguage, teacherResources } from "../demo-data";

export function TeacherResources({ courseId, compact = false }: { courseId: string; compact?: boolean }) {
  const resources = teacherResources.filter((resource) => resource.courseId === courseId);
  if (!resources.length) return null;

  return <section className={compact ? "student-resource-compact" : "student-resource-section"} aria-label={compact ? "Teacher resources" : undefined} aria-labelledby={compact ? undefined : `teacher-resources-${courseId}`}>
    {!compact && <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h3 id={`teacher-resources-${courseId}`} className="text-base font-semibold">Resources from your teacher</h3><p className="mt-1 text-xs opacity-70">Shared by your teacher · demo material</p></div>
      <span className="student-resource-count">{resources.length} PDF</span>
    </div>}
    <div className="mt-4 space-y-2">
      {resources.map((resource) => <Link key={resource.id} href={`/student/learn/resources/${resource.id}`} className="student-resource-link">
        <span className="student-resource-icon"><FileText size={19} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{resource.title}</strong><span className="mt-0.5 block text-xs opacity-70">{resource.format} · {findLanguage(resource.languageId)?.name} {resource.level}{resource.pages ? ` · ${resource.pages} pages` : ""}</span></span>
        <ArrowUpRight size={17} className="shrink-0" aria-hidden="true" />
      </Link>)}
    </div>
  </section>;
}
