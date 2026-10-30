import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Clarify — Safe videos for Jewish & family viewing",
  description:
    "A curated video catalog focused on Jewish content and otherwise family-safe viewing. Report anything that doesn’t belong.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="shell">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="site-footer">
            Clarify keeps a hand-curated catalog. Spot something off? Use Report.
          </footer>
        </div>
      </body>
    </html>
  );
}
