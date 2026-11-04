import Link from "next/link";
import {
  contentModeDescription,
  contentModeLabel,
  type ContentMode,
} from "@/lib/content-mode";

export function FilterHint({
  mode,
  compact = false,
}: {
  mode: ContentMode;
  compact?: boolean;
}) {
  const label = contentModeLabel(mode);
  const other: ContentMode = mode === "jewish" ? "filtered" : "jewish";
  const otherLabel = contentModeLabel(other);

  return (
    <aside
      className={`filter-hint${compact ? " is-compact" : ""}`}
      aria-label="Content filters"
    >
      <div className="filter-hint-main">
        <p className="filter-hint-label">
          Viewing <strong>{label}</strong>
        </p>
        {!compact ? (
          <p className="filter-hint-copy">{contentModeDescription(mode)}</p>
        ) : null}
      </div>
      <div className="filter-hint-actions">
        <p className="filter-hint-tip">
          Switch modes in the header
          {compact ? "" : " (or sidebar on phone)"}. Prefer{" "}
          <strong>{otherLabel}</strong>? Use the toggle.
        </p>
        <Link href="/categories" className="filter-hint-link">
          Browse categories
        </Link>
        <span className="filter-hint-sep" aria-hidden>
          ·
        </span>
        <span className="filter-hint-parental">
          Parental limits: people icon
        </span>
      </div>
    </aside>
  );
}
