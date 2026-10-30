import Link from "next/link";
import { ClarifyLogo } from "@/components/ClarifyLogo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <ClarifyLogo size="md" />
      <nav className="site-nav" aria-label="Primary">
        <Link href="/#catalog">Browse</Link>
        <Link href="/categories">Categories</Link>
        <Link href="/channels">Channels</Link>
        <Link href="/admin/login" className="nav-quiet">
          Admin
        </Link>
      </nav>
    </header>
  );
}
