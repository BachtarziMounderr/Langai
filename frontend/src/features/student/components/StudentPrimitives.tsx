import { studentClassName } from "@/features/student/components/student-class-name";
import type { ReactNode } from "react";

export function DemoLabel() {
  return <span className={studentClassName("inline-flex items-center rounded-full border border-[var(--student-border)] bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-[var(--student-muted)]")}>Student demo</span>;
}

export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className={studentClassName("mb-8 flex flex-wrap items-end justify-between gap-4")}>
    <div><div className={studentClassName("mb-3")}><DemoLabel /></div><h1 className={studentClassName("text-[clamp(1.9rem,3vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--student-ink)]")}>{title}</h1><p className={studentClassName("mt-2 max-w-2xl text-sm leading-6 text-[var(--student-muted)] sm:text-base")}>{description}</p></div>
    {children}
  </div>;
}

export function SectionHeading({ id, title, detail }: { id?: string; title: string; detail?: string }) {
  return <div className={studentClassName("mb-4 flex flex-wrap items-baseline justify-between gap-3")}><h2 id={id} className={studentClassName("text-xl font-semibold tracking-[-0.035em] text-[var(--student-ink)]")}>{title}</h2>{detail && <p className={studentClassName("text-xs text-[var(--student-muted)]")}>{detail}</p>}</div>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className={studentClassName("h-2 w-full overflow-hidden rounded-full bg-[var(--student-track)]")}><div key={value} className={studentClassName("student-progress-fill h-full rounded-full bg-[var(--student-accent)]")} style={{ width: `${value}%` }} /></div>;
}

export function PreviewAction({ children }: { children: ReactNode }) {
  return <div className={studentClassName("inline-flex cursor-not-allowed items-center rounded-lg border border-[var(--student-border)] bg-[var(--student-bg)] px-4 py-2.5 text-sm font-medium text-[var(--student-muted)]")} aria-disabled="true" title="Available when learning features are connected">{children}</div>;
}
