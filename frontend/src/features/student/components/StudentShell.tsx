import Link from "next/link";
import { ChevronDown, Globe2 } from "lucide-react";
import type { BrowserSession, WorkspaceContext } from "@/lib/auth/server";
import { languages } from "../demo-data";
import { StudentNavigation } from "./StudentNavigation";
import { StudentPageMotion } from "./StudentPageMotion";

export function StudentShell({ session, context, children }: { session: BrowserSession; context: WorkspaceContext; children: React.ReactNode }) {
  const name = session.user.first_name?.trim() || session.user.email.split("@")[0];
  const fullName = [session.user.first_name, session.user.last_name].filter(Boolean).join(" ") || name;
  const initials = fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const canSwitch = session.contexts.length > 1;

  return <div className="student-app min-h-screen lg:flex">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm">Skip to content</a>
    <StudentNavigation contextLabel={context.label} canSwitch={canSwitch} fullName={fullName} email={session.user.email} initials={initials} />
    <div className="min-w-0 flex-1">
      <header className="student-topbar"><div className="mx-auto flex h-[74px] max-w-[1392px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-12">
        <div className="student-topbar-context"><Globe2 size={18} aria-hidden="true" /><div className="min-w-0"><strong>Learning space</strong><span className="truncate">{context.type === "personal" ? "Personal learning" : context.label}</span></div></div>
        <div className="student-topbar-right"><div className="student-topbar-languages" aria-label="Demo languages">{languages.map((language) => <span key={language.id}>{language.id.toUpperCase()} <strong>{language.level}</strong></span>)}</div><span className="student-topbar-avatar" aria-label={fullName} title={fullName}>{initials}</span>{canSwitch && <Link href="/select-context" className="student-icon-button" aria-label="Switch context" title="Switch context"><ChevronDown size={17} aria-hidden="true" /></Link>}</div>
      </div></header>
      <main id="main-content" className="mx-auto max-w-[1392px] px-5 py-8 sm:px-8 sm:py-10 xl:px-12"><StudentPageMotion>{children}</StudentPageMotion></main>
    </div>
  </div>;
}
