"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.replace(nextPath || "/");
      router.refresh();
    } catch {
      setError("Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label htmlFor="signin-email">Email</label>
      <input
        id="signin-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="signin-password">Password</label>
      <input
        id="signin-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="auth-actions">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>
          Create account
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }
      router.replace(nextPath || "/");
      router.refresh();
    } catch {
      setError("Could not create account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label htmlFor="signup-name">Display name</label>
      <input
        id="signup-name"
        type="text"
        autoComplete="nickname"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Optional"
      />
      <label htmlFor="signup-email">Email</label>
      <input
        id="signup-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="signup-password">Password</label>
      <input
        id="signup-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <p className="auth-hint">At least 8 characters.</p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="auth-actions">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
        <Link href={`/signin?next=${encodeURIComponent(nextPath)}`}>
          Sign in
        </Link>
      </div>
    </form>
  );
}
