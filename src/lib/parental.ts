import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSql } from "./db";

export const DEVICE_KEY_COOKIE = "clarify_device_key";
export const LINK_CODE_PERIOD_SECONDS = 300; // 5 minutes

export type ParentalSettings = {
  child_user_id: string;
  disabled_categories: string[];
  total_limit_minutes: number | null;
  category_limits: Record<string, number>;
  child_age: number | null;
  updated_at?: string;
};

export type ParentalStatus = {
  isChild: boolean;
  linkedToParent: boolean;
  parentDisplayName?: string | null;
  disabledCategories: string[];
  totalLimitMinutes: number | null;
  categoryLimits: Record<string, number>;
  totalSecondsUsedToday: number;
  categorySecondsUsedToday: Record<string, number>;
  totalSecondsRemaining: number | null;
  blocked: boolean;
  blockReason: string | null;
  childAge: number | null;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (16+ characters)");
  }
  return secret;
}

function windowIndex(atMs = Date.now()) {
  return Math.floor(atMs / 1000 / LINK_CODE_PERIOD_SECONDS);
}

/** Time-windowed 8-char alphanumeric code (rotates every 5 minutes). */
export function generateLinkCode(secret: string, atMs = Date.now()): string {
  const idx = windowIndex(atMs);
  const digest = createHmac("sha256", sessionSecret())
    .update(`parental-link:${secret}:${idx}`)
    .digest("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  return digest.slice(0, 8);
}

export function verifyLinkCode(secret: string, code: string, atMs = Date.now()): boolean {
  const cleaned = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length !== 8) return false;
  for (const delta of [0, -1]) {
    const expected = generateLinkCode(secret, atMs + delta * LINK_CODE_PERIOD_SECONDS * 1000);
    const a = Buffer.from(cleaned);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function linkCodeExpiresInSeconds(atMs = Date.now()): number {
  const period = LINK_CODE_PERIOD_SECONDS;
  const elapsed = Math.floor(atMs / 1000) % period;
  return period - elapsed;
}

export function ageBasedDefaults(age: number): {
  disabledCategories: string[];
  totalLimitMinutes: number;
  categoryLimits: Record<string, number>;
  note: string;
} {
  if (age <= 6) {
    return {
      disabledCategories: ["news", "comedy", "gaming", "sports", "community"],
      totalLimitMinutes: 45,
      categoryLimits: { music: 20, stories: 30, holidays: 30, hebrew: 20 },
      note: "Ages 1–6: short sessions; News/Comedy/Gaming off; focus on Stories, Holidays, Hebrew.",
    };
  }
  if (age <= 10) {
    return {
      disabledCategories: ["news", "comedy"],
      totalLimitMinutes: 75,
      categoryLimits: { music: 30, gaming: 20, sports: 20 },
      note: "Ages 7–10: News & Comedy off; moderate Music/Gaming; ~75 min/day total.",
    };
  }
  if (age <= 13) {
    return {
      disabledCategories: [],
      totalLimitMinutes: 120,
      categoryLimits: { news: 20, gaming: 40 },
      note: "Ages 11–13: News limited to 20 min; Gaming 40 min; ~2 hours/day total.",
    };
  }
  return {
    disabledCategories: [],
    totalLimitMinutes: 180,
    categoryLimits: { news: 40 },
    note: "Ages 14–17: light News cap; ~3 hours/day total. Adjust as needed.",
  };
}

export async function getOrCreateDevicePair(input: {
  deviceKey?: string | null;
  childUserId?: string | null;
  label?: string;
}): Promise<{ deviceKey: string; secret: string; code: string; expiresIn: number }> {
  const sql = getSql();
  let deviceKey = input.deviceKey?.trim() || "";
  if (!deviceKey) {
    deviceKey = randomBytes(16).toString("hex");
  }

  const existing = await sql`
    SELECT device_key, secret, child_user_id
    FROM parental_device_pairs
    WHERE device_key = ${deviceKey}
      AND expires_at > NOW()
    LIMIT 1
  `;
  if (existing[0]) {
    const row = existing[0] as { device_key: string; secret: string };
    if (input.childUserId) {
      await sql`
        UPDATE parental_device_pairs
        SET child_user_id = ${input.childUserId}::uuid
        WHERE device_key = ${deviceKey}
          AND child_user_id IS NULL
      `;
    }
    return {
      deviceKey: row.device_key,
      secret: row.secret,
      code: generateLinkCode(row.secret),
      expiresIn: linkCodeExpiresInSeconds(),
    };
  }

  const secret = randomBytes(24).toString("base64url");
  const childId = input.childUserId || null;
  if (childId) {
    await sql`
      INSERT INTO parental_device_pairs (device_key, child_user_id, secret, label)
      VALUES (${deviceKey}, ${childId}::uuid, ${secret}, ${input.label || "Child device"})
      ON CONFLICT (device_key) DO UPDATE SET
        secret = EXCLUDED.secret,
        child_user_id = COALESCE(parental_device_pairs.child_user_id, EXCLUDED.child_user_id),
        expires_at = NOW() + INTERVAL '7 days'
    `;
  } else {
    await sql`
      INSERT INTO parental_device_pairs (device_key, child_user_id, secret, label)
      VALUES (${deviceKey}, NULL, ${secret}, ${input.label || "Child device"})
      ON CONFLICT (device_key) DO UPDATE SET
        secret = EXCLUDED.secret,
        expires_at = NOW() + INTERVAL '7 days'
    `;
  }
  return {
    deviceKey,
    secret,
    code: generateLinkCode(secret),
    expiresIn: linkCodeExpiresInSeconds(),
  };
}

export async function getDevicePairByKey(deviceKey: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, device_key, secret, child_user_id, label
    FROM parental_device_pairs
    WHERE device_key = ${deviceKey}
      AND expires_at > NOW()
    LIMIT 1
  `;
  return (rows[0] as
    | {
        id: string;
        device_key: string;
        secret: string;
        child_user_id: string | null;
        label: string;
      }
    | undefined) ?? null;
}

export async function findPairByLinkCode(code: string) {
  const sql = getSql();
  const pairs = await sql`
    SELECT id, device_key, secret, child_user_id, label
    FROM parental_device_pairs
    WHERE expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 200
  `;
  for (const row of pairs as {
    id: string;
    device_key: string;
    secret: string;
    child_user_id: string | null;
    label: string;
  }[]) {
    if (verifyLinkCode(row.secret, code)) return row;
  }
  return null;
}

export async function linkParentToChild(parentUserId: string, childUserId: string) {
  if (parentUserId === childUserId) {
    throw new Error("You can’t link an account to itself.");
  }
  const sql = getSql();
  // A child may only have one parent link for simplicity.
  await sql`
    DELETE FROM parent_child_links WHERE child_user_id = ${childUserId}::uuid
  `;
  await sql`
    INSERT INTO parent_child_links (parent_user_id, child_user_id)
    VALUES (${parentUserId}::uuid, ${childUserId}::uuid)
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO parental_settings (child_user_id)
    VALUES (${childUserId}::uuid)
    ON CONFLICT (child_user_id) DO NOTHING
  `;
}

export async function listChildrenForParent(parentUserId: string) {
  const sql = getSql();
  return (await sql`
    SELECT u.id, u.email, u.display_name, u.username, l.linked_at,
           ps.disabled_categories, ps.total_limit_minutes, ps.category_limits, ps.child_age
    FROM parent_child_links l
    INNER JOIN users u ON u.id = l.child_user_id
    LEFT JOIN parental_settings ps ON ps.child_user_id = u.id
    WHERE l.parent_user_id = ${parentUserId}::uuid
    ORDER BY l.linked_at DESC
  `) as Array<{
    id: string;
    email: string;
    display_name: string;
    username: string | null;
    linked_at: string;
    disabled_categories: string[] | null;
    total_limit_minutes: number | null;
    category_limits: Record<string, number> | null;
    child_age: number | null;
  }>;
}

export async function getParentForChild(childUserId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT u.id, u.display_name, u.email, u.username
    FROM parent_child_links l
    INNER JOIN users u ON u.id = l.parent_user_id
    WHERE l.child_user_id = ${childUserId}::uuid
    LIMIT 1
  `;
  return (rows[0] as
    | { id: string; display_name: string; email: string; username: string | null }
    | undefined) ?? null;
}

export async function getParentalSettings(childUserId: string): Promise<ParentalSettings | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT child_user_id, disabled_categories, total_limit_minutes,
           category_limits, child_age, updated_at
    FROM parental_settings
    WHERE child_user_id = ${childUserId}::uuid
    LIMIT 1
  `;
  const row = rows[0] as
    | {
        child_user_id: string;
        disabled_categories: string[] | null;
        total_limit_minutes: number | null;
        category_limits: Record<string, number> | null;
        child_age: number | null;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    child_user_id: row.child_user_id,
    disabled_categories: row.disabled_categories || [],
    total_limit_minutes: row.total_limit_minutes,
    category_limits: row.category_limits || {},
    child_age: row.child_age,
    updated_at: row.updated_at,
  };
}

export async function upsertParentalSettings(
  childUserId: string,
  parentUserId: string,
  patch: {
    disabledCategories?: string[];
    totalLimitMinutes?: number | null;
    categoryLimits?: Record<string, number>;
    childAge?: number | null;
  },
) {
  const sql = getSql();
  const link = await sql`
    SELECT 1 FROM parent_child_links
    WHERE parent_user_id = ${parentUserId}::uuid
      AND child_user_id = ${childUserId}::uuid
    LIMIT 1
  `;
  if (!link.length) throw new Error("That child isn’t linked to your account.");

  const current = (await getParentalSettings(childUserId)) || {
    child_user_id: childUserId,
    disabled_categories: [],
    total_limit_minutes: null,
    category_limits: {},
    child_age: null,
  };

  const disabled =
    patch.disabledCategories ?? current.disabled_categories;
  const total =
    patch.totalLimitMinutes === undefined
      ? current.total_limit_minutes
      : patch.totalLimitMinutes;
  const limits = patch.categoryLimits ?? current.category_limits;
  const age =
    patch.childAge === undefined ? current.child_age : patch.childAge;

  await sql`
    INSERT INTO parental_settings (
      child_user_id, disabled_categories, total_limit_minutes,
      category_limits, child_age, updated_at, updated_by
    )
    VALUES (
      ${childUserId}::uuid,
      ${disabled},
      ${total},
      ${JSON.stringify(limits)}::jsonb,
      ${age},
      NOW(),
      ${parentUserId}::uuid
    )
    ON CONFLICT (child_user_id) DO UPDATE SET
      disabled_categories = EXCLUDED.disabled_categories,
      total_limit_minutes = EXCLUDED.total_limit_minutes,
      category_limits = EXCLUDED.category_limits,
      child_age = EXCLUDED.child_age,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by
  `;
  return getParentalSettings(childUserId);
}

export async function recordParentalUsage(
  childUserId: string,
  seconds: number,
  categorySlug?: string | null,
) {
  if (seconds <= 0) return;
  const sql = getSql();
  const cat = categorySlug?.trim().toLowerCase() || null;
  await sql`
    INSERT INTO parental_usage (child_user_id, usage_date, total_seconds, category_seconds)
    VALUES (
      ${childUserId}::uuid,
      CURRENT_DATE,
      ${seconds},
      ${cat ? JSON.stringify({ [cat]: seconds }) : "{}"}::jsonb
    )
    ON CONFLICT (child_user_id, usage_date) DO UPDATE SET
      total_seconds = parental_usage.total_seconds + EXCLUDED.total_seconds,
      category_seconds = CASE
        WHEN ${cat}::text IS NULL THEN parental_usage.category_seconds
        ELSE jsonb_set(
          parental_usage.category_seconds,
          ARRAY[${cat}::text],
          to_jsonb(
            COALESCE((parental_usage.category_seconds ->> ${cat})::int, 0)
            + ${seconds}
          ),
          true
        )
      END,
      updated_at = NOW()
  `;
}

export async function getParentalStatus(childUserId: string): Promise<ParentalStatus> {
  const [settings, parent, usageRows] = await Promise.all([
    getParentalSettings(childUserId),
    getParentForChild(childUserId),
    (async () => {
      const sql = getSql();
      return sql`
        SELECT total_seconds, category_seconds
        FROM parental_usage
        WHERE child_user_id = ${childUserId}::uuid
          AND usage_date = CURRENT_DATE
        LIMIT 1
      `;
    })(),
  ]);

  const usage = usageRows[0] as
    | { total_seconds: number; category_seconds: Record<string, number> }
    | undefined;
  const totalUsed = Number(usage?.total_seconds ?? 0);
  const categoryUsed = usage?.category_seconds || {};
  const totalLimit = settings?.total_limit_minutes ?? null;
  const totalRemaining =
    totalLimit == null ? null : Math.max(0, totalLimit * 60 - totalUsed);

  let blocked = false;
  let blockReason: string | null = null;
  if (totalRemaining !== null && totalRemaining <= 0) {
    blocked = true;
    blockReason = "Daily time limit reached.";
  }

  return {
    isChild: Boolean(parent || settings),
    linkedToParent: Boolean(parent),
    parentDisplayName: parent?.display_name ?? null,
    disabledCategories: settings?.disabled_categories || [],
    totalLimitMinutes: totalLimit,
    categoryLimits: settings?.category_limits || {},
    totalSecondsUsedToday: totalUsed,
    categorySecondsUsedToday: categoryUsed,
    totalSecondsRemaining: totalRemaining,
    blocked,
    blockReason,
    childAge: settings?.child_age ?? null,
  };
}

export async function readDeviceKeyCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(DEVICE_KEY_COOKIE)?.value ?? null;
}
