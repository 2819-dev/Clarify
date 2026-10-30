"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClarifyLogo } from "@/components/ClarifyLogo";

const links = [
  { href: "/#catalog", label: "Browse", match: (p: string) => p === "/" },
  {
    href: "/categories",
    label: "Categories",
    match: (p: string) => p.startsWith("/categories"),
  },
  {
    href: "/channels",
    label: "Channels",
    match: (p: string) => p.startsWith("/channels"),
  },
];

export function SiteHeader() {
  const pathname = usePathname() || "/";

  return (
    <header className="site-header">
      <ClarifyLogo size="md" />
      <nav className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={link.match(pathname) ? "is-active" : undefined}
            aria-current={link.match(pathname) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <Link href="/admin/login" className="nav-quiet">
          Admin
        </Link>
      </nav>
    </header>
  );
}
