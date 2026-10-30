"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CatalogSearch({
  action = "/",
  placeholder = "Search title, channel, or category…",
}: {
  action?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    const qs = next.toString();
    router.push(qs ? `${action}?${qs}` : action);
  }

  return (
    <form className="catalog-search" onSubmit={onSubmit} role="search">
      <label htmlFor="catalog-q" className="sr-only">
        Search catalog
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
      <button type="submit" className="btn-primary">
        Search
      </button>
    </form>
  );
}
