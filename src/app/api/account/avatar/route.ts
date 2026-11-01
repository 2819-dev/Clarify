import { NextResponse } from "next/server";
import { getCurrentUser, saveUserAvatar } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    }
    const mime = file.type || "image/jpeg";
    const buf = Buffer.from(await file.arrayBuffer());
    const updated = await saveUserAvatar(user.id, mime, buf);
    return NextResponse.json({ user: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not upload photo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
