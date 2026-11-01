import { NextResponse } from "next/server";
import { z } from "zod";
import { elevateToAdmin } from "@/lib/auth";

const bodySchema = z.object({
  password: z.string().min(1),
  totpCode: z.string().min(6).max(12).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const result = await elevateToAdmin({
      password: parsed.data.password,
      totpCode: parsed.data.totpCode,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, needsTotp: result.needsTotp },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
