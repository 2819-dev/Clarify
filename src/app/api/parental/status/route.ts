import { NextResponse } from "next/server";
import { getParentalStatus, recordParentalUsage } from "@/lib/parental";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: true, status: null });
    }
    const status = await getParentalStatus(user.id);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const body = (await request.json()) as {
      seconds?: number;
      categorySlug?: string;
    };
    const seconds = Math.min(Math.max(Number(body.seconds) || 0, 0), 120);
    if (seconds > 0) {
      await recordParentalUsage(user.id, seconds, body.categorySlug);
    }
    const status = await getParentalStatus(user.id);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
