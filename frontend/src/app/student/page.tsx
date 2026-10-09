import { StudentDashboard } from "@/features/student/components/StudentDashboard";
import { requireSession } from "@/lib/auth/server";

export default async function StudentPage() {
  const session = await requireSession();
  const firstName = session.user.first_name?.trim() || session.user.email.split("@")[0];
  return <StudentDashboard firstName={firstName} />;
}
