-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'PAUSED', 'OPTED_OUT', 'ADMIN_HOLD');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('WHATSAPP_DAILY_TEXT', 'WHATSAPP_VOICE_REPLY', 'CUSTOM_VOICE', 'DATA_ENRICHMENT');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DeliveryKind" AS ENUM ('DAILY_TEXT', 'VOICE_AUDIO');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('DRAFT', 'QUEUED', 'TEXT_SENT', 'VOICE_SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StreakStatus" AS ENUM ('PENDING', 'COUNTED', 'MISSED');

-- CreateEnum
CREATE TYPE "VoiceProfileStatus" AS ENUM ('PRESET', 'PENDING_CONSENT', 'PENDING_REVIEW', 'APPROVED', 'REVOKED', 'DELETED');

-- CreateEnum
CREATE TYPE "NewsCandidateStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'FALLBACK');

-- CreateEnum
CREATE TYPE "ContentItemCategory" AS ENUM ('AFFIRMATION', 'KINDNESS_TASK', 'POSITIVE_NEWS_FALLBACK', 'POWER_HOURS', 'TEMPLATE_FOOTER');

-- CreateEnum
CREATE TYPE "ContentItemStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'USER_PAUSED', 'USER_RESUMED', 'USER_OPTED_OUT', 'USER_RESTORED', 'MANUAL_RESEND', 'CONTENT_OVERRIDE', 'VOICE_APPROVAL', 'VOICE_REVOKE', 'BULK_IMPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "preferredSendTime" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "languageName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "zodiacSign" TEXT,
    "numerologyNumber" INTEGER,
    "marketPreference" TEXT NOT NULL,
    "tonePreference" TEXT NOT NULL,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'pilot',
    "status" "UserStatus" NOT NULL DEFAULT 'ONBOARDING',
    "onboardingCompletedAt" TIMESTAMP(3),
    "streakStartsOn" TIMESTAMP(3),
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "adminNotes" TEXT,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastVoiceRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "includeWeather" BOOLEAN NOT NULL DEFAULT true,
    "includeMarkets" BOOLEAN NOT NULL DEFAULT true,
    "includeGoldSilver" BOOLEAN NOT NULL DEFAULT true,
    "includeZodiac" BOOLEAN NOT NULL DEFAULT true,
    "includeNumerology" BOOLEAN NOT NULL DEFAULT true,
    "includePositiveNews" BOOLEAN NOT NULL DEFAULT true,
    "includeKindnessTask" BOOLEAN NOT NULL DEFAULT true,
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customVoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowDataEnrichment" BOOLEAN NOT NULL DEFAULT true,
    "quietDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fallbackLanguageCode" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "source" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "evidenceUrl" TEXT,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefDate" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "canonicalText" TEXT NOT NULL,
    "templateVariables" JSONB NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "textSentAt" TIMESTAMP(3),
    "voiceGeneratedAt" TIMESTAMP(3),
    "voiceSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefDataSnapshot" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "weather" JSONB NOT NULL,
    "market" JSONB NOT NULL,
    "goldSilver" JSONB NOT NULL,
    "zodiac" JSONB NOT NULL,
    "numerology" JSONB NOT NULL,
    "positiveNews" JSONB NOT NULL,
    "affirmation" JSONB NOT NULL,
    "kindnessTask" JSONB NOT NULL,
    "powerHours" JSONB NOT NULL,
    "luckySignals" JSONB NOT NULL,
    "dataFreshness" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefDataSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "status" "StreakStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreakLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefId" TEXT,
    "kind" "DeliveryKind" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "localDate" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "providerMessageId" TEXT,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVoiceId" TEXT,
    "languageCode" TEXT NOT NULL,
    "status" "VoiceProfileStatus" NOT NULL DEFAULT 'PRESET',
    "consentEvidenceUrl" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefId" TEXT,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "command" TEXT,
    "body" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsCandidate" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "status" "NewsCandidateStatus" NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "category" "ContentItemCategory" NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actor" TEXT NOT NULL,
    "type" "AdminActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free_pilot',
    "isFreePilot" BOOLEAN NOT NULL DEFAULT true,
    "voiceAddOn" BOOLEAN NOT NULL DEFAULT false,
    "customVoiceBeta" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_timezone_preferredSendTime_idx" ON "User"("timezone", "preferredSendTime");

-- CreateIndex
CREATE INDEX "User_country_city_idx" ON "User"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "OnboardingSession_phone_idx" ON "OnboardingSession"("phone");

-- CreateIndex
CREATE INDEX "OnboardingSession_status_idx" ON "OnboardingSession"("status");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_type_status_idx" ON "ConsentRecord"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "DailyBrief_briefDate_status_idx" ON "DailyBrief"("briefDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBrief_userId_briefDate_key" ON "DailyBrief"("userId", "briefDate");

-- CreateIndex
CREATE UNIQUE INDEX "BriefDataSnapshot_briefId_key" ON "BriefDataSnapshot"("briefId");

-- CreateIndex
CREATE INDEX "StreakLedger_localDate_status_idx" ON "StreakLedger"("localDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StreakLedger_userId_localDate_key" ON "StreakLedger"("userId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryJob_idempotencyKey_key" ON "DeliveryJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DeliveryJob_status_dueAt_idx" ON "DeliveryJob"("status", "dueAt");

-- CreateIndex
CREATE INDEX "DeliveryJob_userId_localDate_idx" ON "DeliveryJob"("userId", "localDate");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_provider_status_idx" ON "DeliveryAttempt"("provider", "status");

-- CreateIndex
CREATE INDEX "VoiceProfile_userId_status_idx" ON "VoiceProfile"("userId", "status");

-- CreateIndex
CREATE INDEX "ProviderMessage_providerMessageId_idx" ON "ProviderMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "ProviderMessage_userId_createdAt_idx" ON "ProviderMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsCandidate_country_region_status_idx" ON "NewsCandidate"("country", "region", "status");

-- CreateIndex
CREATE INDEX "ContentItem_category_languageCode_status_idx" ON "ContentItem"("category", "languageCode", "status");

-- CreateIndex
CREATE INDEX "AdminAction_actor_type_idx" ON "AdminAction"("actor", "type");

-- CreateIndex
CREATE INDEX "AdminAction_userId_createdAt_idx" ON "AdminAction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_target_createdAt_idx" ON "AuditEvent"("target", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PilotEntitlement_userId_key" ON "PilotEntitlement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_languageCode_key" ON "WhatsAppTemplate"("name", "languageCode");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBrief" ADD CONSTRAINT "DailyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefDataSnapshot" ADD CONSTRAINT "BriefDataSnapshot_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "DailyBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakLedger" ADD CONSTRAINT "StreakLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryJob" ADD CONSTRAINT "DeliveryJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryJob" ADD CONSTRAINT "DeliveryJob_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "DailyBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeliveryJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessage" ADD CONSTRAINT "ProviderMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMessage" ADD CONSTRAINT "ProviderMessage_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "DailyBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotEntitlement" ADD CONSTRAINT "PilotEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
