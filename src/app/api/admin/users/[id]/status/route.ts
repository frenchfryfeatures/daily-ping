import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { changeUserStatus } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status as UserStatus;
  const reason = String(body.reason ?? "").trim();

  if (!Object.values(UserStatus).includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid user status." }, { status: 400 });
  }
  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "Reason is required for status changes." }, { status: 400 });
  }

  try {
    const user = await changeUserStatus({
      userId: params.id,
      status,
      actor: "admin",
      reason,
    });

    return NextResponse.json({ ok: true, userId: user.id, status: user.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status change failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        userId: params.id,
        status,
        next: "Demo mode: attach DATABASE_URL for persistent admin changes.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
