import type { Metadata } from "next";
import Link from "next/link";
import { ClarifyLogo } from "@/components/ClarifyLogo";

export const metadata: Metadata = {
  title: "About Clarify — Free forever",
  description:
    "Clarify is a free, curated video library for Jewish and family-friendly viewing. Built by Guide. We don’t charge — donations keep it going.",
};

export default function AboutPage() {
  return (
    <article className="brand-page">
      <header className="brand-hero">
        <ClarifyLogo size="lg" href={null} />
        <p className="brand-eyebrow">Built by Guide</p>
        <h1 className="brand-title">Free forever</h1>
        <p className="brand-lede">
          Clarify is a carefully selected video library for Jewish makers and
          family-friendly viewing. No subscriptions. No paywall. Just safer
          watching.
        </p>
      </header>

      <section className="brand-section">
        <h2>What Clarify is</h2>
        <p>
          A YouTube-like home for videos we believe belong in a Jewish or
          family living room. Switch between{" "}
          <strong>Jewish</strong> (content made by Jewish creators) and{" "}
          <strong>Family-Friendly</strong> (Jewish makers plus suitable
          non-Jewish creators). Use categories, search, and parental controls
          to narrow further.
        </p>
      </section>

      <section className="brand-section">
        <h2>How filtering works</h2>
        <ul className="brand-list">
          <li>
            <strong>Jewish mode</strong> — videos from Jewish creators and
            makers, not merely topics “about Jews.”
          </li>
          <li>
            <strong>Family-Friendly mode</strong> — broader library: Jewish
            makers plus nature, kids, and other suitable channels.
          </li>
          <li>
            <strong>Categories &amp; Music / News</strong> — browse by topic;
            Music and News stay in their own sections on home.
          </li>
          <li>
            <strong>Parental controls</strong> — the people icon in the header
            links a parent and child device, disables categories, and sets time
            limits.
          </li>
        </ul>
      </section>

      <section className="brand-section">
        <h2>We don’t charge</h2>
        <p>
          Clarify stays free for families. If it helps your home, you can{" "}
          <Link href="/donate">donate</Link> when you’re ready — Stripe checkout
          is coming soon. Until then, thank you for watching and reporting
          anything that doesn’t belong.
        </p>
        <div className="brand-actions">
          <Link href="/donate" className="btn-primary">
            Donate
          </Link>
          <Link href="/" className="btn-secondary">
            Browse videos
          </Link>
        </div>
      </section>
    </article>
  );
}
