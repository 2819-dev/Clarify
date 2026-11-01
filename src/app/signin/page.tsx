import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/";
  const user = await getCurrentUser();
  if (user) redirect(nextPath);

  return (
    <section className="auth-shell">
      <p className="eyebrow">Account</p>
      <h1 className="yt-home-title">Sign in</h1>
      <p className="yt-home-sub">
        Sign in to subscribe, like videos, and join the conversation.
      </p>
      <SignInForm nextPath={nextPath} />
      <p className="auth-foot">
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}
