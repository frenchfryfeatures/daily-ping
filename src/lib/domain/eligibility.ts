import { getLocalWeekdayName, minutesFromTime } from "./time";

export type ConsentLike = {
  type: string;
  status: string;
};

export type PreferenceLike = {
  voiceEnabled?: boolean | null;
  quietDays?: string[] | null;
} | null;

export type UserEligibilityProfile = {
  status: string;
  onboardingCompletedAt?: Date | string | null;
  timezone: string;
  preferredSendTime: string;
  consents: ConsentLike[];
  preferences?: PreferenceLike;
};

export type EligibilityResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
    };

export function validateTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
}

export function validateDeliveryProfile(profile: Pick<UserEligibilityProfile, "timezone" | "preferredSendTime">) {
  validateTimezone(profile.timezone);
  minutesFromTime(profile.preferredSendTime);
}

export function hasGrantedConsent(consents: ConsentLike[], type: string) {
  return consents.some((consent) => consent.type === type && consent.status === "GRANTED");
}

export function canSendDailyText(profile: UserEligibilityProfile): EligibilityResult {
  try {
    validateDeliveryProfile(profile);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Invalid delivery profile." };
  }

  if (profile.status !== "ACTIVE") return { ok: false, reason: `User status is ${profile.status}.` };
  if (!profile.onboardingCompletedAt) return { ok: false, reason: "Onboarding is not complete." };
  if (!hasGrantedConsent(profile.consents, "WHATSAPP_DAILY_TEXT")) {
    return { ok: false, reason: "WhatsApp daily text consent is not granted." };
  }

  return { ok: true };
}

export function canDispatchDailyText(profile: UserEligibilityProfile, now: Date): EligibilityResult {
  const base = canSendDailyText(profile);
  if (!base.ok) return base;

  const quietDays = profile.preferences?.quietDays ?? [];
  if (quietDays.length > 0) {
    const weekday = getLocalWeekdayName(now, profile.timezone);
    if (quietDays.some((day) => day.toLowerCase() === weekday.toLowerCase())) {
      return { ok: false, reason: `Quiet day: ${weekday}.` };
    }
  }

  return { ok: true };
}

export function canRequestVoice(
  profile: UserEligibilityProfile,
  input: { serviceWindowOpen: boolean },
): EligibilityResult {
  try {
    validateDeliveryProfile(profile);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Invalid delivery profile." };
  }

  if (profile.status !== "ACTIVE") return { ok: false, reason: `User status is ${profile.status}.` };
  if (!profile.onboardingCompletedAt) return { ok: false, reason: "Onboarding is not complete." };
  if (!hasGrantedConsent(profile.consents, "WHATSAPP_VOICE_REPLY")) {
    return { ok: false, reason: "WhatsApp voice consent is not granted." };
  }
  if (profile.preferences?.voiceEnabled === false) return { ok: false, reason: "Voice is disabled for this user." };
  if (!input.serviceWindowOpen) {
    return { ok: false, reason: "Voice requires an open WhatsApp customer service window from a recent user message." };
  }

  return { ok: true };
}
