import { AppShell } from "@/components/layout/AppShell";
import { requireWorkspace } from "@/lib/auth/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, context } = await requireWorkspace("/admin");
  return <AppShell title="School Administration" navigation={["Dashboard", "Students", "Teachers", "Classes", "Content", "School Settings"]} session={session} context={context}>{children}</AppShell>;
}
