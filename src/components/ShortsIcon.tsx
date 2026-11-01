/** Compact portrait play mark — reads clearly as Shorts, not a shirt. */
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
      <path d="M9 3.5h6A2.5 2.5 0 0 1 17.5 6v12A2.5 2.5 0 0 1 15 20.5H9A2.5 2.5 0 0 1 6.5 18V6A2.5 2.5 0 0 1 9 3.5Zm1.85 5.2v6.6c0 .45.5.72.88.48l5.05-3.3a.55.55 0 0 0 0-.96l-5.05-3.3a.55.55 0 0 0-.88.48Z" />
    </svg>
  );
}
