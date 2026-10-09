import Link from "next/link";
import { LearningStatus } from "@/components/layout/LearningStatus";
import styles from "@/components/layout/LearningStatus.module.css";

export default function ForbiddenPage() { return <LearningStatus title="Access denied" description="This workspace is not available in your active context."><Link className={styles.button} href="/select-context">Choose a workspace</Link></LearningStatus>; }
