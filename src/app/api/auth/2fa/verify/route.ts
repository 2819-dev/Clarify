import { NextResponse } from "next/server";
import { z } from "zod";
import { completeLoginWithTotp } from "@/lib/user-auth";

const schema = z.object({
  code: z.string().min(6).max(12),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter the 6-digit authenticator code." },
        { status: 400 },
      );
    }
    const user = await completeLoginWithTotp(parsed.data.code);
    return NextResponse.json({ user });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not verify code.";
    const status = message.includes("Invalid") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
