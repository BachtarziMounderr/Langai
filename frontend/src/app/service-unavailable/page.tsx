import Link from "next/link";
import { LearningStatus } from "@/components/layout/LearningStatus";
import styles from "@/components/layout/LearningStatus.module.css";

export default function ServiceUnavailablePage() { return <LearningStatus title="Service unavailable" description="Could not check your session. Please try again shortly."><Link className={styles.button} href="/login">Try signing in again</Link></LearningStatus>; }
