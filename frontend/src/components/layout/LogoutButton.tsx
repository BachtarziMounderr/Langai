"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function LogoutButton({ className = "underline disabled:opacity-50", label = "Sign out" }: { className?: string; label?: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    try {
      await authClient.logout();
      router.replace("/login");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign out");
      setBusy(false);
    }
  }

  return <div><button type="button" className={className} disabled={busy} onClick={logout}>{busy ? "Signing out…" : label}</button>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
}
