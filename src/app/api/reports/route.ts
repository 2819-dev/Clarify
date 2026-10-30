import { NextResponse } from "next/server";
import { z } from "zod";
import { createReport } from "@/lib/reports";

const bodySchema = z.object({
  videoId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please share a short reason (at least a few words)." },
        { status: 400 },
      );
    }

    const report = await createReport(parsed.data.videoId, parsed.data.reason);
    return NextResponse.json({ ok: true, id: report.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save report";
    const status = message === "Video not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
