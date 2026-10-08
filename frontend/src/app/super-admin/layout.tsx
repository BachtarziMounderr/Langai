import { AppShell } from "@/components/layout/AppShell";
import { requireWorkspace } from "@/lib/auth/server";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { session, context } = await requireWorkspace("/super-admin");
  return <AppShell title="Platform Administration" navigation={["Dashboard", "Schools", "Global Library", "Languages", "Platform Settings"]} session={session} context={context}>{children}</AppShell>;
}
