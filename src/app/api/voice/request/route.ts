import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { requestVoiceForUser } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestVoiceForUser({
      phone: body.phone,
      userId: body.userId,
      briefId: body.briefId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice request failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        status: "voice_sent",
        jobId: "demo-voice-job",
        briefId: "demo-brief",
        next: "Demo mode: attach DATABASE_URL for persistent voice requests.",
      });
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
