import { NextResponse } from "next/server";
import { z } from "zod";
import { disableTotp, getCurrentUser } from "@/lib/user-auth";

const schema = z.object({
  password: z.string().min(1),
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
        { error: "Password and authenticator code required." },
        { status: 400 },
      );
    }
    await disableTotp(user.id, parsed.data.password, parsed.data.code);
    return NextResponse.json({ ok: true, totp_enabled: false });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not disable 2FA.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
