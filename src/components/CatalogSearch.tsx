"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CatalogSearch({
  action = "/",
  placeholder = "Search",
}: {
  action?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    const format = params.get("format");
    if (format === "shorts" || format === "videos") next.set("format", format);
    const qs = next.toString();
    // Search always lands on home results (YT-style global search)
    const target = action.startsWith("/categories/") || action.startsWith("/channels/")
      ? "/"
      : action;
    router.push(qs ? `${target}?${qs}` : target);
  }

  return (
    <form className="catalog-search yt-search" onSubmit={onSubmit} role="search">
      <label htmlFor="catalog-q" className="sr-only">
        Search
      </label>
      <input
        id="catalog-q"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button type="submit" className="yt-search-btn" aria-label="Search">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      </button>
    </form>
  );
}
