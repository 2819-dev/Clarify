import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserAvatar } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  if (!z.string().uuid().safeParse(userId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const avatar = await getUserAvatar(userId);
  if (!avatar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(avatar.bytes), {
    status: 200,
    headers: {
      "Content-Type": avatar.mime,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
