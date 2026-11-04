import type { Metadata } from "next";
import Link from "next/link";
import { ClarifyLogo } from "@/components/ClarifyLogo";

export const metadata: Metadata = {
  title: "About Clarify — Free forever",
  description:
    "Clarify is a free video library for Jewish and family-friendly viewing. Built by Guide. Always free — optional donations welcome.",
};

export default function AboutPage() {
  return (
    <article className="brand-page">
      <header className="brand-hero">
        <ClarifyLogo size="lg" href={null} />
        <p className="brand-eyebrow">Built by Guide</p>
        <h1 className="brand-title">Free forever</h1>
        <p className="brand-lede">
          Clarify is a carefully chosen video home for Jewish and family
          viewing. No subscriptions. No paywall. Just calmer watching.
        </p>
      </header>

      <section className="brand-section">
        <h2>What Clarify is</h2>
        <p>
          A familiar video experience for content that belongs in a Jewish or
          family living room. Choose <strong>Jewish</strong> to see videos from
          Jewish creators, or <strong>Family-Friendly</strong> for a wider set
          that still aims to stay suitable for home. Browse by category, search,
          and use parental controls when you need tighter limits.
        </p>
      </section>

      <section className="brand-section">
        <h2>Choosing what to watch</h2>
        <ul className="brand-list">
          <li>
            <strong>Jewish</strong> — videos created by Jewish educators,
            musicians, organizations, and other Jewish creators.
          </li>
          <li>
            <strong>Family-Friendly</strong> — Jewish creators plus other
            suitable channels such as nature and kids learning.
          </li>
          <li>
            <strong>Categories</strong> — browse by topic. Music and News stay
            in their own sections on the home page.
          </li>
          <li>
            <strong>Parental controls</strong> — open Parental controls in the
            header to link a child’s device, turn off categories, and set daily
            time limits.
          </li>
        </ul>
      </section>

      <section className="brand-section">
        <h2>We don’t charge</h2>
        <p>
          Clarify stays free for families. If it helps your home, you can{" "}
          <Link href="/donate">donate</Link> when you’re ready. Online giving
          will be available soon. Thank you for watching — and for reporting
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
