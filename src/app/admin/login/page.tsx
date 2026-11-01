import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import {
  adminAccountRequiresTotp,
  canAccessAdminLogin,
  isAdminAuthenticated,
} from "@/lib/auth";
import { ADMIN_ACCOUNT_EMAIL } from "@/lib/admin-email";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  if (!(await canAccessAdminLogin())) {
    redirect("/signin?next=%2Fadmin%2Flogin");
  }

  const needsTotp = await adminAccountRequiresTotp();

  return (
    <section className="admin-shell">
      <ClarifyLogo href="/" size="lg" />
      <h1>Admin sign-in</h1>
      <p className="lede">
        Elevate the Guide account ({ADMIN_ACCOUNT_EMAIL}) with the admin
        password
        {needsTotp ? " and authenticator code" : ""}. Viewer sign-in stays
        separate from this step.
      </p>
      <AdminLoginForm needsTotp={needsTotp} />
      <p className="auth-foot">
        <Link href="/account/security">Manage 2FA</Link>
      </p>
    </section>
  );
}
