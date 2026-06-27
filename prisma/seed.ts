import {
  AdminActionType,
  BriefStatus,
  ConsentStatus,
  ConsentType,
  ContentItemCategory,
  ContentItemStatus,
  DeliveryKind,
  DeliveryStatus,
  NewsCandidateStatus,
  Prisma,
  PrismaClient,
  StreakStatus,
  UserStatus,
  VoiceProfileStatus,
} from "@prisma/client";
import { composeDailyBrief, createSourceHash, makeTemplateVariables } from "../src/lib/domain/brief";
import { buildSourceData, profileToBriefUser } from "../src/lib/domain/source-data";
import { addDaysToDateKey, dailyTextIdempotencyKey, firstStreakDateKey } from "../src/lib/domain/time";
import { buildPilotProfiles, contentLibrary, positiveNewsFixtures } from "../src/lib/demo/pilot-fixtures";

const prisma = new PrismaClient();

const today = new Date();
const todayKey = today.toISOString().slice(0, 10);

function nullableJson(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

async function clearData() {
  await prisma.deliveryAttempt.deleteMany();
  await prisma.deliveryJob.deleteMany();
  await prisma.providerMessage.deleteMany();
  await prisma.briefDataSnapshot.deleteMany();
  await prisma.dailyBrief.deleteMany();
  await prisma.streakLedger.deleteMany();
  await prisma.voiceProfile.deleteMany();
  await prisma.pilotEntitlement.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.onboardingSession.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.newsCandidate.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.whatsAppTemplate.deleteMany();
  await prisma.user.deleteMany();
}

async function seedContent() {
  const templates = [
    {
      name: "daily_dose_ready_v1",
      languageCode: "en_US",
      category: "UTILITY",
      status: "APPROVED",
      body:
        "Hello {{1}}, your requested Daily Dose for {{2}} is ready. Select Get Daily Dose below to receive today's personalised briefing and voice option.",
      variables: ["name", "date"],
    },
    {
      name: "daily_ping_morning_brief_hi",
      languageCode: "hi",
      category: "MARKETING",
      status: "DRAFT_READY_FOR_META_REVIEW",
      body:
        "Good morning {{name}}. Aaj ka Daily Ping: {{weather}}. Markets: {{market}}. Metals: {{metals}}. Lucky: {{lucky}}. Reply VOICE for audio.",
      variables: ["name", "weather", "market", "metals", "lucky"],
    },
    {
      name: "daily_ping_morning_brief_gu",
      languageCode: "gu",
      category: "MARKETING",
      status: "DRAFT_READY_FOR_META_REVIEW",
      body:
        "Good morning {{name}}. Aajno Daily Ping: {{weather}}. Market: {{market}}. Lucky: {{lucky}}. Reply VOICE for audio.",
      variables: ["name", "weather", "market", "lucky"],
    },
  ];

  for (const template of templates) {
    await prisma.whatsAppTemplate.create({ data: template });
  }

  for (const item of contentLibrary) {
    await prisma.contentItem.create({
      data: {
        category: item.category as ContentItemCategory,
        languageCode: "en",
        title: item.title,
        body: item.body,
        tags: [...item.tags],
        status: ContentItemStatus.ACTIVE,
        createdBy: "seed",
      },
    });
  }

  await prisma.contentItem.createMany({
    data: [
      {
        category: ContentItemCategory.AFFIRMATION,
        languageCode: "hi",
        title: "Sahaara",
        body: "Aaj aapke liye ek halka, accha badlav apni jagah bana raha hai.",
        tags: ["hindi", "hope"],
        status: ContentItemStatus.ACTIVE,
        createdBy: "seed",
      },
      {
        category: ContentItemCategory.KINDNESS_TASK,
        languageCode: "hi",
        title: "Dost ko yaad karein",
        body: "Aaj kisi purane dost ko ek sachcha message bhejkar unka haal poochhein.",
        tags: ["hindi", "connection"],
        status: ContentItemStatus.ACTIVE,
        createdBy: "seed",
      },
      {
        category: ContentItemCategory.AFFIRMATION,
        languageCode: "gu",
        title: "Saras sharuaat",
        body: "Aaje ek nanakdi pan sundar pragati tamari taraf aavi rahi chhe.",
        tags: ["gujarati", "hope"],
        status: ContentItemStatus.ACTIVE,
        createdBy: "seed",
      },
    ],
  });

  for (const item of positiveNewsFixtures) {
    await prisma.newsCandidate.create({
      data: {
        scope: item.scope,
        region: item.scope === "regional" ? "Maharashtra" : null,
        country: "India",
        languageCode: "en",
        title: item.title,
        summary: item.summary,
        sourceName: item.sourceName,
        sourceUrl: null,
        sentimentScore: item.sentimentScore,
        status: item.title.toLowerCase().includes("fraud")
          ? NewsCandidateStatus.REJECTED
          : NewsCandidateStatus.ACCEPTED,
        rejectionReason: item.title.toLowerCase().includes("fraud") ? "Negative/fraud term rejected" : null,
      },
    });
  }
}

async function seedUsers() {
  const profiles = buildPilotProfiles(36);

  for (const [index, profile] of profiles.entries()) {
    const completedAt =
      profile.status === "ONBOARDING" ? null : new Date(today.getTime() - (profile.streakDays + 1) * 86_400_000);
    const streakStartsOn = completedAt ? new Date(`${firstStreakDateKey(completedAt, profile.timezone)}T00:00:00.000Z`) : null;
    const status = profile.status as UserStatus;
    const user = await prisma.user.create({
      data: {
        phone: profile.phone,
        instagramHandle: index % 3 === 0 ? `@${profile.firstName.toLowerCase()}.daily` : null,
        snapchatHandle: index % 4 === 0 ? `${profile.firstName.toLowerCase()}dose` : null,
        preferredChannels:
          index % 4 === 0 ? ["whatsapp", "instagram", "snapchat"] : index % 3 === 0 ? ["whatsapp", "instagram"] : ["whatsapp"],
        displayName: profile.displayName,
        firstName: profile.firstName,
        city: profile.city,
        region: profile.region,
        country: profile.country,
        timezone: profile.timezone,
        preferredSendTime: profile.preferredSendTime,
        languageCode: profile.languageCode,
        languageName: profile.languageName,
        dateOfBirth: new Date(Date.UTC(1990 + (index % 12), index % 12, 8 + (index % 18))),
        zodiacSign: profile.zodiacSign,
        numerologyNumber: profile.numerologyNumber,
        marketPreference: profile.marketPreference,
        tonePreference: profile.tonePreference,
        interests: profile.interests,
        tags: profile.tags,
        source: "demo",
        status,
        onboardingCompletedAt: completedAt,
        streakStartsOn,
        currentStreak: profile.status === "ACTIVE" ? profile.streakDays : 0,
        longestStreak: Math.max(profile.streakDays, index % 11),
        adminNotes:
          profile.status === "ADMIN_HOLD"
            ? "Hold until custom timezone confirmation is complete."
            : profile.status === "PAUSED"
              ? "User paused after travel."
              : null,
        preferences: {
          create: {
            voiceEnabled: profile.status !== "OPTED_OUT",
            customVoiceEnabled: index % 11 === 0,
            fallbackLanguageCode: "en",
            quietDays: index % 13 === 0 ? ["Sunday"] : [],
          },
        },
        pilotEntitlement: {
          create: {
            plan: "free_pilot",
            isFreePilot: true,
            voiceAddOn: true,
            customVoiceBeta: index % 11 === 0,
          },
        },
        onboardingSessions: {
          create: {
            phone: profile.phone,
            status: profile.status === "ONBOARDING" ? "in_progress" : "completed",
            step: profile.status === "ONBOARDING" ? "profile_depth" : "done",
            payload: {
              source: "seed",
              collected: ["phone", "social_handles", "opt_in", "name", "city", "timezone", "language", "delivery_time"],
            },
            completedAt,
          },
        },
        consents: {
          create: [
            {
              type: ConsentType.WHATSAPP_DAILY_TEXT,
              status: profile.status === "OPTED_OUT" ? ConsentStatus.REVOKED : ConsentStatus.GRANTED,
              source: "onboarding",
              language: profile.languageCode,
              consentText: "I agree to receive Daily Ping morning WhatsApp messages and can opt out anytime.",
              revokedAt: profile.status === "OPTED_OUT" ? new Date(today.getTime() - 86_400_000) : null,
            },
            {
              type: ConsentType.WHATSAPP_VOICE_REPLY,
              status: profile.status === "OPTED_OUT" ? ConsentStatus.REVOKED : ConsentStatus.GRANTED,
              source: "onboarding",
              language: profile.languageCode,
              consentText: "I agree to receive a voice note when I request audio by replying on WhatsApp.",
              revokedAt: profile.status === "OPTED_OUT" ? new Date(today.getTime() - 86_400_000) : null,
            },
          ],
        },
        voiceProfiles: {
          create: {
            label: index % 11 === 0 ? "Loved one voice beta request" : "Warm preset voice",
            provider: "dry-run",
            languageCode: profile.languageCode,
            status: index % 11 === 0 ? VoiceProfileStatus.PENDING_REVIEW : VoiceProfileStatus.PRESET,
            consentEvidenceUrl: index % 11 === 0 ? "pending://manual-review" : null,
          },
        },
      },
    });

    if (completedAt) {
      const firstDate = firstStreakDateKey(completedAt, profile.timezone);
      for (let offset = 0; offset < Math.max(profile.streakDays, 1); offset += 1) {
        await prisma.streakLedger.create({
          data: {
            userId: user.id,
            localDate: addDaysToDateKey(firstDate, offset),
            status: offset < profile.streakDays ? StreakStatus.COUNTED : StreakStatus.PENDING,
            reason: offset < profile.streakDays ? "daily_text_sent" : "awaiting_next_dispatch",
            countedAt: offset < profile.streakDays ? new Date(today.getTime() - (profile.streakDays - offset) * 86_400_000) : null,
          },
        });
      }
    }

    const localDate = todayKey;
    const briefUser = profileToBriefUser(profile);
    const sourceData = buildSourceData(briefUser, localDate);
    const canonicalText = composeDailyBrief(briefUser, sourceData);
    const briefStatus =
      profile.status === "ACTIVE"
        ? index % 7 === 0
          ? BriefStatus.FAILED
          : index % 5 === 0
            ? BriefStatus.VOICE_SENT
            : BriefStatus.TEXT_SENT
        : BriefStatus.SKIPPED;

    const brief = await prisma.dailyBrief.create({
      data: {
        userId: user.id,
        briefDate: localDate,
        languageCode: profile.languageCode,
        canonicalText,
        templateVariables: makeTemplateVariables(briefUser, sourceData),
        status: briefStatus,
        sourceHash: createSourceHash(briefUser, sourceData),
        textSentAt: briefStatus === BriefStatus.TEXT_SENT || briefStatus === BriefStatus.VOICE_SENT ? today : null,
        voiceGeneratedAt: briefStatus === BriefStatus.VOICE_SENT ? today : null,
        voiceSentAt: briefStatus === BriefStatus.VOICE_SENT ? today : null,
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
            dataFreshness: {
              weather: "seeded",
              market: "seeded",
              news: "seeded",
            },
          },
        },
      },
    });

    const shouldFail = briefStatus === BriefStatus.FAILED;
    const shouldSkip = briefStatus === BriefStatus.SKIPPED;
    const job = await prisma.deliveryJob.create({
      data: {
        userId: user.id,
        briefId: brief.id,
        kind: DeliveryKind.DAILY_TEXT,
        status: shouldFail ? DeliveryStatus.FAILED : shouldSkip ? DeliveryStatus.SKIPPED : DeliveryStatus.SENT,
        dueAt: today,
        localDate,
        idempotencyKey: dailyTextIdempotencyKey(user.id, localDate),
        lastError: shouldFail ? "WhatsApp template variable length exceeded in dry-run validation." : null,
        attemptsCount: shouldSkip ? 0 : 1,
      },
    });

    if (!shouldSkip) {
      await prisma.deliveryAttempt.create({
        data: {
          jobId: job.id,
          provider: "whatsapp-cloud-api",
          channel: "whatsapp",
          status: shouldFail ? DeliveryStatus.FAILED : DeliveryStatus.SENT,
          providerMessageId: shouldFail ? null : `wamid.seed.${index}`,
          payload: { template: "daily_dose_ready_v1", dryRun: true },
          response: nullableJson(shouldFail ? null : { accepted: true, dryRun: true }),
          error: shouldFail ? "Dry-run validation failure" : null,
        },
      });
    }

    if (briefStatus === BriefStatus.VOICE_SENT) {
      await prisma.providerMessage.create({
        data: {
          userId: user.id,
          briefId: brief.id,
          provider: "whatsapp-cloud-api",
          providerMessageId: `wamid.inbound.voice.${index}`,
          direction: "inbound",
          channel: "whatsapp",
          command: "VOICE",
          body: "VOICE",
          payload: { dryRun: true, source: "seed-service-window" },
          receivedAt: new Date(today.getTime() - 60 * 60 * 1000),
        },
      });
      await prisma.providerMessage.create({
        data: {
          userId: user.id,
          briefId: brief.id,
          provider: "whatsapp-cloud-api",
          providerMessageId: `wamid.voice.${index}`,
          direction: "outbound",
          channel: "whatsapp_audio",
          command: "VOICE",
          body: "Dry-run voice note sent after user reply.",
          payload: { dryRun: true, contentType: "audio/mpeg" },
          sentAt: today,
        },
      });
    }
  }
}

async function main() {
  await clearData();
  await seedContent();
  await seedUsers();

  await prisma.adminAction.create({
    data: {
      actor: "seed",
      type: AdminActionType.BULK_IMPORT,
      reason: "Seed believable 30-50 user pilot data for local verification.",
      payload: { users: 36, mode: "free_pilot" },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
