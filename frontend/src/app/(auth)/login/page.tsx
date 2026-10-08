"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, Eye, EyeOff, MessageCircleMore, ShieldCheck } from "lucide-react";
import { authClient, type AuthUser } from "@/lib/auth/client";
import { VisualAsset } from "@/features/student/components/VisualAsset";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("error");

  useEffect(() => {
    let active = true;
    authClient.me().then((profile) => {
      if (active) setUser(profile);
    }).catch(() => {
      if (active) setUser(null);
    }).finally(() => {
      if (active) setRestoring(false);
    });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await authClient.login(email, password);
      const profile = await authClient.me();
      setUser(profile);
      if (profile.must_change_password) setCurrentPassword(password);
      else router.replace("/select-context");
      setPassword("");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await authClient.changePassword(currentPassword, newPassword);
      setUser(null);
      setCurrentPassword("");
      setNewPassword("");
      setMessageKind("success");
      setMessage("Password changed. Sign in again.");
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      await authClient.logout();
      setUser(null);
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="lingua-login">
    <section className="lingua-login-story" aria-label="About Lingua"><div className="lingua-login-story-inner">
      <div className="lingua-login-brand"><span className="lingua-login-brand-mark">L</span><strong>Lingua</strong></div>
      <div className="lingua-login-story-copy"><span className="lingua-login-eyebrow">A learning space for every voice</span><h1>Learn it.<br /><em>Say it.</em><br />Make it yours.</h1><p>Clear lessons and real conversations, connected in one place.</p><div className="lingua-login-story-art"><VisualAsset kind="login" /><div className="lingua-login-art-note"><span><BookOpenText size={16} aria-hidden="true" /> Learn with purpose</span><span><MessageCircleMore size={16} aria-hidden="true" /> Practise with confidence</span></div></div></div>
      <p className="lingua-login-story-foot">English and German in the current demo · More languages can follow.</p>
    </div></section>
    <section className="lingua-login-access" aria-labelledby="login-heading"><div className="lingua-login-card">
      <div className="lingua-login-mobile-brand"><span className="lingua-login-brand-mark">L</span><strong>Lingua</strong></div>
      <span className="lingua-login-eyebrow">Your learning starts here</span>
      {restoring ? <><h2 id="login-heading">Welcome back.</h2><p className="lingua-login-intro">Finding your learning space…</p><p role="status" className="lingua-login-status">Checking your session…</p></> : !user ? <>
        <h2 id="login-heading">Welcome back.</h2><p className="lingua-login-intro">Sign in to pick up where you left off.</p>
        <form onSubmit={login} aria-busy={busy} className="lingua-login-form"><label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <label htmlFor="login-password">Password</label><div className="lingua-login-password"><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
          <button className="lingua-login-submit" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"} <ArrowRight size={18} aria-hidden="true" /></button>
        </form><p className="lingua-login-help"><ShieldCheck size={15} aria-hidden="true" /> Your workspace and school context are selected after sign-in.</p>
      </> : user.must_change_password ? <>
        <h2 id="login-heading">Secure your account.</h2><p className="lingua-login-intro">Change your temporary password before continuing.</p>
        <form onSubmit={changePassword} aria-busy={busy} className="lingua-login-form"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small>Use at least 12 characters.</small>
          <button className="lingua-login-submit" disabled={busy} type="submit">{busy ? "Changing password…" : "Change password"} <ArrowRight size={18} aria-hidden="true" /></button>
          <button className="lingua-login-secondary" disabled={busy} type="button" onClick={logout}>Sign out</button>
        </form>
      </> : <>
        <h2 id="login-heading">You&apos;re signed in.</h2><p className="lingua-login-intro">Signed in as <strong>{user.email}</strong>.</p>
        <a className="lingua-login-submit" href="/select-context">Continue to your workspace <ArrowRight size={18} aria-hidden="true" /></a>
        <button className="lingua-login-secondary" disabled={busy} type="button" onClick={logout}>Sign out</button>
      </>}
      {message && <p role={messageKind === "error" ? "alert" : "status"} aria-live="polite" className={`lingua-login-message lingua-login-message-${messageKind}`}>{message}</p>}
    </div></section>
  </main>;
}
