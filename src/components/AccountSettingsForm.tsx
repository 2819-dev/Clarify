"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";

export function AccountSettingsForm({
  initial,
}: {
  initial: {
    display_name: string;
    username: string | null;
    email: string;
    avatar_url: string | null;
  };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [username, setUsername] = useState(initial.username || "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username: username || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile.");
        return;
      }
      setUsername(data.user.username || "");
      setDisplayName(data.user.display_name);
      setMessage("Profile saved.");
      router.refresh();
    } catch {
      setError("Could not save profile.");
    } finally {
      setPending(false);
    }
  }

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      // Client-side downscale to keep uploads small
      const blob = await resizeImage(file, 320);
      const form = new FormData();
      form.append("avatar", blob, "avatar.jpg");
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not upload photo.");
        return;
      }
      setAvatarUrl(data.user.avatar_url);
      setMessage("Profile photo updated.");
      router.refresh();
    } catch {
      setError("Could not upload photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="account-settings">
      <div className="account-avatar-block">
        <UserAvatar
          name={displayName || username || initial.email}
          avatarUrl={avatarUrl}
          size={88}
        />
        <div>
          <p className="auth-hint">Profile picture</p>
          <button
            type="button"
            className="btn-secondary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onAvatarChange(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <form className="auth-form" onSubmit={onSave}>
        <label htmlFor="account-display">Display name</label>
        <input
          id="account-display"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          required
        />
        <label htmlFor="account-username">Username</label>
        <input
          id="account-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={2}
          maxLength={30}
          pattern="[A-Za-z0-9._]+"
          required
        />
        <p className="auth-hint">Shown as @{username || "username"}</p>
        <label>Email</label>
        <input value={initial.email} disabled readOnly />
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="auth-success">{message}</p> : null}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

async function resizeImage(file: File, maxEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))),
      "image/jpeg",
      0.88,
    );
  });
}
