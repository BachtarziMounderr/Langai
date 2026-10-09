import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { BrowserSession, WorkspaceContext } from "@/lib/auth/server";
import { StudentNavigation } from "./StudentNavigation";
import { StudentPageMotion } from "./StudentPageMotion";
import styles from "./StudentShell.module.css";

export function StudentShell({ session, context, children }: { session: BrowserSession; context: WorkspaceContext; children: React.ReactNode }) {
  const name = session.user.first_name?.trim() || session.user.email.split("@")[0];
  const fullName = [session.user.first_name, session.user.last_name].filter(Boolean).join(" ") || name;
  const initials = fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`student-app learning-theme ${styles.shell}`}>
    <a href="#main-content" className={styles.skip}>Skip to content</a>
    <StudentNavigation contextLabel={context.type === "personal" ? "Personal learning" : context.label} canSwitch={session.contexts.length > 1} fullName={fullName} email={session.user.email} initials={initials} />
    <main id="main-content" tabIndex={-1} className={styles.main}><StudentPageMotion>{children}</StudentPageMotion></main>
    <footer className={styles.footer}><div className={styles.footerInner}><div><Link href="/student" className={styles.brand}><GraduationCap size={23} strokeWidth={1.5} aria-hidden="true" /> Lingua</Link><p>Lessons and conversations.<br />One space to find your voice.</p></div><nav aria-label="Learning links"><h2>Your learning</h2><Link href="/student/learn">Academic Path</Link><Link href="/student/practice">Communication Path</Link><Link href="/student/reviews">Reviews</Link><Link href="/student/progress">Progress</Link></nav><div className={styles.footerContext}><h2>Your workspace</h2><p>{context.type === "personal" ? "Personal learning" : context.label}</p>{session.contexts.length > 1 && <Link href="/select-context">Switch context</Link>}<p>Learning preview</p></div></div><div className={styles.footerBottom}>Lingua · Your language learning space</div></footer>
  </div>;
}
