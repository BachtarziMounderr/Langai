"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesCombined, House, LogOut, Menu, MessageCircle, RotateCcw, Settings2, X } from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";

const groups = [
  { label: "Your day", items: [{ label: "Dashboard", href: "/student", icon: House }] },
  { label: "Your paths", items: [{ label: "Learn", href: "/student/learn", icon: BookOpen }, { label: "Practice", href: "/student/practice", icon: MessageCircle }] },
  { label: "Your growth", items: [{ label: "Reviews", href: "/student/reviews", icon: RotateCcw }, { label: "Progress", href: "/student/progress", icon: ChartNoAxesCombined }] },
];

export function StudentNavigation({ contextLabel, canSwitch, fullName, email, initials }: { contextLabel: string; canSwitch: boolean; fullName: string; email: string; initials: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      if (event.key !== "Tab") return;
      const focusable = document.querySelectorAll<HTMLElement>("#student-sidebar a[href], #student-sidebar button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!document.getElementById("student-sidebar")?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return <>
    <div className="student-mobile-bar"><Link href="/student" className="student-brand" onClick={() => setOpen(false)}><span className="student-brand-mark">L</span><span>Lingua</span></Link><button ref={triggerRef} type="button" className="student-icon-button" aria-label="Open navigation" aria-expanded={open} aria-controls="student-sidebar" onClick={() => setOpen(true)}><Menu size={21} aria-hidden="true" /></button></div>
    {open && <button type="button" aria-label="Close navigation" className="student-nav-backdrop" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} />}
    <aside id="student-sidebar" className={`student-sidebar ${open ? "student-sidebar-open" : ""}`}>
      <div className="student-sidebar-brand"><Link href="/student" className="student-brand" onClick={() => setOpen(false)}><span className="student-brand-mark">L</span><span className="student-brand-name">Lingua</span></Link><button type="button" className="student-icon-button student-mobile-close" aria-label="Close navigation" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}><X size={20} aria-hidden="true" /></button></div>
      <div className="student-sidebar-motto">A little practice goes a long way.</div>
      <nav aria-label="Student navigation" className="student-nav-groups">{groups.map((group) => <div key={group.label} className="student-nav-group"><p>{group.label}</p>{group.items.map(({ label, href, icon: Icon }) => { const active = href === "/student" ? path === href : path.startsWith(href); return <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} title={label} className={`student-nav-link ${active ? "student-nav-active" : ""}`} onClick={() => setOpen(false)}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span className="student-nav-text">{label}</span><span className="student-nav-active-mark" aria-hidden="true" /></Link>; })}</div>)}</nav>
      <div className="student-sidebar-bottom"><div className="student-context-card"><span>Current space</span><strong title={contextLabel}>{contextLabel}</strong>{canSwitch && <Link href="/select-context" onClick={() => setOpen(false)}>Switch context</Link>}</div><div className="student-sidebar-profile"><span className="student-profile-avatar" aria-hidden="true">{initials}</span><span className="student-profile-text"><strong>{fullName}</strong><small title={email}>{email}</small></span></div><span className="student-nav-link student-nav-disabled" aria-disabled="true" title="Settings are coming later"><Settings2 size={18} aria-hidden="true" /><span className="student-nav-text">Settings</span></span><LogoutButton className="student-nav-link student-logout" label={<><LogOut size={18} aria-hidden="true" /><span className="student-nav-text">Log out</span></>} /></div>
    </aside>
  </>;
}
