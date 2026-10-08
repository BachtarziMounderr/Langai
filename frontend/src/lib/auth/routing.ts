import type { WorkspaceContext } from "./server";

export function resolveWorkspace(
  contexts: WorkspaceContext[], selectedId: string | undefined, route: string,
): { status: "ok"; context: WorkspaceContext } | { status: "none" } | { status: "select" } | { status: "forbidden" } {
  if (contexts.length === 0) return { status: "none" };
  const selected = contexts.length === 1
    ? contexts[0]
    : contexts.find((context) => context.id === selectedId);
  if (!selected) return { status: "select" };
  if (selected.route !== route) return { status: "forbidden" };
  return { status: "ok", context: selected };
}
