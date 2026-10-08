"use client";

import { useEffect, useState } from "react";

export function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      queueMicrotask(() => setDisplay(value));
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / 750, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(Math.round(value * eased));
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <><span aria-hidden="true">{display}{suffix}</span><span className="sr-only">{value}{suffix}</span></>;
}
