import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <section className="admin-shell">
      <h1>Admin sign-in</h1>
      <p className="lede">
        Password-only access for reviewing reports. No public accounts.
      </p>
      <AdminLoginForm />
    </section>
  );
}
