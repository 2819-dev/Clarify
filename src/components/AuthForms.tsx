"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (requires2fa) {
        const res = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: totpCode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not verify code.");
          return;
        }
        router.replace(nextPath || "/");
        router.refresh();
        return;
      }

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
      if (data.requires2fa) {
        setRequires2fa(true);
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
      {!requires2fa ? (
        <>
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
        </>
      ) : (
        <>
          <p className="auth-hint">
            Enter the 6-digit code from your authenticator app
            {email ? ` for ${email}` : ""}.
          </p>
          <label htmlFor="signin-totp">Authenticator code</label>
          <input
            id="signin-totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={8}
            required
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            autoFocus
          />
        </>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="auth-actions">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending
            ? requires2fa
              ? "Verifying…"
              : "Signing in…"
            : requires2fa
              ? "Verify code"
              : "Sign in"}
        </button>
        {requires2fa ? (
          <button
            type="button"
            className="user-menu-link"
            onClick={() => {
              setRequires2fa(false);
              setTotpCode("");
              setError(null);
            }}
          >
            Back
          </button>
        ) : (
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>
            Create account
          </Link>
        )}
      </div>
    </form>
  );
}

export function SignUpForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
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
          username: username || undefined,
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
        placeholder="Your name"
      />
      <label htmlFor="signup-username">Username</label>
      <input
        id="signup-username"
        type="text"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="@username"
        minLength={2}
        maxLength={30}
        pattern="[A-Za-z0-9._]+"
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
      <p className="auth-hint">
        Use at least 8 characters. You can add two-factor authentication later
        in Account → Security.
      </p>
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
