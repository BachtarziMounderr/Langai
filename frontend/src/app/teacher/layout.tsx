import { AppShell } from "@/components/layout/AppShell";
import { requireWorkspace } from "@/lib/auth/server";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { session, context } = await requireWorkspace("/teacher");
  return <AppShell title="Teacher Workspace" navigation={["Dashboard", "Classes", "Students", "Content", "Progress"]} session={session} context={context}>{children}</AppShell>;
}
