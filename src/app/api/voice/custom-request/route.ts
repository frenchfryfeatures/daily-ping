import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { submitCustomVoiceRequest } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId ?? "").trim();
  const label = String(body.label ?? "").trim();
  const languageCode = String(body.languageCode ?? "").trim();
  const consentEvidenceUrl = body.consentEvidenceUrl ? String(body.consentEvidenceUrl).trim() : undefined;
  const consentText = String(body.consentText ?? "").trim();
  const requester = String(body.requester ?? "admin").trim();

  if (!userId) return NextResponse.json({ ok: false, error: "userId is required." }, { status: 400 });

  try {
    const result = await submitCustomVoiceRequest({
      userId,
      label,
      languageCode,
      consentEvidenceUrl,
      consentText,
      requester,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Custom voice request failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        status: "PENDING_REVIEW",
        next: "Demo mode: attach DATABASE_URL to persist custom voice requests.",
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
