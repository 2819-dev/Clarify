import Link from "next/link";
import { redirect } from "next/navigation";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?next=%2Faccount%2Fsecurity");
  }

  return (
    <section className="auth-shell auth-shell-wide">
      <p className="eyebrow">Account</p>
      <h1 className="yt-home-title">Security</h1>
      <p className="yt-home-sub">
        Signed in as <strong>{user.email}</strong>. Protect subscribe, like,
        comment, and (for the Guide account) admin elevation with an
        authenticator app.
      </p>
      <TwoFactorSetup initiallyEnabled={user.totp_enabled} />
      <p className="auth-foot">
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}
