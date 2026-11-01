"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserMenu({
  user,
}: {
  user: { email: string; display_name: string } | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!user) {
    return (
      <div className="user-menu">
        <Link href="/signin" className="user-menu-link">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <span className="user-menu-name" title={user.email}>
        {user.display_name || user.email}
      </span>
      <button
        type="button"
        className="user-menu-link"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await fetch("/api/auth/logout", { method: "POST" });
          router.refresh();
          setPending(false);
        }}
      >
        Sign out
      </button>
    </div>
  );
}
