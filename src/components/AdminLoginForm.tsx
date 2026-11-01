"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSaving(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={onSubmit}>
      <label htmlFor="admin-password">Password</label>
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
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
