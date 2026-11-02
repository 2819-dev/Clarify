import { NextResponse } from "next/server";
import {
  DEVICE_KEY_COOKIE,
  getOrCreateDevicePair,
} from "@/lib/parental";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      deviceKey?: string;
      asChildDevice?: boolean;
    };
    const user = await getCurrentUser();
    const pair = await getOrCreateDevicePair({
      deviceKey: body.deviceKey,
      childUserId: body.asChildDevice ? user?.id ?? null : user?.id ?? null,
      label: body.asChildDevice ? "Child device" : "Device",
    });

    const res = NextResponse.json({
      ok: true,
      code: pair.code,
      expiresIn: pair.expiresIn,
      deviceKey: pair.deviceKey,
      periodSeconds: 300,
      signedIn: Boolean(user),
      message:
        "Show this code to a parent. It refreshes every 5 minutes.",
    });
    res.cookies.set(DEVICE_KEY_COOKIE, pair.deviceKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const deviceKey =
      url.searchParams.get("deviceKey") ||
      (await import("@/lib/parental").then((m) => m.readDeviceKeyCookie()));
    const user = await getCurrentUser();
    const pair = await getOrCreateDevicePair({
      deviceKey,
      childUserId: user?.id ?? null,
    });
    const res = NextResponse.json({
      ok: true,
      code: pair.code,
      expiresIn: pair.expiresIn,
      deviceKey: pair.deviceKey,
      periodSeconds: 300,
    });
    res.cookies.set(DEVICE_KEY_COOKIE, pair.deviceKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
