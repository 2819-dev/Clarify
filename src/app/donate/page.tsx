import type { Metadata } from "next";
import Link from "next/link";
import { ClarifyLogo } from "@/components/ClarifyLogo";

export const metadata: Metadata = {
  title: "Donate — Clarify",
  description:
    "Clarify is free forever. Donations (Stripe coming soon) help Guide keep the library curated and family-safe.",
};

export default function DonatePage() {
  return (
    <article className="brand-page">
      <header className="brand-hero">
        <ClarifyLogo size="lg" href={null} />
        <p className="brand-eyebrow">Support Clarify</p>
        <h1 className="brand-title">Donate</h1>
        <p className="brand-lede">
          We don’t charge for Clarify. Optional donations help Guide keep
          curation, filtering, and parental tools growing.
        </p>
      </header>

      <section className="brand-section brand-donate-card">
        <h2>Stripe checkout coming soon</h2>
        <p>
          Online donations aren’t live yet. We’re wiring Stripe so you can give
          securely in a few clicks. Check back here — or email Guide if you’d
          like to support sooner.
        </p>
        <div className="brand-donate-placeholder" role="status">
          <p className="brand-donate-amount">Donate</p>
          <p className="brand-donate-note">Payment form placeholder · Stripe later</p>
          <button type="button" className="btn-primary" disabled>
            Donate (coming soon)
          </button>
        </div>
      </section>

      <section className="brand-section">
        <h2>What your support helps</h2>
        <ul className="brand-list">
          <li>Keeping Clarify free for every family</li>
          <li>Catalog curation and safer filtering</li>
          <li>Parental controls and device linking</li>
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
