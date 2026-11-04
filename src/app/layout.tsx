import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ModerationProvider } from "@/components/ModerationContext";
import { ChildRestrictionBanner } from "@/components/ChildRestrictionBanner";
import { PrefsHydrator } from "@/components/PrefsHydrator";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteSidebar } from "@/components/SiteSidebar";
import { listCategories } from "@/lib/categories";
import { getContentMode } from "@/lib/content-mode-server";
import { isAdminAccountEmail } from "@/lib/admin-email";
import { listSubscribedChannels } from "@/lib/engagement";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { getCurrentUser } from "@/lib/user-auth";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://clarify.guidelearning.org"),
  title: "Clarify — Jewish and family-friendly videos",
  description:
    "A free video library for Jewish and family-friendly viewing. Built by Guide.",
  icons: {
    icon: [{ url: "/clarify-mark.svg", type: "image/svg+xml" }],
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const contentMode = await getContentMode();
  const user = await getCurrentUser();
  const canModerate = isAdminAccountEmail(user?.email);
  const [categories, subscribedChannels] = await Promise.all([
    listCategories(contentMode),
    user
      ? listSubscribedChannels(user.id, contentMode !== "filtered")
      : Promise.resolve([]),
  ]);

  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <PrefsHydrator />
        <ModerationProvider canModerate={canModerate}>
          <div className="yt-app">
            <SiteHeader
              initialMode={contentMode}
              user={user}
              showAdminKey={canModerate}
            />
            <div className="yt-body">
              <Suspense fallback={<aside className="yt-sidebar" aria-hidden />}>
                <SiteSidebar
                  categories={categories}
                  subscribedChannels={subscribedChannels}
                  signedIn={Boolean(user)}
                  initialMode={contentMode}
                />
              </Suspense>
              <div className="yt-main">
                <ChildRestrictionBanner />
                <main className="yt-main-inner">{children}</main>
                <footer className="site-footer">
                  <nav className="site-footer-nav" aria-label="About Clarify">
                    <a href="/about">About</a>
                    <a href="/donate">Donate</a>
                    <a
                      href="https://guidelearning.org"
                      rel="noopener noreferrer"
                    >
                      Guide
                    </a>
                  </nav>
                  <p>Clarify by Guide — free forever for every family.</p>
                </footer>
              </div>
            </div>
          </div>
        </ModerationProvider>
      </body>
    </html>
  );
}
