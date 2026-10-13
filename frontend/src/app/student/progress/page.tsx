import { studentClassName } from "@/features/student/components/student-class-name";
import { StudentStatistics } from "@/features/student/components/StudentStatistics";

export default function ProgressPage() {
  return <div className={studentClassName("student-progress-page pb-12")}>
    <header className={studentClassName("student-page-intro")}><span className={studentClassName("student-section-path")}>Your learning record</span><h1>A clearer picture of your progress.</h1><p>Your exercise results, skill by skill. Discover what is working and what to practise next.</p></header>
    <StudentStatistics />
  </div>;
}
