import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { approveVoiceProfile } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const actor = String(body.actor ?? "admin").trim();
  const reason = String(body.reason ?? "").trim();

  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "A reason is required to approve a custom voice." }, { status: 400 });
  }

  try {
    const result = await approveVoiceProfile({ voiceProfileId: params.id, actor, reason });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice approval failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        voiceProfileId: params.id,
        status: "APPROVED",
        next: "Demo mode: attach DATABASE_URL for persistent voice approvals.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
