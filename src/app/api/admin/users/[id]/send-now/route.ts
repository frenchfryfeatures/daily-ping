import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { dispatchNowForUser } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const actor = String(body.actor ?? "admin").trim();
  const reason = String(body.reason ?? "").trim();

  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "A reason is required to send a nudge now." }, { status: 400 });
  }

  try {
    const result = await dispatchNowForUser({ userId: params.id, actor, reason });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send-now failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        userId: params.id,
        status: "dry_run",
        next: "Demo mode: attach DATABASE_URL for live send-now.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
