import { LogoutButton } from "@/components/layout/LogoutButton";
import { LearningStatus } from "@/components/layout/LearningStatus";
import styles from "@/components/layout/LearningStatus.module.css";

export default function NoWorkspacePage() { return <LearningStatus title="No workspace available" description="Ask an administrator for access."><LogoutButton className={styles.button} /></LearningStatus>; }
