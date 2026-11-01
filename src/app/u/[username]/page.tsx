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
      <div className="account-avatar-block" style={{ marginBottom: "0.75rem" }}>
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt=""
            width={72}
            height={72}
            className="user-avatar"
          />
        ) : (
          <span className="user-avatar user-avatar-fallback" style={{ width: 72, height: 72, fontSize: 28 }}>
            {(user.display_name[0] || "?").toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="yt-home-title" style={{ margin: 0 }}>
            {user.display_name}
          </h1>
          <p className="yt-home-sub" style={{ marginTop: "0.25rem" }}>
            {formatAt(user.username)}
          </p>
        </div>
      </div>
      <p className="auth-foot">
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}
