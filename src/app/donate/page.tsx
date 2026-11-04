import type { Metadata } from "next";
import Link from "next/link";
import { ClarifyLogo } from "@/components/ClarifyLogo";

export const metadata: Metadata = {
  title: "Donate — Clarify",
  description:
    "Clarify is free forever. Optional donations help Guide keep the library curated and family-safe.",
};

export default function DonatePage() {
  return (
    <article className="brand-page">
      <header className="brand-hero">
        <ClarifyLogo size="lg" href={null} />
        <p className="brand-eyebrow">Support Clarify</p>
        <h1 className="brand-title">Donate</h1>
        <p className="brand-lede">
          We don’t charge for Clarify. Optional gifts help Guide keep the
          library curated, family-safe, and free for everyone.
        </p>
      </header>

      <section className="brand-section brand-donate-card">
        <h2>Online giving coming soon</h2>
        <p>
          Secure online donations aren’t available yet. Check back here shortly
          — or reach out to Guide if you’d like to support Clarify sooner.
        </p>
        <div className="brand-donate-placeholder" role="status">
          <p className="brand-donate-amount">Donate</p>
          <p className="brand-donate-note">
            Secure checkout will appear here when ready
          </p>
          <button type="button" className="btn-primary" disabled>
            Donate (coming soon)
          </button>
        </div>
      </section>

      <section className="brand-section">
        <h2>What your support helps</h2>
        <ul className="brand-list">
          <li>Keeping Clarify free for every family</li>
          <li>Thoughtful curation and safer viewing choices</li>
          <li>Parental controls for homes that need them</li>
        </ul>
        <div className="brand-actions">
          <Link href="/about" className="btn-secondary">
            About Clarify
          </Link>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </section>
    </article>
  );
}
