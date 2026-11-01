"use client";

export function UserAvatar({
  name,
  avatarUrl,
  size = 32,
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={`user-avatar ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`user-avatar user-avatar-fallback ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
