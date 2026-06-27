import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { listVoiceReviewQueue } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const queue = await listVoiceReviewQueue();
    return NextResponse.json({ ok: true, queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice review queue failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        queue: [],
        next: "Demo mode: attach DATABASE_URL to load the voice review queue.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
