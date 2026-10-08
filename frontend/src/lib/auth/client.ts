"use client";

// An unset public URL keeps browser requests on the Next.js origin. This lets
// the API rewrite return the refresh cookie to the same host as protected pages.
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  must_change_password: boolean;
};

type AccessResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  must_change_password: boolean;
};

let accessToken: string | null = null;
let refreshInFlight: Promise<AccessResponse> | null = null;

function clearWorkspaceChoice(): void {
  document.cookie = "lingua_context=; Max-Age=0; Path=/; SameSite=Lax";
}

async function readError(response: Response): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return new Error(error.message);
    }
  }
  return new Error(`Request failed (${response.status})`);
}

async function refreshOnce(): Promise<AccessResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    cache: "no-store",
  });
  if (!response.ok) {
    accessToken = null;
    throw await readError(response);
  }
  const result = (await response.json()) as AccessResponse;
  accessToken = result.access_token;
  return result;
}

export const authClient = {
  async studentDemoTurn(payload: {
    context_id: string; scenario_id: string; text?: string; audio_base64?: string;
    audio_mime?: string; history: { role: "user" | "assistant"; text: string }[];
  }): Promise<{ transcript: string; reply: string; audio_base64: string | null; audio_mime: string | null }> {
    if (!accessToken) await this.refresh();
    const send = () => fetch(`${apiBaseUrl}/api/v1/student/demo/conversation`, {
      method: "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    let response = await send();
    if (response.status === 401) { await this.refresh(); response = await send(); }
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      if (body && typeof body === "object" && "detail" in body) {
        const detail = body.detail;
        if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") throw new Error(detail.message);
      }
      throw await readError(response);
    }
    return response.json();
  },
  async login(email: string, password: string): Promise<AccessResponse> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!response.ok) throw await readError(response);
    const result = (await response.json()) as AccessResponse;
    accessToken = result.access_token;
    clearWorkspaceChoice();
    return result;
  },

  refresh(): Promise<AccessResponse> {
    if (!refreshInFlight) {
      refreshInFlight = refreshOnce().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },

  async me(): Promise<AuthUser> {
    if (!accessToken) await this.refresh();
    let response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
      cache: "no-store",
    });
    if (response.status === 401) {
      await this.refresh();
      response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
        cache: "no-store",
      });
    }
    if (!response.ok) throw await readError(response);
    return (await response.json()) as AuthUser;
  },

  async logout(): Promise<void> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        cache: "no-store",
      });
      if (!response.ok) throw await readError(response);
    } finally {
      accessToken = null;
      clearWorkspaceChoice();
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!accessToken) await this.refresh();
    const send = () => fetch(`${apiBaseUrl}/api/v1/auth/change-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      cache: "no-store",
    });
    let response = await send();
    if (response.status === 401) {
      await this.refresh();
      response = await send();
    }
    if (!response.ok) throw await readError(response);
    accessToken = null;
  },
};
