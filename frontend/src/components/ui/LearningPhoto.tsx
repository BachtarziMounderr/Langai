"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BookOpenText, MessageCircleMore } from "lucide-react";
import styles from "./LearningPhoto.module.css";

// Local photos use responsive Next.js optimization. Remote photos stay native,
// without opening the optimization proxy to arbitrary hosts. Frames reserve space.
export function LearningPhoto({ src, alt, priority = false, compact = false, conversation = false, className = "", position = "50% 50%", mobilePosition = position, sizes = "(max-width: 600px) 100vw, 50vw", unoptimized = false }: {
  src?: string; alt: string; priority?: boolean; compact?: boolean; conversation?: boolean; className?: string;
  position?: string; mobilePosition?: string; sizes?: string; unoptimized?: boolean;
}) {
  const [loadedSrc, setLoadedSrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Cached or failed SSR images may finish before React attaches event handlers.
    // Check completion after hydration as well as listening for load/error events.
    const current = image.current;
    if (!src || !current?.complete) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (current.naturalWidth > 0) setLoadedSrc(src);
      else setFailedSrc(src);
    });
    return () => { cancelled = true; };
  }, [src]);
  const Icon = conversation ? MessageCircleMore : BookOpenText;
  const hasPhoto = Boolean(src && src !== failedSrc);
  const localPhoto = src?.startsWith("/") && !src.startsWith("//");
  const crop = { "--photo-position": position, "--photo-mobile-position": mobilePosition } as CSSProperties;
  return <div style={crop} className={`${styles.frame} ${compact ? styles.compact : ""} ${conversation ? styles.conversation : ""} ${hasPhoto && loadedSrc === src ? styles.ready : ""} ${className}`}>
    <div className={styles.illustration} aria-hidden="true"><span className={styles.orbit} /><span className={styles.sheet}><Icon size={44} strokeWidth={1} /><span /><span /><span /></span><span className={styles.seal}><Icon size={21} strokeWidth={1.4} /></span></div>
    {hasPhoto && <>
      {loadedSrc !== src && <span className={styles.loading} aria-hidden="true" />}
      {localPhoto ? <Image ref={image} src={src!} alt={alt} fill sizes={sizes} unoptimized={unoptimized} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} className={styles.photo} onLoad={() => setLoadedSrc(src!)} onError={() => setFailedSrc(src!)} /> : (
        // eslint-disable-next-line @next/next/no-img-element -- Configurable remote hosts; fixed container dimensions.
        <img ref={image} src={src} alt={alt} width={1200} height={900} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className={styles.photo} onLoad={() => setLoadedSrc(src!)} onError={() => setFailedSrc(src!)} />
      )}
    </>}
  </div>;
}
