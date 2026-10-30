import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark" aria-label="Clarify home">
        <span className="brand-orb" aria-hidden />
        <span className="brand-word">Clarify</span>
      </Link>
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
