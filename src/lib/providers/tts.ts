import "server-only";

import { envValue } from "@/lib/env";

export type TtsResult = {
  ok: boolean;
  provider: string;
  contentType: string;
  audio: Buffer;
  error?: string;
};

const languageCodeMap: Record<string, string> = {
  bn: "bn-IN",
  en: "en-IN",
  gu: "gu-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  or: "or-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
};

function sarvamLanguageCode(languageCode?: string) {
  if (!languageCode) return "en-IN";
  if (languageCode.includes("-")) return languageCode;
  return languageCodeMap[languageCode.toLowerCase()] ?? "en-IN";
}

function sarvamContentType(codec: string) {
  if (codec === "mp3") return "audio/mpeg";
  if (codec === "opus") return "audio/ogg";
  if (codec === "aac") return "audio/aac";
  return "audio/wav";
}

export async function synthesizeBriefAudio(
  text: string,
  options: { languageCode?: string; speaker?: string } = {},
): Promise<TtsResult> {
  const provider = envValue("TTS_PROVIDER") || "dry-run";

  if (provider === "sarvam") {
    const apiKey = envValue("SARVAM_API_KEY");
    const model = envValue("SARVAM_TTS_MODEL") || "bulbul:v2";
    const codec = envValue("SARVAM_TTS_CODEC") || "mp3";
    const speaker = options.speaker || envValue("SARVAM_TTS_SPEAKER") || (model === "bulbul:v3" ? "shubh" : "anushka");
    const maxCharacters = model === "bulbul:v3" ? 2500 : 1500;

    if (!apiKey) {
      return {
        ok: true,
        provider: "sarvam-dry-run",
        contentType: sarvamContentType(codec),
        audio: Buffer.from(`SARVAM DRY RUN AUDIO FOR:\n${text}`),
      };
    }

    if (text.length > maxCharacters) {
      return {
        ok: false,
        provider: "sarvam",
        contentType: sarvamContentType(codec),
        audio: Buffer.from(""),
        error: `Brief is ${text.length} characters; ${model} supports ${maxCharacters}. Shorten the canonical brief or use streaming/chunking.`,
      };
    }

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        text,
        target_language_code: sarvamLanguageCode(options.languageCode),
        speaker,
        model,
        output_audio_codec: codec,
        pace: Number(envValue("SARVAM_TTS_PACE") ?? 1),
        ...(model === "bulbul:v2" ? { enable_cached_responses: true, enable_preprocessing: true } : { temperature: 0.45 }),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      audios?: string[];
      request_id?: string;
      error?: { message?: string } | string;
    };

    if (!response.ok || !data.audios?.[0]) {
      const error = typeof data.error === "string" ? data.error : data.error?.message;
      return {
        ok: false,
        provider: "sarvam",
        contentType: sarvamContentType(codec),
        audio: Buffer.from(""),
        error: error ?? `Sarvam TTS failed with HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      provider: "sarvam",
      contentType: sarvamContentType(codec),
      audio: Buffer.from(data.audios.join(""), "base64"),
    };
  }

  if (provider === "dry-run" || !envValue("ELEVENLABS_API_KEY")) {
    return {
      ok: true,
      provider: "dry-run",
      contentType: "audio/mpeg",
      audio: Buffer.from(`DRY RUN AUDIO FOR:\n${text}`),
    };
  }

  return {
    ok: false,
    provider,
    contentType: "audio/mpeg",
    audio: Buffer.from(""),
    error: "Live TTS provider is configured but not enabled for the pilot adapter yet.",
  };
}
