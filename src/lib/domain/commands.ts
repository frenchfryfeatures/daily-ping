export type WhatsAppCommand =
  | "DAILY"
  | "VOICE"
  | "PAUSE"
  | "RESUME"
  | "STOP"
  | "LANGUAGE"
  | "TIME"
  | "PROFILE"
  | "UNKNOWN";

const commandMap: Record<string, WhatsAppCommand> = {
  DAILY: "DAILY",
  GET: "DAILY",
  AUDIO: "VOICE",
  LISTEN: "VOICE",
  NOTE: "VOICE",
  PLAY: "VOICE",
  VOICE: "VOICE",
  PAUSE: "PAUSE",
  SNOOZE: "PAUSE",
  RESUME: "RESUME",
  START: "RESUME",
  STOP: "STOP",
  UNSUBSCRIBE: "STOP",
  LANGUAGE: "LANGUAGE",
  LANG: "LANGUAGE",
  TIME: "TIME",
  PROFILE: "PROFILE",
  SETTINGS: "PROFILE",
};

export function parseWhatsAppCommand(body: string | null | undefined): WhatsAppCommand {
  const normalized = (body ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)[0]
    ?.toUpperCase();

  if (!normalized) return "UNKNOWN";
  return commandMap[normalized] ?? "UNKNOWN";
}

export function commandResponse(command: WhatsAppCommand) {
  switch (command) {
    case "DAILY":
      return "Sending today's personalised Daily Dose and preparing the matching voice note.";
    case "VOICE":
      return "Generating today's voice note from the same morning text.";
    case "PAUSE":
      return "Daily pings are paused. Reply RESUME whenever you want them again.";
    case "RESUME":
      return "Daily pings are active again from your next local morning slot.";
    case "STOP":
      return "You have been opted out. We will not send more daily pings unless you opt in again.";
    case "LANGUAGE":
      return "Share your preferred language, for example Hindi, English, Marathi, Tamil, or Gujarati.";
    case "TIME":
      return "Share your preferred delivery time in 24-hour format, for example 07:30.";
    case "PROFILE":
      return "Your profile controls name, city, timezone, language, market preference, and wellness tone.";
    case "UNKNOWN":
      return "Reply VOICE for audio, PAUSE to pause, RESUME to restart, LANGUAGE to change language, TIME to change time, or STOP to opt out.";
  }
}
