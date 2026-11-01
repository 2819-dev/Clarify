import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateUser,
  createPending2fa,
  createUserSession,
} from "@/lib/user-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter email and password." },
        { status: 400 },
      );
    }
    const user = await authenticateUser(
      parsed.data.email,
      parsed.data.password,
    );
    if (!user) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }
    if (user.totp_enabled && user.totp_secret) {
      await createPending2fa(user.id);
      return NextResponse.json({
        requires2fa: true,
        email: user.email,
      });
    }
    await createUserSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        totp_enabled: user.totp_enabled,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
