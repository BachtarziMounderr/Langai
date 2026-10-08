"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function StudentPageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = pathname === "/student"
      ? Array.from(root.current.querySelectorAll<HTMLElement>("[data-student-reveal]")).slice(0, 6)
      : [root.current];
    const animations = targets.map((element, index) => element.animate(
      [{ opacity: 0, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: pathname === "/student" ? 300 : 240, delay: index * 55, easing: "cubic-bezier(.2,.75,.25,1)", fill: "backwards" },
    ));
    return () => animations.forEach((animation) => animation.cancel());
  }, [pathname]);

  return <div ref={root}>{children}</div>;
}
