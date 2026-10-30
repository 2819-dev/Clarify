import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { approveReport, denyReport } from "@/lib/reports";

const bodySchema = z.object({
  action: z.enum(["approve", "deny"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (parsed.data.action === "approve") {
      await approveReport(id);
    } else {
      await denyReport(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update report";
    const status =
      message === "Report not found"
        ? 404
        : message === "Report already reviewed"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
