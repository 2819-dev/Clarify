import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createUserSession,
  registerUser,
} from "@/lib/user-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().max(80).optional(),
  username: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9._]+$/)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email and a password with at least 8 characters. A username is optional.",
        },
        { status: 400 },
      );
    }
    const user = await registerUser({
      email: parsed.data.email,
      password: parsed.data.password,
      displayName: parsed.data.displayName,
      username: parsed.data.username,
    });
    await createUserSession(user.id);
    return NextResponse.json({ user });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create account.";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
