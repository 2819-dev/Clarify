import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import { ModerationProvider } from "@/components/ModerationContext";
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

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://clarify.guidelearning.org"),
  title: "Clarify — Safe videos for Jewish & family viewing",
  description:
    "A carefully selected video library for Jewish and family-friendly viewing. Built by Guide. Report anything that doesn’t belong.",
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
      className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
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
                <main className="yt-main-inner">{children}</main>
                <footer className="site-footer">
                  <ClarifyLogo size="sm" href="/" />
                  <p>
                    Clarify is a carefully selected video library from{" "}
                    <a
                      href="https://guidelearning.org"
                      rel="noopener noreferrer"
                    >
                      Guide
                    </a>
                    . See something that doesn’t belong? Use Report.
                  </p>
                </footer>
              </div>
            </div>
          </div>
        </ModerationProvider>
      </body>
    </html>
  );
}
