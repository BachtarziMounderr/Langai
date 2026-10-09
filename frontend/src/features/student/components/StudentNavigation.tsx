"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import styles from "./StudentShell.module.css";

const items = [
  { label: "Dashboard", href: "/student" },
  { label: "Learn", href: "/student/learn" },
  { label: "Practice", href: "/student/practice" },
  { label: "Reviews", href: "/student/reviews" },
  { label: "Progress", href: "/student/progress" },
];

export function StudentNavigation({ contextLabel, canSwitch, fullName, email, initials }: { contextLabel: string; canSwitch: boolean; fullName: string; email: string; initials: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const profile = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (open) { setOpen(false); trigger.current?.focus(); }
      if (profile.current?.open) { profile.current.open = false; profile.current.querySelector("summary")?.focus(); }
    };
    const wide = window.matchMedia("(min-width: 1000px)");
    const resize = () => { if (wide.matches) setOpen(false); };
    document.addEventListener("keydown", close);
    wide.addEventListener("change", resize);
    return () => { document.removeEventListener("keydown", close); wide.removeEventListener("change", resize); };
  }, [open]);
  const closeMenu = () => { setOpen(false); if (profile.current) profile.current.open = false; };

  return <header className={`${styles.header} ${path === "/student" ? styles.homeHeader : ""}`}><div className={styles.headerInner}>
    <Link href="/student" className={styles.brand} onClick={closeMenu}><GraduationCap size={25} strokeWidth={1.5} aria-hidden="true" /><span>Lingua</span></Link>
    <button ref={trigger} className={styles.menuToggle} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="student-navigation" onClick={() => setOpen(!open)}>{open ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}</button>
    <div id="student-navigation" className={`${styles.navigation} ${open ? styles.open : ""}`}>
      <nav aria-label="Student navigation" className={styles.links}>{items.map(({ label, href }) => <Link key={href} href={href} aria-current={(href === "/student" ? path === href : path.startsWith(href)) ? "page" : undefined} onClick={closeMenu}>{label}</Link>)}</nav>
      <details ref={profile} className={styles.profile} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}><summary aria-label={`Profile and workspace: ${fullName}, ${contextLabel}`}><span className={styles.avatar} aria-hidden="true">{initials}</span><span className={styles.summaryText}><strong title={contextLabel}>{contextLabel}</strong><small title={fullName}>{fullName}</small></span><ChevronDown size={15} aria-hidden="true" /></summary><div className={styles.profilePanel}><strong>{fullName}</strong><span>{email}</span><span className={styles.profileContext}>{contextLabel}</span>{canSwitch && <Link href="/select-context" onClick={closeMenu}>Switch context</Link>}<LogoutButton className={styles.logout} label={<><LogOut size={16} aria-hidden="true" /> Log out</>} /></div></details>
    </div>
  </div></header>;
}
