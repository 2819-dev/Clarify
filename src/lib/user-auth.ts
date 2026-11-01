import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSql } from "./db";
import { verifyTotpCode } from "./totp";
import {
  isValidUsername,
  normalizeUsername,
  usernameFromEmail,
} from "./usernames";

const USER_COOKIE = "clarify_user_session";
const PENDING_2FA_COOKIE = "clarify_2fa_pending";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PENDING_2FA_SECONDS = 60 * 5; // 5 minutes

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  totp_enabled: boolean;
  avatar_url: string | null;
};

type UserRow = AuthUser & {
  password_hash: string;
  totp_secret: string | null;
  totp_pending_secret: string | null;
  has_avatar?: boolean;
  avatar_updated_at?: string | null;
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
  username?: string | null;
  totp_enabled?: boolean;
  has_avatar?: boolean;
  avatar_updated_at?: string | null;
}): AuthUser {
  const hasAvatar = Boolean(row.has_avatar);
  const version = row.avatar_updated_at
    ? new Date(row.avatar_updated_at).getTime()
    : 0;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    username: row.username ?? null,
    totp_enabled: Boolean(row.totp_enabled),
    avatar_url: hasAvatar
      ? `/api/avatars/${row.id}${version ? `?v=${version}` : ""}`
      : null,
  };
}

async function allocateUsername(preferred: string): Promise<string> {
  const sql = getSql();
  const base = isValidUsername(preferred)
    ? preferred
    : usernameFromEmail(`${preferred}@x`);
  for (let i = 0; i < 12; i++) {
    const candidate =
      i === 0 ? base : normalizeUsername(`${base}${i + 1}`) || `user${i + 1}`;
    const rows = await sql`
      SELECT 1 FROM users WHERE lower(username) = ${candidate} LIMIT 1
    `;
    if (rows.length === 0) return candidate;
  }
  return normalizeUsername(`u${randomBytes(4).toString("hex")}`) || "viewer";
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
    SELECT id, email, display_name, username,
           COALESCE(totp_enabled, FALSE) AS totp_enabled,
           (avatar_bytes IS NOT NULL) AS has_avatar,
           avatar_updated_at
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        display_name: string;
        username: string | null;
        totp_enabled: boolean;
        has_avatar: boolean;
        avatar_updated_at: string | null;
      }
    | undefined;
  return row ? mapUser(row) : null;
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, display_name, username, password_hash,
           totp_secret, COALESCE(totp_enabled, FALSE) AS totp_enabled,
           totp_pending_secret,
           (avatar_bytes IS NOT NULL) AS has_avatar,
           avatar_updated_at
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
    SELECT id, email, display_name, username, password_hash,
           totp_secret, COALESCE(totp_enabled, FALSE) AS totp_enabled,
           totp_pending_secret,
           (avatar_bytes IS NOT NULL) AS has_avatar,
           avatar_updated_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return (rows[0] as UserRow | undefined) ?? null;
}

export async function getPublicUserByUsername(usernameRaw: string) {
  const username = normalizeUsername(usernameRaw);
  if (!username) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, display_name, username,
           COALESCE(totp_enabled, FALSE) AS totp_enabled,
           (avatar_bytes IS NOT NULL) AS has_avatar,
           avatar_updated_at
    FROM users
    WHERE lower(username) = ${username}
    LIMIT 1
  `;
  const row = rows[0] as
    | {
        id: string;
        email: string;
        display_name: string;
        username: string | null;
        totp_enabled: boolean;
        has_avatar: boolean;
        avatar_updated_at: string | null;
      }
    | undefined;
  return row ? mapUser(row) : null;
}

export async function updateUserProfile(
  userId: string,
  input: { displayName?: string; username?: string },
): Promise<AuthUser> {
  const sql = getSql();
  const current = await getUserById(userId);
  if (!current) throw new Error("Account not found.");

  let nextUsername = current.username;
  if (input.username !== undefined) {
    const normalized = normalizeUsername(input.username);
    if (!isValidUsername(normalized)) {
      throw new Error("Usernames use letters, numbers, dots, and underscores.");
    }
    const taken = await sql`
      SELECT 1 FROM users
      WHERE lower(username) = ${normalized}
        AND id <> ${userId}::uuid
      LIMIT 1
    `;
    if (taken.length > 0) throw new Error("That username is taken.");
    nextUsername = normalized;
  }

  const nextDisplay =
    input.displayName !== undefined
      ? input.displayName.trim().slice(0, 80) || current.display_name
      : current.display_name;

  const rows = await sql`
    UPDATE users
    SET display_name = ${nextDisplay},
        username = ${nextUsername}
    WHERE id = ${userId}::uuid
    RETURNING id, email, display_name, username,
              COALESCE(totp_enabled, FALSE) AS totp_enabled,
              (avatar_bytes IS NOT NULL) AS has_avatar,
              avatar_updated_at
  `;
  return mapUser(
    rows[0] as {
      id: string;
      email: string;
      display_name: string;
      username: string | null;
      totp_enabled: boolean;
      has_avatar: boolean;
      avatar_updated_at: string | null;
    },
  );
}

export async function saveUserAvatar(
  userId: string,
  mime: string,
  bytes: Buffer,
): Promise<AuthUser> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    throw new Error("Use a JPEG, PNG, or WebP image.");
  }
  if (bytes.length < 32 || bytes.length > 900_000) {
    throw new Error("Image must be under ~900KB.");
  }
  const sql = getSql();
  // neon serverless accepts Uint8Array for BYTEA
  const payload = Uint8Array.from(bytes);
  await sql`
    UPDATE users
    SET avatar_mime = ${mime},
        avatar_bytes = ${payload},
        avatar_updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;
  const user = await getCurrentUser();
  if (!user || user.id !== userId) {
    const rows = await sql`
      SELECT id, email, display_name, username,
             COALESCE(totp_enabled, FALSE) AS totp_enabled,
             (avatar_bytes IS NOT NULL) AS has_avatar,
             avatar_updated_at
      FROM users WHERE id = ${userId}::uuid LIMIT 1
    `;
    return mapUser(
      rows[0] as {
        id: string;
        email: string;
        display_name: string;
        username: string | null;
        totp_enabled: boolean;
        has_avatar: boolean;
        avatar_updated_at: string | null;
      },
    );
  }
  return user;
}

export async function getUserAvatar(
  userId: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT avatar_mime, avatar_bytes
    FROM users
    WHERE id = ${userId}::uuid
      AND avatar_bytes IS NOT NULL
    LIMIT 1
  `;
  const row = rows[0] as
    | { avatar_mime: string | null; avatar_bytes: ArrayBuffer | Buffer | string }
    | undefined;
  if (!row?.avatar_bytes || !row.avatar_mime) return null;
  const bytes = Buffer.isBuffer(row.avatar_bytes)
    ? row.avatar_bytes
    : typeof row.avatar_bytes === "string"
      ? Buffer.from(row.avatar_bytes, "base64")
      : Buffer.from(row.avatar_bytes);
  return { mime: row.avatar_mime, bytes };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
  username?: string;
}): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const displayName =
    input.displayName?.trim() || email.split("@")[0] || "Viewer";
  const preferred = input.username?.trim()
    ? normalizeUsername(input.username)
    : usernameFromEmail(email);
  const username = await allocateUsername(preferred);
  const passwordHash = hashPassword(input.password);
  const sql = getSql();
  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, display_name, username)
      VALUES (${email}, ${passwordHash}, ${displayName}, ${username})
      RETURNING id, email, display_name, username,
                COALESCE(totp_enabled, FALSE) AS totp_enabled,
                FALSE AS has_avatar,
                NULL::timestamptz AS avatar_updated_at
    `;
    return mapUser(
      rows[0] as {
        id: string;
        email: string;
        display_name: string;
        username: string | null;
        totp_enabled: boolean;
        has_avatar: boolean;
        avatar_updated_at: string | null;
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
