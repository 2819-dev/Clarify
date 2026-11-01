import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSql } from "./db";
import { verifyTotpCode } from "./totp";

const USER_COOKIE = "clarify_user_session";
const PENDING_2FA_COOKIE = "clarify_2fa_pending";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PENDING_2FA_SECONDS = 60 * 5; // 5 minutes

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  totp_enabled: boolean;
};

type UserRow = AuthUser & {
  password_hash: string;
  totp_secret: string | null;
  totp_pending_secret: string | null;
};

function requireSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (16+ characters)");
  }
  return secret;
}

function sign(kind: string, payload: string) {
  return createHmac("sha256", requireSessionSecret())
    .update(`${kind}:${payload}`)
    .digest("base64url");
}

function encodeSigned(kind: string, payload: string) {
  return `${payload}.${sign(kind, payload)}`;
}

function verifySigned(kind: string, token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;
  const expected = sign(kind, payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

function encodeSession(userId: string, expiresAt: number) {
  return encodeSigned("user", `${userId}:${expiresAt}`);
}

function verifySessionToken(token: string): string | null {
  const payload = verifySigned("user", token);
  if (!payload) return null;
  const [userId, expiresRaw] = payload.split(":");
  if (!userId || !expiresRaw) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return userId;
}

function mapUser(row: {
  id: string;
  email: string;
  display_name: string;
  totp_enabled?: boolean;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    totp_enabled: Boolean(row.totp_enabled),
  };
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
  jar.delete(PENDING_2FA_COOKIE);
}

export async function clearUserSession() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
  jar.delete(PENDING_2FA_COOKIE);
}

export async function createPending2fa(userId: string) {
  const expiresAt = Date.now() + PENDING_2FA_SECONDS * 1000;
  const token = encodeSigned("2fa", `${userId}:${expiresAt}`);
  const jar = await cookies();
  jar.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_2FA_SECONDS,
  });
}

export async function getPending2faUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = verifySigned("2fa", token);
    if (!payload) return null;
    const [userId, expiresRaw] = payload.split(":");
    if (!userId || !expiresRaw) return null;
    const expiresAt = Number(expiresRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    return userId;
  } catch {
    return null;
  }
}

export async function clearPending2fa() {
  const jar = await cookies();
  jar.delete(PENDING_2FA_COOKIE);
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
    SELECT id, email, display_name, COALESCE(totp_enabled, FALSE) AS totp_enabled
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        display_name: string;
        totp_enabled: boolean;
      }
    | undefined;
  return row ? mapUser(row) : null;
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, display_name, password_hash,
           totp_secret, COALESCE(totp_enabled, FALSE) AS totp_enabled,
           totp_pending_secret
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

export async function getUserByEmail(emailRaw: string): Promise<UserRow | null> {
  const email = normalizeEmail(emailRaw);
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, display_name, password_hash,
           totp_secret, COALESCE(totp_enabled, FALSE) AS totp_enabled,
           totp_pending_secret
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return (rows[0] as UserRow | undefined) ?? null;
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
      RETURNING id, email, display_name, COALESCE(totp_enabled, FALSE) AS totp_enabled
    `;
    return mapUser(
      rows[0] as {
        id: string;
        email: string;
        display_name: string;
        totp_enabled: boolean;
      },
    );
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
): Promise<(AuthUser & { totp_secret: string | null }) | null> {
  const row = await getUserByEmail(emailRaw);
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return {
    ...mapUser(row),
    totp_secret: row.totp_secret,
  };
}

export async function completeLoginWithTotp(code: string): Promise<AuthUser> {
  const userId = await getPending2faUserId();
  if (!userId) {
    throw new Error("Sign-in expired. Enter your email and password again.");
  }
  const row = await getUserById(userId);
  if (!row?.totp_enabled || !row.totp_secret) {
    throw new Error("Two-factor authentication is not enabled for this account.");
  }
  if (!verifyTotpCode(row.totp_secret, code, row.email)) {
    throw new Error("Invalid authenticator code.");
  }
  await createUserSession(row.id);
  return mapUser(row);
}

export async function setPendingTotpSecret(userId: string, secret: string) {
  const sql = getSql();
  await sql`
    UPDATE users
    SET totp_pending_secret = ${secret}
    WHERE id = ${userId}::uuid
  `;
}

export async function enableTotp(userId: string, code: string): Promise<void> {
  const row = await getUserById(userId);
  if (!row?.totp_pending_secret) {
    throw new Error("Start 2FA setup again.");
  }
  if (!verifyTotpCode(row.totp_pending_secret, code, row.email)) {
    throw new Error("Invalid authenticator code.");
  }
  const sql = getSql();
  await sql`
    UPDATE users
    SET totp_secret = totp_pending_secret,
        totp_enabled = TRUE,
        totp_pending_secret = NULL
    WHERE id = ${userId}::uuid
  `;
}

export async function disableTotp(
  userId: string,
  password: string,
  code: string,
): Promise<void> {
  const row = await getUserById(userId);
  if (!row) throw new Error("Account not found.");
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error("Incorrect password.");
  }
  if (!row.totp_enabled || !row.totp_secret) {
    throw new Error("Two-factor authentication is not enabled.");
  }
  if (!verifyTotpCode(row.totp_secret, code, row.email)) {
    throw new Error("Invalid authenticator code.");
  }
  const sql = getSql();
  await sql`
    UPDATE users
    SET totp_secret = NULL,
        totp_enabled = FALSE,
        totp_pending_secret = NULL
    WHERE id = ${userId}::uuid
  `;
}
