import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
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
      <h1 className="yt-home-title">Create account</h1>
      <p className="yt-home-sub">
        Create an account with email and password to subscribe, like, and
        comment.
      </p>
      <SignUpForm nextPath={nextPath} />
      <p className="auth-foot">
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}
