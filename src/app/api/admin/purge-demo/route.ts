import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { purgeDemoUsers } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const actor = String(body.actor ?? "admin").trim();
  const reason = String(body.reason ?? "").trim();

  if (reason.length < 6) {
    return NextResponse.json({ ok: false, error: "A reason is required to purge demo data." }, { status: 400 });
  }

  try {
    const result = await purgeDemoUsers({ actor, reason });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purge failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({ ok: true, demo: true, deletedCount: 0, next: "Demo mode: attach DATABASE_URL to purge." });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
