"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenText, Eye, EyeOff, LoaderCircle, MessageCircleMore, ShieldCheck } from "lucide-react";
import { authClient, type AuthUser } from "@/lib/auth/client";
import { LearningPhoto } from "@/components/ui/LearningPhoto";
import { learningVisuals } from "@/config/learning-visuals";
import { languages } from "@/features/student/demo-data";
import styles from "./Login.module.css";

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
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message && messageKind === "error") messageRef.current?.focus();
  }, [message, messageKind]);

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

  return <main className={`learning-theme ${styles.login}`}>
    <section className={styles.story} aria-label="About Lingua">
      {learningVisuals.login.src && <LearningPhoto {...learningVisuals.login} sizes="(max-width:650px) 1px, 52vw" priority className={styles.background} />}
      <div className={styles.storyInner}>
        <div className={styles.brand}><span className={styles.brandMark}>L</span><strong>Lingua</strong></div>
        <div className={styles.storyCopy}><span className={styles.eyebrow}></span><p className={styles.storyTitle}>Find your words.<br />Find your confidence.</p><p>Clear lessons and real conversations, connected in one place.</p><div className={styles.storyPaths}><span><BookOpenText size={20} strokeWidth={1.5} aria-hidden="true" /> Academic Path</span><span><MessageCircleMore size={20} strokeWidth={1.5} aria-hidden="true" /> Communication Path</span></div></div>
        <p className={styles.storyFoot}>{languages.map((item) => item.name).join(" & ")} in the current demo.</p>
      </div>
    </section>
    <section className={styles.access} aria-labelledby="login-heading"><div className={styles.card}>
      <div className={styles.mobileBrand}><span className={styles.brandMark}>L</span><strong>Lingua</strong></div>
      <span className={styles.eyebrow}>Your learning starts here</span>
      {restoring ? <><h1 id="login-heading">Welcome back.</h1><p className={styles.intro}>Finding your learning space…</p><p role="status" className={styles.status}>Checking your session…</p></> : !user ? <>
        <h1 id="login-heading">Welcome back.</h1><p className={styles.intro}>Sign in to pick up where you left off.</p>
        <form onSubmit={login} aria-busy={busy} className={styles.form}><label htmlFor="login-email">Email address</label><input id="login-email" name="email" spellCheck={false} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com…" />
          <label htmlFor="login-password">Password</label><div className={styles.password}><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password…" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
          <button className={styles.submit} disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"} {busy ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</button>
        </form><p className={styles.help}><ShieldCheck size={15} aria-hidden="true" /> Your workspace and school context are selected after sign-in.</p>
      </> : user.must_change_password ? <>
        <h1 id="login-heading">Secure your account.</h1><p className={styles.intro}>Change your temporary password before continuing.</p>
        <form onSubmit={changePassword} aria-busy={busy} className={styles.form}><label htmlFor="current-password">Current password</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <label htmlFor="new-password">New password</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small>Use at least 12 characters.</small>
          <button className={styles.submit} disabled={busy} type="submit">{busy ? "Changing password…" : "Change password"} {busy ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</button>
          <button className={styles.secondary} disabled={busy} type="button" onClick={logout}>Sign out</button>
        </form>
      </> : <>
        <h1 id="login-heading">You&apos;re signed in.</h1><p className={styles.intro}>Signed in as <strong>{user.email}</strong>.</p>
        <a className={styles.submit} href="/select-context">Continue to your workspace <ArrowRight size={18} aria-hidden="true" /></a>
        <button className={styles.secondary} disabled={busy} type="button" onClick={logout}>Sign out</button>
      </>}
      {message && <p ref={messageRef} tabIndex={-1} role={messageKind === "error" ? "alert" : "status"} aria-live="polite" className={`${styles.message} ${messageKind === "error" ? styles.error : styles.success}`}>{message}</p>}
    </div></section>
  </main>;
}
