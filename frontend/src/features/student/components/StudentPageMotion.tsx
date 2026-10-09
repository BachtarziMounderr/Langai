"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import motionStyles from "./StudentPageMotion.module.css";
import styles from "./StudentShell.module.css";
import workspaceStyles from "./StudentWorkspace.module.css";

const REVEAL_THRESHOLD = 0.12;

export function StudentPageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const targets = Array.from(element.querySelectorAll<HTMLElement>("[data-student-scene], [data-student-reveal]"));
    let observer: IntersectionObserver | undefined;

    // Visible by default, including without JavaScript or observer support.
    const show = (target: HTMLElement, immediately = false) => {
      observer?.unobserve(target);
      if (immediately) {
        target.classList.remove(motionStyles.reveal, motionStyles.visible);
        target.classList.add(motionStyles.instant);
      } else target.classList.add(motionStyles.visible);
    };

    if (!preference.matches) {
      const enter = (target: HTMLElement, delay = 0) => {
        animations.push(target.animate([
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 420, delay, easing: "cubic-bezier(.2,.75,.25,1)", fill: "backwards" }));
      };
      // Initial page/hero entry is separate from section reveals: no overlapping
      // keyframes or scroll timelines are applied to the observed sections.
      if (pathname !== "/student") enter(element);
      else element.querySelectorAll<HTMLElement>("[data-student-enter]").forEach((target, index) => enter(target, index * 65));

      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= REVEAL_THRESHOLD) show(entry.target as HTMLElement);
          });
        }, { threshold: REVEAL_THRESHOLD, rootMargin: "0px 0px -8% 0px" });

        targets.forEach((target) => {
          if (target.contains(document.activeElement)) {
            show(target, true);
            return;
          }
          target.classList.add(motionStyles.reveal);
          observer?.observe(target);
        });
      }
    }

    // Keyboard navigation must never land on an invisible control.
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Node)) return;
      const focused = event.target;
      targets.forEach((target) => {
        if (target.contains(focused)) show(target, true);
      });
    };
    const onPreferenceChange = () => {
      if (!preference.matches) return;
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      targets.forEach((target) => show(target, true));
    };
    element.addEventListener("focusin", onFocus);
    preference.addEventListener("change", onPreferenceChange);

    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      targets.forEach((target) => target.classList.remove(motionStyles.reveal, motionStyles.visible, motionStyles.instant));
      element.removeEventListener("focusin", onFocus);
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, [pathname]);
  return <div ref={root} className={pathname === "/student" ? undefined : `${styles.inner} ${workspaceStyles.workspace}`}>{children}</div>;
}
