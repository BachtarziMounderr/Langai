import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveWorkspace } from "./routing";

export type WorkspaceContext = {
  id: string;
  type: "platform" | "school" | "personal";
  label: string;
  tenant_id: string | null;
  school_id: string | null;
  role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";
  route: string;
};

export type BrowserSession = {
  user: { id: string; email: string; first_name: string | null; last_name: string | null };
  must_change_password: boolean;
  global_roles: string[];
  contexts: WorkspaceContext[];
};

const API_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

export async function readSession(): Promise<BrowserSession | null> {
  const token = (await cookies()).get("lingua_refresh")?.value;
  if (!token) return null;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/auth/session`, {
      headers: { Cookie: `lingua_refresh=${token}` },
      cache: "no-store",
    });
  } catch {
    redirect("/service-unavailable");
  }
  if (response.status === 401) return null;
  if (!response.ok) redirect("/service-unavailable");
  return response.json() as Promise<BrowserSession>;
}

export async function requireSession(): Promise<BrowserSession> {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.must_change_password) redirect("/login?change-password=1");
  return session;
}

export async function requireWorkspace(route: string): Promise<{
  session: BrowserSession; context: WorkspaceContext;
}> {
  const session = await requireSession();
  const selectedId = (await cookies()).get("lingua_context")?.value;
  const decision = resolveWorkspace(session.contexts, selectedId, route);
  if (decision.status === "none") redirect("/no-workspace");
  if (decision.status === "select") redirect("/select-context");
  if (decision.status === "forbidden") redirect("/forbidden");
  return { session, context: decision.context };
}
