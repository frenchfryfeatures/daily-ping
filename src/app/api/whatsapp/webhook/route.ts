import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { extractWhatsAppInboundText } from "@/lib/domain/whatsapp";
import { envValue } from "@/lib/env";
import { handleWhatsAppInbound } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = envValue("WHATSAPP_VERIFY_TOKEN");

  if (mode === "subscribe" && challenge && (!expected || token === expected)) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const entry = body?.entry?.[0]?.changes?.[0]?.value;
  const message = entry?.messages?.[0];
  const phone = message?.from ? `+${message.from}` : body.phone;
  const text = extractWhatsAppInboundText(message) || body.body || "";

  if (!phone || !text) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await handleWhatsAppInbound({
      phone,
      body: text,
      providerMessageId: message?.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        command: "VOICE",
        response: "Demo mode handled the webhook. Attach DATABASE_URL for persistent WhatsApp state.",
      });
    }
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
