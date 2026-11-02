import { NextResponse } from "next/server";
import {
  findPairByLinkCode,
  linkParentToChild,
} from "@/lib/parental";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parent = await getCurrentUser();
    if (!parent) {
      return NextResponse.json({ error: "Sign in as a parent first." }, { status: 401 });
    }
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim() || "";
    if (!code) {
      return NextResponse.json({ error: "Enter the child’s linking code." }, { status: 400 });
    }
    const pair = await findPairByLinkCode(code);
    if (!pair) {
      return NextResponse.json(
        { error: "That code isn’t valid or has expired. Ask the child device to refresh." },
        { status: 400 },
      );
    }
    if (!pair.child_user_id) {
      return NextResponse.json(
        {
          error:
            "The child device must be signed in to a Clarify account before linking.",
        },
        { status: 400 },
      );
    }
    if (pair.child_user_id === parent.id) {
      return NextResponse.json(
        { error: "Open the people icon on the child’s account to get a code." },
        { status: 400 },
      );
    }
    await linkParentToChild(parent.id, pair.child_user_id);
    return NextResponse.json({ ok: true, childUserId: pair.child_user_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Link failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
