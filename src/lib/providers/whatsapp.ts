import "server-only";

import { buildDailyNudgePayload } from "@/lib/domain/whatsapp";
import { envValue } from "@/lib/env";

export type WhatsAppSendResult = {
  ok: boolean;
  provider: string;
  status: number;
  providerMessageId: string | null;
  payload: Record<string, unknown>;
  response: Record<string, unknown> | null;
  error: string | null;
  dryRun: boolean;
};

function normalizeTo(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function liveSendsEnabled() {
  return envValue("PILOT_LIVE_SENDS_ENABLED")?.toLowerCase() === "true";
}

function dryRunResult(payload: Record<string, unknown>, kind: string, reason: string): WhatsAppSendResult {
  return {
    ok: true,
    provider: "whatsapp-cloud-api",
    status: 200,
    providerMessageId: `dryrun.${kind}.${Date.now()}`,
    payload,
    response: { dryRun: true, accepted: true, reason },
    error: null,
    dryRun: true,
  };
}

async function postWhatsAppJson(path: string, payload: Record<string, unknown>) {
  const token = envValue("WHATSAPP_ACCESS_TOKEN");
  const version = envValue("WHATSAPP_GRAPH_VERSION") || "v25.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  return { response, data };
}

export async function sendDailyNudgeTemplate(input: {
  to: string;
  name: string;
  dateKey: string;
}): Promise<WhatsAppSendResult> {
  const token = envValue("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = envValue("WHATSAPP_PHONE_NUMBER_ID");
  const payload = buildDailyNudgePayload({
    to: input.to,
    name: input.name,
    dateKey: input.dateKey,
    templateName: envValue("WHATSAPP_DAILY_TEMPLATE_NAME") || "daily_dose_ready_v1",
    languageCode: envValue("WHATSAPP_DAILY_TEMPLATE_LANGUAGE") || "en_US",
  });

  if (!token || !phoneNumberId || !liveSendsEnabled()) {
    return dryRunResult(
      payload,
      "nudge",
      !token || !phoneNumberId ? "WhatsApp credentials are incomplete." : "PILOT_LIVE_SENDS_ENABLED is not true.",
    );
  }

  const { response, data } = await postWhatsAppJson(`${phoneNumberId}/messages`, payload);
  return {
    ok: response.ok,
    provider: "whatsapp-cloud-api",
    status: response.status,
    providerMessageId: data.messages?.[0]?.id ?? null,
    payload,
    response: data as Record<string, unknown>,
    error: response.ok ? null : data.error?.message ?? `WhatsApp nudge failed with HTTP ${response.status}`,
    dryRun: false,
  };
}

export async function sendServiceText(input: {
  to: string;
  text: string;
}): Promise<WhatsAppSendResult> {
  const token = envValue("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = envValue("WHATSAPP_PHONE_NUMBER_ID");
  const payload = {
    messaging_product: "whatsapp",
    to: normalizeTo(input.to),
    type: "text",
    text: {
      body: input.text.slice(0, 4096),
      preview_url: false,
    },
  };

  if (!token || !phoneNumberId || !liveSendsEnabled()) {
    return dryRunResult(
      payload,
      "service-text",
      !token || !phoneNumberId ? "WhatsApp credentials are incomplete." : "PILOT_LIVE_SENDS_ENABLED is not true.",
    );
  }

  const { response, data } = await postWhatsAppJson(`${phoneNumberId}/messages`, payload);
  return {
    ok: response.ok,
    provider: "whatsapp-cloud-api",
    status: response.status,
    providerMessageId: data.messages?.[0]?.id ?? null,
    payload,
    response: data as Record<string, unknown>,
    error: response.ok ? null : data.error?.message ?? `WhatsApp service text failed with HTTP ${response.status}`,
    dryRun: false,
  };
}

export async function sendVoiceAudio(input: {
  to: string;
  audioBytes: Buffer;
  contentType: string;
  briefId: string;
}): Promise<WhatsAppSendResult> {
  const token = envValue("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = envValue("WHATSAPP_PHONE_NUMBER_ID");
  const placeholderPayload = {
    messaging_product: "whatsapp",
    to: normalizeTo(input.to),
    type: "audio",
    audio: { id: `pending-media-${input.briefId}`, voice: true },
  };

  if (!token || !phoneNumberId || !liveSendsEnabled()) {
    return dryRunResult(
      { ...placeholderPayload, dryRunBytes: input.audioBytes.byteLength, contentType: input.contentType },
      "voice",
      !token || !phoneNumberId ? "WhatsApp credentials are incomplete." : "PILOT_LIVE_SENDS_ENABLED is not true.",
    );
  }

  const version = envValue("WHATSAPP_GRAPH_VERSION") || "v25.0";
  const extension = input.contentType === "audio/ogg" ? "ogg" : input.contentType === "audio/wav" ? "wav" : "mp3";
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", input.contentType);
  form.append(
    "file",
    new Blob([new Uint8Array(input.audioBytes)], { type: input.contentType }),
    `daily-dose-${input.briefId}.${extension}`,
  );

  const uploadResponse = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadData = (await uploadResponse.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!uploadResponse.ok || !uploadData.id) {
    return {
      ok: false,
      provider: "whatsapp-cloud-api",
      status: uploadResponse.status,
      providerMessageId: null,
      payload: { ...placeholderPayload, upload: true },
      response: uploadData as Record<string, unknown>,
      error: uploadData.error?.message ?? `WhatsApp media upload failed with HTTP ${uploadResponse.status}`,
      dryRun: false,
    };
  }

  const payload = {
    messaging_product: "whatsapp",
    to: normalizeTo(input.to),
    type: "audio",
    audio: { id: uploadData.id, voice: true },
  };
  const { response, data } = await postWhatsAppJson(`${phoneNumberId}/messages`, payload);
  return {
    ok: response.ok,
    provider: "whatsapp-cloud-api",
    status: response.status,
    providerMessageId: data.messages?.[0]?.id ?? null,
    payload,
    response: data as Record<string, unknown>,
    error: response.ok ? null : data.error?.message ?? `WhatsApp voice send failed with HTTP ${response.status}`,
    dryRun: false,
  };
}
