import { NextResponse } from "next/server";
import { envValue } from "@/lib/env";

export const runtime = "nodejs";

async function graphGet(path: string, token: string, version: string) {
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return response.json();
}

export async function GET() {
  const token = envValue("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = envValue("WHATSAPP_PHONE_NUMBER_ID");
  const version = envValue("WHATSAPP_GRAPH_VERSION") || "v25.0";

  if (!token || !phoneNumberId) {
    return NextResponse.json({ ok: false, error: "Missing WhatsApp credentials." }, { status: 503 });
  }

  const phone = await graphGet(
    `${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,whatsapp_business_account{id,name}`,
    token,
    version,
  );
  const wabaId = (phone as { whatsapp_business_account?: { id?: string } }).whatsapp_business_account?.id;
  const templates = wabaId
    ? await graphGet(`${wabaId}/message_templates?fields=name,status,language,category&limit=50`, token, version)
    : null;

  return NextResponse.json({
    ok: true,
    phoneNumberId,
    configuredTemplateName: envValue("WHATSAPP_DAILY_TEMPLATE_NAME") || "daily_dose_ready_v1",
    configuredLanguage: envValue("WHATSAPP_DAILY_TEMPLATE_LANGUAGE") || "en_US",
    phone,
    templates: (templates as { data?: unknown[] })?.data ?? templates,
  });
}
