import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getChannelByUsername } from "@/lib/channels";
import { getContentMode } from "@/lib/content-mode-server";
import { getPublicUserByUsername } from "@/lib/user-auth";
import { formatAt, normalizeUsername } from "@/lib/usernames";

export const dynamic = "force-dynamic";

export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (!username) notFound();

  const mode = await getContentMode();
  const channel = await getChannelByUsername(username, mode);
  if (channel) {
    redirect(`/channels/${channel.slug}`);
  }

  const user = await getPublicUserByUsername(username);
  if (!user) notFound();

  return (
    <section className="auth-shell">
      <p className="eyebrow">Viewer</p>
      <h1 className="yt-home-title">{user.display_name}</h1>
      <p className="yt-home-sub">{formatAt(user.username)}</p>
      <p className="auth-foot">
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}
