"use client";

import Link from "next/link";
import { useId } from "react";

type Props = {
  href?: string | null;
  size?: "sm" | "md" | "lg" | "hero";
  variant?: "default" | "inverse" | "on-dark";
  showWordmark?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: 28, word: "1.15rem", gap: "0.55rem" },
  md: { mark: 36, word: "1.55rem", gap: "0.7rem" },
  lg: { mark: 48, word: "2.15rem", gap: "0.85rem" },
  hero: { mark: 72, word: "clamp(3.8rem, 11vw, 6.8rem)", gap: "1.05rem" },
};

export function ClarifyMark({
  size = 36,
  variant = "default",
  className = "",
}: {
  size?: number;
  variant?: "default" | "inverse" | "on-dark";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const haloId = `clarifyHalo-${uid}`;
  const sparkId = `clarifySpark-${uid}`;
  const blue = variant === "default" ? "#3B82C4" : "#F4F8FE";
  const blueDeep = variant === "default" ? "#2563A8" : "#D7E6FA";
  const gold = "#E4B45A";
  const goldDeep = "#C9842A";

  return (
    <svg
      className={`clarify-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={haloId}
          x1="12"
          y1="8"
          x2="54"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={blue} />
          <stop offset="1" stopColor={blueDeep} />
        </linearGradient>
        <linearGradient
          id={sparkId}
          x1="34"
          y1="14"
          x2="52"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={gold} />
          <stop offset="1" stopColor={goldDeep} />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#${haloId})`} />
      <circle
        cx="30"
        cy="32"
        r="16"
        stroke="white"
        strokeOpacity="0.92"
        strokeWidth="3.2"
      />
      <circle cx="30" cy="32" r="9.5" fill="white" fillOpacity="0.16" />
      <path
        d="M46.5 18.5c1.1 3.8 3.7 6.4 7.5 7.5-3.8 1.1-6.4 3.7-7.5 7.5-1.1-3.8-3.7-6.4-7.5-7.5 3.8-1.1 6.4-3.7 7.5-7.5Z"
        fill={`url(#${sparkId})`}
      />
      <circle cx="30" cy="32" r="3.2" fill={`url(#${sparkId})`} />
    </svg>
  );
}

export function ClarifyLogo({
  href = "/",
  size = "md",
  variant = "default",
  showWordmark = true,
  className = "",
}: Props) {
  const s = sizes[size];
  const wordColor =
    variant === "default" ? "var(--blue-950)" : "var(--white, #ffffff)";

  const inner = (
    <span
      className={`clarify-logo clarify-logo--${size} clarify-logo--${variant} ${className}`}
      style={{ gap: s.gap }}
    >
      <ClarifyMark size={s.mark} variant={variant} />
      {showWordmark ? (
        <span
          className="clarify-wordmark"
          style={{ fontSize: s.word, color: wordColor }}
        >
          Clarify
        </span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="clarify-logo-link" aria-label="Clarify home">
        {inner}
      </Link>
    );
  }

  return inner;
}
