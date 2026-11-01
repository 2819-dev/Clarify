/** Only this signed-in account may see the admin key / elevate to admin. */
export const ADMIN_ACCOUNT_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
  "guidelearning.skyrocket801@passmail.net";

export function isAdminAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_ACCOUNT_EMAIL;
}
