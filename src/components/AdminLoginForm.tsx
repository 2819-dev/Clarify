"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ needsTotp = false }: { needsTotp?: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotp, setShowTotp] = useState(needsTotp);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          totpCode: showTotp ? totpCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsTotp) setShowTotp(true);
        throw new Error(data.error || "Could not sign in.");
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setSaving(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={onSubmit}>
      <label htmlFor="admin-password">Admin password</label>
      <input
        id="admin-password"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={saving}
      />
      {showTotp ? (
        <>
          <label htmlFor="admin-totp">Authenticator code</label>
          <input
            id="admin-totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={8}
            required
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            disabled={saving}
          />
        </>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
