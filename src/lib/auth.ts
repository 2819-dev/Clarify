import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

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
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    return verifySessionToken(token);
  } catch {
    return false;
  }
}
