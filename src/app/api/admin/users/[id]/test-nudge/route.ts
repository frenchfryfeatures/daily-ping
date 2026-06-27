import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { dispatchTestNudge } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "A test reason of at least 6 characters is required." }, { status: 400 });
  }

  try {
    const result = await dispatchTestNudge({
      userId: id,
      actor: "dashboard-admin",
      reason,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test nudge failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({ ok: false, error: "The production database is unavailable." }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
