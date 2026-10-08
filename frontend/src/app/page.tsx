"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function Home() {
  const [apiStatus, setApiStatus] = useState("Checking backend…");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ status: string }>;
      })
      .then((result) => setApiStatus(result.status === "ok" ? "Backend: ok" : "Backend: unexpected response"))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setApiStatus("Backend: unavailable");
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Lingua AI Platform</h1>
      <p>Development environment is running.</p>
      <p aria-live="polite">{apiStatus}</p>
      <Link className="underline" href="/login">Sign in</Link>
    </main>
  );
}
