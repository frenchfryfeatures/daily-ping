import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { retryDeliveryJob } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();

  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "Reason is required for manual retry." }, { status: 400 });
  }

  try {
    const result = await retryDeliveryJob({
      jobId: params.id,
      actor: "admin",
      reason,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        status: "retry_queued",
        jobId: params.id,
        next: "Demo mode: attach DATABASE_URL for persistent retries.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
