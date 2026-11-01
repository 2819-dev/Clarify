import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSql } from "./db";

const USER_COOKIE = "clarify_user_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
};

function requireSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (16+ characters)");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", requireSessionSecret())
    .update(`user:${payload}`)
    .digest("base64url");
}

function encodeSession(userId: string, expiresAt: number) {
  const payload = `${userId}:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, expiresRaw] = payload.split(":");
  if (!userId || !expiresRaw) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return userId;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createUserSession(userId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = encodeSession(userId, expiresAt);
  const jar = await cookies();
  jar.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearUserSession() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, display_name
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as AuthUser | undefined;
  return row ?? null;
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const displayName =
    input.displayName?.trim() || email.split("@")[0] || "Viewer";
  const passwordHash = hashPassword(input.password);
  const sql = getSql();
  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, display_name)
      VALUES (${email}, ${passwordHash}, ${displayName})
      RETURNING id, email, display_name
    `;
    return rows[0] as AuthUser;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("users_email_key") || message.includes("duplicate")) {
      throw new Error("An account with that email already exists.");
    }
    throw err;
  }
}

export async function authenticateUser(
  emailRaw: string,
  password: string,
): Promise<AuthUser | null> {
  const email = normalizeEmail(emailRaw);
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, display_name, password_hash
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  const row = rows[0] as
    | (AuthUser & { password_hash: string })
    | undefined;
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
  };
}
