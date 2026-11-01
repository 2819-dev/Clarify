"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type SetupPayload = {
  secretDisplay: string;
  qrDataUrl: string;
  otpauthUrl: string;
};

export function TwoFactorSetup({
  initiallyEnabled,
}: {
  initiallyEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startSetup() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start two-factor setup.");
        return;
      }
      setSetup({
        secretDisplay: data.secretDisplay,
        qrDataUrl: data.qrDataUrl,
        otpauthUrl: data.otpauthUrl,
      });
      setCode("");
    } catch {
      setError("Could not start two-factor setup.");
    } finally {
      setPending(false);
    }
  }

  async function confirmSetup(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not turn on two-factor authentication.");
        return;
      }
      setEnabled(true);
      setSetup(null);
      setMessage("Two-factor authentication is on.");
      router.refresh();
    } catch {
      setError("Could not turn on two-factor authentication.");
    } finally {
      setPending(false);
    }
  }

  async function onDisable(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not turn off two-factor authentication.");
        return;
      }
      setEnabled(false);
      setPassword("");
      setCode("");
      setMessage("Two-factor authentication is off.");
      router.refresh();
    } catch {
      setError("Could not turn off two-factor authentication.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="security-panel">
      <h2 className="comment-heading">Two-factor authentication</h2>
      <p className="yt-home-sub">
        Protect your account with an authenticator app such as Google
        Authenticator, 1Password, or Authy. Codes refresh every 30 seconds.
      </p>

      {message ? <p className="auth-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!enabled && !setup ? (
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={startSetup}
        >
          {pending ? "Getting ready…" : "Turn on two-factor authentication"}
        </button>
      ) : null}

      {setup ? (
        <form className="auth-form totp-setup" onSubmit={confirmSetup}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.qrDataUrl}
            alt="QR code for authenticator app"
            className="totp-qr"
            width={220}
            height={220}
          />
          <p className="auth-hint">
            Scan the QR code, or enter this key manually:
          </p>
          <p className="totp-secret">{setup.secretDisplay}</p>
          <label htmlFor="totp-confirm">Confirm with a code</label>
          <input
            id="totp-confirm"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Turning on…" : "Confirm and turn on"}
            </button>
            <button
              type="button"
              className="user-menu-link"
              onClick={() => setSetup(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {enabled ? (
        <form className="auth-form" onSubmit={onDisable}>
          <p className="auth-hint">
            Two-factor authentication is turned on for this account.
          </p>
          <label htmlFor="disable-password">Password</label>
          <input
            id="disable-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="disable-code">Authenticator code</label>
          <input
            id="disable-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={pending}>
            {pending ? "Turning off…" : "Turn off two-factor authentication"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
