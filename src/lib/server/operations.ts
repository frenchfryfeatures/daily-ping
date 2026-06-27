import "server-only";

import {
  AdminActionType,
  BriefStatus,
  ConsentStatus,
  ConsentType,
  DeliveryKind,
  DeliveryStatus,
  Prisma,
  StreakStatus,
  UserStatus,
  VoiceProfileStatus,
} from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { composeDailyBrief, createSourceHash, makeTemplateVariables } from "@/lib/domain/brief";
import { parseWhatsAppCommand, commandResponse } from "@/lib/domain/commands";
import {
  canDispatchDailyText,
  canRequestVoice,
  canSendDailyText,
  validateDeliveryProfile,
} from "@/lib/domain/eligibility";
import { buildSourceData } from "@/lib/domain/source-data";
import { envValue } from "@/lib/env";
import {
  dailyNudgeIdempotencyKey,
  dailyTextIdempotencyKey,
  firstStreakDateKey,
  getLocalParts,
  isWithinDispatchWindow,
  voiceIdempotencyKey,
} from "@/lib/domain/time";
import { synthesizeBriefAudio } from "@/lib/providers/tts";
import { sendDailyNudgeTemplate, sendServiceText, sendVoiceAudio } from "@/lib/providers/whatsapp";

export const onboardingSchema = z.object({
  phone: z.string().min(8),
  instagramHandle: z.string().optional().default(""),
  snapchatHandle: z.string().optional().default(""),
  preferredChannels: z.array(z.string()).default(["whatsapp"]),
  displayName: z.string().min(2),
  firstName: z.string().min(1),
  city: z.string().min(2),
  region: z.string().optional().default(""),
  country: z.string().min(2),
  timezone: z.string().min(3),
  preferredSendTime: z.string().regex(/^\d{2}:\d{2}$/),
  languageCode: z.string().min(2).default("en"),
  languageName: z.string().min(2).default("English"),
  dateOfBirth: z.string().optional(),
  zodiacSign: z.string().optional(),
  numerologyNumber: z.coerce.number().int().min(1).max(9).optional(),
  marketPreference: z.string().min(2).default("NIFTY 50"),
  tonePreference: z.string().min(2).default("warm"),
  interests: z.array(z.string()).default([]),
  optInDailyText: z.boolean().default(true),
  optInVoiceReply: z.boolean().default(true),
});

const scheduleSchema = z.object({
  timezone: z.string().min(3),
  preferredSendTime: z.string().regex(/^\d{2}:\d{2}$/),
  actor: z.string().min(2).default("admin"),
  reason: z.string().min(6),
});

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : asJson(value);
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.replace(/[^\d]/g, "")}`;
  return `+${trimmed.replace(/[^\d]/g, "")}`;
}

function userToBriefUser(user: {
  displayName: string;
  city: string;
  region: string | null;
  country: string;
  languageCode: string;
  zodiacSign: string | null;
  numerologyNumber: number | null;
  marketPreference: string;
  tonePreference: string;
}) {
  return {
    displayName: user.displayName,
    city: user.city,
    region: user.region,
    country: user.country,
    languageCode: user.languageCode,
    zodiacSign: user.zodiacSign,
    numerologyNumber: user.numerologyNumber,
    marketPreference: user.marketPreference,
    tonePreference: user.tonePreference,
  };
}

export async function onboardUser(rawInput: unknown) {
  const input = onboardingSchema.parse(rawInput);
  validateDeliveryProfile(input);
  if (!input.optInDailyText || !input.optInVoiceReply) {
    throw new Error("WhatsApp daily text and reply-triggered voice opt-ins are required for the pilot.");
  }

  const prisma = getPrisma();
  const phone = normalizePhone(input.phone);
  const now = new Date();
  const streakStartsOn = new Date(`${firstStreakDateKey(now, input.timezone)}T00:00:00.000Z`);

  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      displayName: input.displayName,
      instagramHandle: input.instagramHandle || null,
      snapchatHandle: input.snapchatHandle || null,
      preferredChannels: input.preferredChannels.length ? input.preferredChannels : ["whatsapp"],
      firstName: input.firstName,
      city: input.city,
      region: input.region || null,
      country: input.country,
      timezone: input.timezone,
      preferredSendTime: input.preferredSendTime,
      languageCode: input.languageCode,
      languageName: input.languageName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      zodiacSign: input.zodiacSign || null,
      numerologyNumber: input.numerologyNumber ?? null,
      marketPreference: input.marketPreference,
      tonePreference: input.tonePreference,
      interests: input.interests,
      source: "pilot",
      status: UserStatus.ACTIVE,
      onboardingCompletedAt: now,
      streakStartsOn,
    },
    create: {
      phone,
      instagramHandle: input.instagramHandle || null,
      snapchatHandle: input.snapchatHandle || null,
      preferredChannels: input.preferredChannels.length ? input.preferredChannels : ["whatsapp"],
      displayName: input.displayName,
      firstName: input.firstName,
      city: input.city,
      region: input.region || null,
      country: input.country,
      timezone: input.timezone,
      preferredSendTime: input.preferredSendTime,
      languageCode: input.languageCode,
      languageName: input.languageName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      zodiacSign: input.zodiacSign || null,
      numerologyNumber: input.numerologyNumber ?? null,
      marketPreference: input.marketPreference,
      tonePreference: input.tonePreference,
      interests: input.interests,
      tags: ["pilot"],
      source: "pilot",
      status: UserStatus.ACTIVE,
      onboardingCompletedAt: now,
      streakStartsOn,
      preferences: { create: {} },
      pilotEntitlement: { create: { plan: "free_pilot", isFreePilot: true, voiceAddOn: true } },
      voiceProfiles: {
        create: {
          label: "Warm preset voice",
          provider: "dry-run",
          languageCode: input.languageCode,
          status: VoiceProfileStatus.PRESET,
        },
      },
    },
  });

  await prisma.onboardingSession.create({
    data: {
      userId: user.id,
      phone,
      status: "completed",
      step: "done",
      payload: input,
      completedAt: now,
    },
  });

  await prisma.consentRecord.createMany({
    data: [
      {
        userId: user.id,
        type: ConsentType.WHATSAPP_DAILY_TEXT,
        status: ConsentStatus.GRANTED,
        source: "onboarding",
        language: input.languageCode,
        consentText: "I agree to receive Daily Ping morning WhatsApp messages and can opt out anytime.",
      },
      {
        userId: user.id,
        type: ConsentType.WHATSAPP_VOICE_REPLY,
        status: ConsentStatus.GRANTED,
        source: "onboarding",
        language: input.languageCode,
        consentText: "I agree to receive a voice note when I request audio by replying on WhatsApp.",
      },
    ],
  });

  await audit({
    userId: user.id,
    actor: "onboarding",
    action: "user.onboarded",
    target: `user:${user.id}`,
    reason: "Customer completed first WhatsApp onboarding interaction.",
    after: {
      phone,
      instagramHandle: input.instagramHandle || null,
      snapchatHandle: input.snapchatHandle || null,
      preferredChannels: input.preferredChannels,
      timezone: input.timezone,
      preferredSendTime: input.preferredSendTime,
    },
  });

  return user;
}

export async function dispatchDueBriefs(now = new Date()) {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      onboardingCompletedAt: { not: null },
      source: { not: "demo" },
    },
    include: {
      consents: true,
      preferences: true,
    },
    take: 100,
  });
  const results = [];

  for (const user of users) {
    const eligibility = canDispatchDailyText(user, now);
    if (!eligibility.ok) {
      results.push({ userId: user.id, status: "skipped", reason: eligibility.reason });
      continue;
    }

    const window = isWithinDispatchWindow({
      now,
      timezone: user.timezone,
      preferredSendTime: user.preferredSendTime,
      windowMinutes: 15,
    });
    const streakStartKey = user.onboardingCompletedAt
      ? firstStreakDateKey(user.onboardingCompletedAt, user.timezone)
      : null;

    if (!window.due || (streakStartKey && window.dateKey < streakStartKey)) {
      results.push({ userId: user.id, status: "not_due", localDate: window.dateKey });
      continue;
    }

    results.push(await dispatchNudgeForUser(user, window.dateKey, now));
  }

  return {
    checked: users.length,
    results,
  };
}

type DispatchUser = Prisma.UserGetPayload<{
  include: { consents: true; preferences: true };
}>;

async function ensureDailyBrief(user: DispatchUser, dateKey: string, now: Date) {
  const prisma = getPrisma();
  const existing = await prisma.dailyBrief.findUnique({
    where: { userId_briefDate: { userId: user.id, briefDate: dateKey } },
  });
  if (existing) return existing;

  const briefUser = userToBriefUser(user);
  const sourceData = buildSourceData(briefUser, dateKey);
  return prisma.dailyBrief.create({
    data: {
      userId: user.id,
      briefDate: dateKey,
      languageCode: user.languageCode,
      canonicalText: composeDailyBrief(briefUser, sourceData),
      templateVariables: makeTemplateVariables(briefUser, sourceData),
      status: BriefStatus.QUEUED,
      sourceHash: createSourceHash(briefUser, sourceData),
      snapshot: {
        create: {
          weather: sourceData.weather,
          market: sourceData.market,
          goldSilver: sourceData.goldSilver,
          zodiac: sourceData.zodiac,
          numerology: sourceData.numerology,
          positiveNews: sourceData.news,
          affirmation: { body: sourceData.affirmation },
          kindnessTask: { body: sourceData.kindnessTask },
          powerHours: sourceData.powerHours,
          luckySignals: sourceData.luckySignals,
          dataFreshness: { mode: "generated", generatedAt: now.toISOString() },
        },
      },
    },
  });
}

async function dispatchNudgeForUser(user: DispatchUser, dateKey: string, now: Date) {
  const prisma = getPrisma();
  const brief = await ensureDailyBrief(user, dateKey, now);
  const idempotencyKey = dailyNudgeIdempotencyKey(user.id, dateKey);
  const existing = await prisma.deliveryJob.findUnique({ where: { idempotencyKey } });
  if (existing?.status === DeliveryStatus.SENT) {
    return { userId: user.id, status: "duplicate", jobId: existing.id, briefId: brief.id };
  }

  const job =
    existing ??
    (await prisma.deliveryJob.create({
      data: {
        userId: user.id,
        briefId: brief.id,
        kind: DeliveryKind.DAILY_NUDGE,
        status: DeliveryStatus.PENDING,
        dueAt: now,
        localDate: dateKey,
        idempotencyKey,
      },
    }));
  const sent = await sendDailyNudgeTemplate({
    to: user.phone,
    name: user.firstName || user.displayName,
    dateKey,
  });
  const status = sent.dryRun ? DeliveryStatus.SKIPPED : sent.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
  const error = sent.dryRun ? "Live sends disabled; Utility nudge simulated." : sent.error;

  await prisma.deliveryAttempt.create({
    data: {
      jobId: job.id,
      provider: sent.provider,
      channel: "whatsapp_utility",
      status,
      providerMessageId: sent.providerMessageId,
      payload: asJson(sent.payload),
      response: nullableJson(sent.response),
      error,
    },
  });
  await prisma.deliveryJob.update({
    where: { id: job.id },
    data: {
      status,
      attemptsCount: { increment: 1 },
      lastError: error,
    },
  });
  await prisma.dailyBrief.update({
    where: { id: brief.id },
    data: { status: status === DeliveryStatus.SENT ? BriefStatus.NUDGE_SENT : brief.status },
  });

  return {
    userId: user.id,
    status: sent.dryRun ? "dry_run" : sent.ok ? "nudge_sent" : "failed",
    jobId: job.id,
    briefId: brief.id,
  };
}

export async function dispatchTestNudge(input: { userId: string; actor: string; reason: string }) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { consents: true, preferences: true },
  });
  if (!user) throw new Error("Test user not found.");
  if (user.source === "demo") throw new Error("Demo users cannot receive provider messages.");
  const allowlistedPhone = envValue("PILOT_TEST_PHONE");
  if (!allowlistedPhone || normalizePhone(allowlistedPhone) !== user.phone) {
    throw new Error("This user does not match the PILOT_TEST_PHONE allowlist.");
  }
  const eligibility = canSendDailyText(user);
  if (!eligibility.ok) throw new Error(eligibility.reason);

  const now = new Date();
  const dateKey = getLocalParts(now, user.timezone).dateKey;
  const result = await dispatchNudgeForUser(user, dateKey, now);
  await audit({
    userId: user.id,
    actor: input.actor,
    action: "whatsapp.utility_test.requested",
    target: `user:${user.id}`,
    reason: input.reason,
    after: result,
  });
  return result;
}

export async function deliverDailyDoseForUser(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      consents: true,
      preferences: true,
      dailyBriefs: {
        where: { status: { in: [BriefStatus.QUEUED, BriefStatus.NUDGE_SENT, BriefStatus.TEXT_SENT, BriefStatus.VOICE_SENT] } },
        orderBy: { generatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!user) throw new Error("Daily Dose user not found.");
  const eligibility = canSendDailyText(user);
  if (!eligibility.ok) throw new Error(eligibility.reason);

  const brief = user.dailyBriefs[0];
  if (!brief) throw new Error("No delivered Utility nudge is awaiting this response.");
  const idempotencyKey = dailyTextIdempotencyKey(user.id, brief.briefDate);
  const existing = await prisma.deliveryJob.findUnique({ where: { idempotencyKey } });
  if (existing?.status === DeliveryStatus.SENT) {
    return {
      status: "duplicate_sent",
      jobId: existing.id,
      briefId: brief.id,
      voice: brief.status === BriefStatus.VOICE_SENT ? "duplicate_sent" : "not_requested",
    };
  }

  const now = new Date();
  const job =
    existing ??
    (await prisma.deliveryJob.create({
      data: {
        userId: user.id,
        briefId: brief.id,
        kind: DeliveryKind.DAILY_TEXT,
        status: DeliveryStatus.PENDING,
        dueAt: now,
        localDate: brief.briefDate,
        idempotencyKey,
      },
    }));
  const sent = await sendServiceText({ to: user.phone, text: brief.canonicalText });
  const status = sent.dryRun ? DeliveryStatus.SKIPPED : sent.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
  const error = sent.dryRun ? "Live sends disabled; canonical service text simulated." : sent.error;

  await prisma.deliveryAttempt.create({
    data: {
      jobId: job.id,
      provider: sent.provider,
      channel: "whatsapp_service_text",
      status,
      providerMessageId: sent.providerMessageId,
      payload: asJson(sent.payload),
      response: nullableJson(sent.response),
      error,
    },
  });
  await prisma.deliveryJob.update({
    where: { id: job.id },
    data: {
      status,
      attemptsCount: { increment: 1 },
      lastError: error,
    },
  });
  await prisma.providerMessage.create({
    data: {
      userId: user.id,
      briefId: brief.id,
      provider: sent.provider,
      providerMessageId: sent.providerMessageId,
      direction: "outbound",
      channel: "whatsapp_service_text",
      command: "DAILY",
      body: brief.canonicalText,
      payload: asJson(sent.payload),
      sentAt: status === DeliveryStatus.SENT ? now : null,
    },
  });

  if (status !== DeliveryStatus.SENT) {
    return {
      status: sent.dryRun ? "dry_run" : "text_failed",
      jobId: job.id,
      briefId: brief.id,
      error,
      voice: "not_requested",
    };
  }

  await prisma.dailyBrief.update({
    where: { id: brief.id },
    data: { status: BriefStatus.TEXT_SENT, textSentAt: now },
  });
  await prisma.streakLedger.upsert({
    where: { userId_localDate: { userId: user.id, localDate: brief.briefDate } },
    update: {
      status: StreakStatus.COUNTED,
      reason: "canonical_daily_dose_sent",
      countedAt: now,
    },
    create: {
      userId: user.id,
      localDate: brief.briefDate,
      status: StreakStatus.COUNTED,
      reason: "canonical_daily_dose_sent",
      countedAt: now,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastDeliveredAt: now,
      currentStreak: { increment: 1 },
      longestStreak: Math.max(user.longestStreak, user.currentStreak + 1),
    },
  });

  const ttsReady = envValue("TTS_PROVIDER") === "sarvam" && Boolean(envValue("SARVAM_API_KEY"));
  const voice =
    ttsReady && user.preferences?.voiceEnabled !== false
      ? await requestVoiceForUser({ userId: user.id, briefId: brief.id })
      : { status: "not_configured", briefId: brief.id };

  return { status: "text_sent", jobId: job.id, briefId: brief.id, voice };
}

export async function requestVoiceForUser(input: { phone?: string; userId?: string; briefId?: string }) {
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: input.userId ? { id: input.userId } : { phone: input.phone ? normalizePhone(input.phone) : "" },
    include: {
      consents: true,
      preferences: true,
      providerMessages: {
        where: {
          direction: "inbound",
          receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { receivedAt: "desc" },
        take: 1,
      },
      dailyBriefs: {
        where: input.briefId ? { id: input.briefId } : undefined,
        orderBy: { generatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!user) throw new Error("User not found for voice request.");
  const voiceEligibility = canRequestVoice(user, { serviceWindowOpen: user.providerMessages.length > 0 });
  if (!voiceEligibility.ok) throw new Error(voiceEligibility.reason);

  const brief = user.dailyBriefs[0];
  if (!brief) throw new Error("No daily brief exists for this user yet.");

  const key = voiceIdempotencyKey(user.id, brief.id);
  const existing = await prisma.deliveryJob.findUnique({ where: { idempotencyKey: key } });
  if (existing?.status === DeliveryStatus.SENT) {
    return { status: "duplicate_sent", jobId: existing.id, briefId: brief.id };
  }

  const job =
    existing ??
    (await prisma.deliveryJob.create({
      data: {
        userId: user.id,
        briefId: brief.id,
        kind: DeliveryKind.VOICE_AUDIO,
        status: DeliveryStatus.PENDING,
        dueAt: new Date(),
        localDate: brief.briefDate,
        idempotencyKey: key,
      },
    }));

  const audio = await synthesizeBriefAudio(brief.canonicalText, { languageCode: user.languageCode });
  const sent = audio.ok && !audio.provider.includes("dry-run")
    ? await sendVoiceAudio({
        to: user.phone,
        audioBytes: audio.audio,
        contentType: audio.contentType,
        briefId: brief.id,
      })
    : {
        ok: false,
        provider: audio.provider,
        status: 502,
        providerMessageId: null,
        payload: { briefId: brief.id },
        response: null,
        error: audio.provider.includes("dry-run") ? "Live TTS is not configured." : audio.error ?? "TTS failed",
        dryRun: true,
      };
  const deliveryStatus = sent.dryRun ? DeliveryStatus.SKIPPED : sent.ok ? DeliveryStatus.SENT : DeliveryStatus.FAILED;

  await prisma.deliveryAttempt.create({
    data: {
      jobId: job.id,
      provider: sent.provider,
      channel: "whatsapp_audio",
      status: deliveryStatus,
      providerMessageId: sent.providerMessageId,
      payload: asJson(sent.payload),
      response: nullableJson(sent.response),
      error: sent.error,
    },
  });
  await prisma.deliveryJob.update({
    where: { id: job.id },
    data: {
      status: deliveryStatus,
      attemptsCount: { increment: 1 },
      lastError: sent.error,
    },
  });
  await prisma.dailyBrief.update({
    where: { id: brief.id },
    data: {
      status: deliveryStatus === DeliveryStatus.SENT ? BriefStatus.VOICE_SENT : brief.status,
      voiceGeneratedAt: new Date(),
      voiceSentAt: deliveryStatus === DeliveryStatus.SENT ? new Date() : null,
    },
  });
  await prisma.providerMessage.create({
    data: {
      userId: user.id,
      briefId: brief.id,
      provider: sent.provider,
      providerMessageId: sent.providerMessageId,
      direction: "outbound",
      channel: "whatsapp_audio",
      command: "VOICE",
      body: deliveryStatus === DeliveryStatus.SENT ? "Voice note sent from canonical daily brief." : sent.error,
      payload: asJson(sent.payload),
      sentAt: deliveryStatus === DeliveryStatus.SENT ? new Date() : null,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastVoiceRequestedAt: new Date() },
  });

  return {
    status: deliveryStatus === DeliveryStatus.SENT ? "voice_sent" : sent.dryRun ? "voice_not_configured" : "voice_failed",
    jobId: job.id,
    briefId: brief.id,
    error: sent.error,
  };
}

export async function handleWhatsAppInbound(input: { phone: string; body: string; providerMessageId?: string }) {
  const prisma = getPrisma();
  const phone = normalizePhone(input.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  const command = parseWhatsAppCommand(input.body);

  if (!user) {
    return { command, response: "Please complete onboarding before Daily Ping can respond to this number." };
  }

  if (input.providerMessageId) {
    const existing = await prisma.providerMessage.findFirst({
      where: { providerMessageId: input.providerMessageId, direction: "inbound" },
    });
    if (existing) {
      return { command, response: "Duplicate webhook ignored.", duplicate: true };
    }
  }

  await prisma.providerMessage.create({
    data: {
      userId: user.id,
      provider: "whatsapp-cloud-api",
      providerMessageId: input.providerMessageId ?? null,
      direction: "inbound",
      channel: "whatsapp",
      command,
      body: input.body,
      payload: asJson(input),
      receivedAt: new Date(),
    },
  });

  let actionResult: unknown = null;
  if (command === "DAILY") {
    actionResult = await deliverDailyDoseForUser(user.id);
  } else if (command === "STOP") {
    await changeUserStatus({ userId: user.id, status: UserStatus.OPTED_OUT, actor: "whatsapp", reason: "User replied STOP." });
  } else if (command === "PAUSE") {
    await changeUserStatus({ userId: user.id, status: UserStatus.PAUSED, actor: "whatsapp", reason: "User replied PAUSE." });
  } else if (command === "RESUME") {
    await changeUserStatus({ userId: user.id, status: UserStatus.ACTIVE, actor: "whatsapp", reason: "User replied RESUME." });
  } else if (command === "VOICE") {
    await requestVoiceForUser({ userId: user.id });
  }

  return { command, response: commandResponse(command), actionResult };
}

export async function changeUserStatus(input: {
  userId: string;
  status: UserStatus;
  actor: string;
  reason: string;
}) {
  const prisma = getPrisma();
  const before = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: { status: input.status },
  });

  if (input.status === UserStatus.OPTED_OUT) {
    await prisma.consentRecord.updateMany({
      where: { userId: input.userId, status: ConsentStatus.GRANTED },
      data: { status: ConsentStatus.REVOKED, revokedAt: new Date() },
    });
  }

  const type =
    input.status === UserStatus.PAUSED
      ? AdminActionType.USER_PAUSED
      : input.status === UserStatus.ACTIVE
        ? AdminActionType.USER_RESUMED
        : input.status === UserStatus.OPTED_OUT
          ? AdminActionType.USER_OPTED_OUT
          : AdminActionType.USER_UPDATED;

  await prisma.adminAction.create({
    data: {
      userId: input.userId,
      actor: input.actor,
      type,
      reason: input.reason,
      payload: { from: before.status, to: input.status },
    },
  });
  await audit({
    userId: input.userId,
    actor: input.actor,
    action: "user.status.changed",
    target: `user:${input.userId}`,
    reason: input.reason,
    before: { status: before.status },
    after: { status: user.status },
  });

  return user;
}

export async function changeUserSchedule(input: {
  userId: string;
  timezone: string;
  preferredSendTime: string;
  actor?: string;
  reason: string;
}) {
  const parsed = scheduleSchema.parse(input);
  validateDeliveryProfile(parsed);

  const prisma = getPrisma();
  const before = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      timezone: parsed.timezone,
      preferredSendTime: parsed.preferredSendTime,
    },
  });

  await prisma.adminAction.create({
    data: {
      userId: input.userId,
      actor: parsed.actor,
      type: AdminActionType.USER_UPDATED,
      reason: parsed.reason,
      payload: {
        from: { timezone: before.timezone, preferredSendTime: before.preferredSendTime },
        to: { timezone: user.timezone, preferredSendTime: user.preferredSendTime },
      },
    },
  });
  await audit({
    userId: input.userId,
    actor: parsed.actor,
    action: "user.schedule.changed",
    target: `user:${input.userId}`,
    reason: parsed.reason,
    before: { timezone: before.timezone, preferredSendTime: before.preferredSendTime },
    after: { timezone: user.timezone, preferredSendTime: user.preferredSendTime },
  });

  return user;
}

export async function retryDeliveryJob(input: { jobId: string; actor: string; reason: string }) {
  const prisma = getPrisma();
  const job = await prisma.deliveryJob.findUniqueOrThrow({
    where: { id: input.jobId },
    include: { user: { include: { consents: true, preferences: true } }, brief: true },
  });
  if (!job.brief) throw new Error("Cannot retry a job without a brief.");
  const brief = job.brief;

  const result =
    job.kind === DeliveryKind.VOICE_AUDIO
      ? await requestVoiceForUser({ userId: job.userId, briefId: brief.id })
      : job.kind === DeliveryKind.DAILY_NUDGE
        ? await dispatchNudgeForUser(job.user, brief.briefDate, new Date())
        : await deliverDailyDoseForUser(job.userId);

  await prisma.adminAction.create({
    data: {
      userId: job.userId,
      actor: input.actor,
      type: AdminActionType.MANUAL_RESEND,
      reason: input.reason,
      payload: { jobId: input.jobId, kind: job.kind },
    },
  });

  return { status: "retry_completed", jobId: input.jobId, result };
}

async function audit(input: {
  userId?: string;
  actor: string;
  action: string;
  target: string;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  await getPrisma().auditEvent.create({
    data: {
      userId: input.userId,
      actor: input.actor,
      action: input.action,
      target: input.target,
      reason: input.reason,
      before: nullableJson(input.before),
      after: nullableJson(input.after),
    },
  });
}
