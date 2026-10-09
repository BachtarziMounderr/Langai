import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./LearningStatus.module.css";

export function LearningStatus({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className={`learning-theme ${styles.page}`}>
    <a className={styles.skip} href="#status-content">Skip to content</a>
    <header className={styles.header}><Link href="/login" aria-label="Lingua home"><GraduationCap size={23} aria-hidden="true" /> LINGUA <span>LEARNING SPACE</span></Link></header>
    <main id="status-content" tabIndex={-1} className={styles.main}><p className={styles.eyebrow}>Your learning space</p><h1>{title}</h1><p className={styles.description}>{description}</p><div className={styles.actions}>{children}</div></main>
    <footer className={styles.footer}>A little practice goes a long way.</footer>
  </div>;
}
