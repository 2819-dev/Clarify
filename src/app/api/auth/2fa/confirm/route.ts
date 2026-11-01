import { NextResponse } from "next/server";
import { z } from "zod";
import { enableTotp, getCurrentUser } from "@/lib/user-auth";

const schema = z.object({
  code: z.string().min(6).max(12),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter the 6-digit code from your authenticator app." },
        { status: 400 },
      );
    }
    await enableTotp(user.id, parsed.data.code);
    return NextResponse.json({ ok: true, totp_enabled: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Could not turn on two-factor authentication.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
