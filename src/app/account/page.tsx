import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsForm } from "@/components/AccountSettingsForm";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=%2Faccount");

  return (
    <section className="auth-shell auth-shell-wide">
      <p className="eyebrow">Account</p>
      <h1 className="yt-home-title">Settings</h1>
      <p className="yt-home-sub">
        Photo, display name, and @username — shown on comments and your
        profile.
      </p>
      <AccountSettingsForm
        initial={{
          display_name: user.display_name,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
        }}
      />
      <p className="auth-foot">
        <Link href="/account/security">Security / 2FA</Link>
        {" · "}
        <Link href="/">Home</Link>
      </p>
    </section>
  );
}
