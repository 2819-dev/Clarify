import { NextResponse } from "next/server";
import {
  ageBasedDefaults,
  getParentalSettings,
  getParentalStatus,
  listChildrenForParent,
  upsertParentalSettings,
} from "@/lib/parental";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const [children, ownStatus] = await Promise.all([
      listChildrenForParent(user.id),
      getParentalStatus(user.id),
    ]);
    return NextResponse.json({
      ok: true,
      children,
      ownStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const parent = await getCurrentUser();
    if (!parent) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const body = (await request.json()) as {
      childUserId?: string;
      disabledCategories?: string[];
      totalLimitMinutes?: number | null;
      categoryLimits?: Record<string, number>;
      childAge?: number | null;
      applyAgeAssist?: boolean;
    };
    const childUserId = body.childUserId?.trim();
    if (!childUserId) {
      return NextResponse.json(
        { error: "Choose a child account before saving." },
        { status: 400 },
      );
    }

    let patch: {
      disabledCategories?: string[];
      totalLimitMinutes?: number | null;
      categoryLimits?: Record<string, number>;
      childAge?: number | null;
    } = {
      disabledCategories: body.disabledCategories,
      totalLimitMinutes: body.totalLimitMinutes,
      categoryLimits: body.categoryLimits,
      childAge: body.childAge,
    };

    let assistNote: string | null = null;
    if (body.applyAgeAssist && body.childAge && body.childAge >= 1) {
      const defaults = ageBasedDefaults(body.childAge);
      patch = {
        childAge: body.childAge,
        disabledCategories: defaults.disabledCategories,
        totalLimitMinutes: defaults.totalLimitMinutes,
        categoryLimits: defaults.categoryLimits,
      };
      assistNote = defaults.note;
    }

    const settings = await upsertParentalSettings(childUserId, parent.id, patch);
    const status = await getParentalStatus(childUserId);
    return NextResponse.json({ ok: true, settings, status, assistNote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
