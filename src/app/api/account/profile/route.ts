import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, updateUserProfile } from "@/lib/user-auth";

const schema = z.object({
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile fields." }, { status: 400 });
    }
    const updated = await updateUserProfile(user.id, {
      displayName: parsed.data.displayName,
      username: parsed.data.username,
    });
    return NextResponse.json({ user: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
