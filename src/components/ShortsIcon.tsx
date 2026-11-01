/** Vertical phone + play mark — reads as Shorts, not the old wavy “S”. */
export function ShortsIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 1.75A2.25 2.25 0 0 0 5.75 4v16A2.25 2.25 0 0 0 8 22.25h8A2.25 2.25 0 0 0 18.25 20V4A2.25 2.25 0 0 0 16 1.75H8ZM7.25 4c0-.41.34-.75.75-.75h8c.41 0 .75.34.75.75v16c0 .41-.34.75-.75.75H8a.75.75 0 0 1-.75-.75V4Z" />
      <path d="M10.2 8.35a.75.75 0 0 1 1.14-.64l4.4 2.65a.75.75 0 0 1 0 1.28l-4.4 2.65a.75.75 0 0 1-1.14-.64V8.35Z" />
      <circle cx="12" cy="19.15" r="0.85" />
    </svg>
  );
}
