import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, passwordsMatch } from "@/lib/auth";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    if (!passwordsMatch(parsed.data.password)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
