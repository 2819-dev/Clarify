import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { ADMIN_ACCOUNT_EMAIL, isAdminAccountEmail } from "./admin-email";
import { getCurrentUser, getUserByEmail } from "./user-auth";
import { verifyTotpCode } from "./totp";

const COOKIE_NAME = "clarify_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function requireSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (16+ characters)");
  }
  return secret;
}

function requireAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD must be set");
  }
  return password;
}

function sign(payload: string) {
  return createHmac("sha256", requireSessionSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSession(expiresAt: number) {
  const payload = `admin:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return false;
  }

  const [role, expiresRaw] = payload.split(":");
  if (role !== "admin") return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }
  return true;
}

export function passwordsMatch(candidate: string): boolean {
  const expected = requireAdminPassword();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still do a compare to reduce trivial timing leaks on length
    timingSafeEqual(Buffer.alloc(b.length), b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = encodeSession(expiresAt);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!isAdminAccountEmail(user?.email)) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    return verifySessionToken(token);
  } catch {
    return false;
  }
}

/** Signed-in admin-account user may open /admin/login (key icon). */
export async function canAccessAdminLogin(): Promise<boolean> {
  const user = await getCurrentUser();
  return isAdminAccountEmail(user?.email);
}

export async function adminAccountRequiresTotp(): Promise<boolean> {
  const row = await getUserByEmail(ADMIN_ACCOUNT_EMAIL);
  return Boolean(row?.totp_enabled && row.totp_secret);
}

export async function elevateToAdmin(input: {
  password: string;
  totpCode?: string;
}): Promise<{ ok: true } | { ok: false; error: string; needsTotp?: boolean }> {
  const user = await getCurrentUser();
  if (!isAdminAccountEmail(user?.email)) {
    return { ok: false, error: "Admin access is limited to the Guide account." };
  }
  if (!passwordsMatch(input.password)) {
    return { ok: false, error: "Incorrect password" };
  }
  const row = await getUserByEmail(ADMIN_ACCOUNT_EMAIL);
  if (row?.totp_enabled && row.totp_secret) {
    if (!input.totpCode) {
      return {
        ok: false,
        error: "Enter your authenticator code.",
        needsTotp: true,
      };
    }
    if (!verifyTotpCode(row.totp_secret, input.totpCode, row.email)) {
      return { ok: false, error: "Invalid authenticator code.", needsTotp: true };
    }
  }
  await createAdminSession();
  return { ok: true };
}
