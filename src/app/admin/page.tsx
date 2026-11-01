import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { AdminReportActions } from "@/components/AdminReportActions";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import { isAdminAuthenticated } from "@/lib/auth";
import { listPendingReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const reports = await listPendingReports();

  return (
    <section className="admin-shell">
      <ClarifyLogo href="/" size="md" />
      <div className="admin-top">
        <div>
          <h1>Report review</h1>
          <p className="lede">
            Approve removes the video from the catalog. Deny keeps it up. While
            signed in as the Guide account you can also use ⋯ menus on videos,
            channels, and comments across the site.
          </p>
        </div>
        <AdminLogoutButton />
      </div>

      <p className="admin-mod-hint">
        <Link href="/">Browse catalog</Link>
        {" · "}
        <Link href="/channels">Channels</Link>
        {" · "}
        <Link href="/account/security">2FA security</Link>
      </p>

      {reports.length === 0 ? (
        <p className="empty-state">
          No pending reports.{" "}
          <Link href="/">Return to catalog</Link>
        </p>
      ) : (
        <div className="report-list">
          {reports.map((report) => {
            const thumb =
              report.thumbnail_url ??
              `https://i.ytimg.com/vi/${report.youtube_id}/hqdefault.jpg`;
            return (
              <article key={report.id} className="report-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" />
                <div>
                  <h3>{report.video_title}</h3>
                  <p className="reason">{report.reason}</p>
                  <p className="when">
                    Reported {new Date(report.created_at).toLocaleString()}
                  </p>
                  <AdminReportActions reportId={report.id} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
