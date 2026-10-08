import { StudentShell } from "@/features/student/components/StudentShell";
import { DemoProgressProvider } from "@/features/student/components/DemoProgress";
import { requireWorkspace } from "@/lib/auth/server";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { session, context } = await requireWorkspace("/student");
  return <StudentShell session={session} context={context}><DemoProgressProvider key={`${session.user.id}:${context.id}`} userId={session.user.id} contextId={context.id}>{children}</DemoProgressProvider></StudentShell>;
}
