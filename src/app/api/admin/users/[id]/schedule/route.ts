import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { changeUserSchedule } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const timezone = String(body.timezone ?? "").trim();
  const preferredSendTime = String(body.preferredSendTime ?? "").trim();
  const reason = String(body.reason ?? "").trim();

  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "Reason is required for schedule changes." }, { status: 400 });
  }

  try {
    const user = await changeUserSchedule({
      userId: params.id,
      timezone,
      preferredSendTime,
      actor: "admin",
      reason,
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      timezone: user.timezone,
      preferredSendTime: user.preferredSendTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule change failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        userId: params.id,
        timezone,
        preferredSendTime,
        next: "Demo mode: attach DATABASE_URL for persistent schedule changes.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
