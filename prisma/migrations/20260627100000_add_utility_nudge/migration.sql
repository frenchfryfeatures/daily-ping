ALTER TYPE "DeliveryKind" ADD VALUE IF NOT EXISTS 'DAILY_NUDGE';
ALTER TYPE "BriefStatus" ADD VALUE IF NOT EXISTS 'NUDGE_SENT';

UPDATE "User"
SET "source" = 'demo'
WHERE "id" IN (
  SELECT "userId"
  FROM "OnboardingSession"
  WHERE "userId" IS NOT NULL
    AND "payload"->>'source' = 'seed'
);

UPDATE "WhatsAppTemplate"
SET
  "name" = 'daily_dose_ready_v1',
  "languageCode" = 'en_US',
  "category" = 'UTILITY',
  "status" = 'APPROVED',
  "body" = 'Hello {{1}}, your requested Daily Dose for {{2}} is ready. Select Get Daily Dose below to receive today''s personalised briefing and voice option.',
  "variables" = ARRAY['name', 'date'],
  "lastReviewedAt" = NOW(),
  "updatedAt" = NOW()
WHERE "name" = 'daily_ping_morning_brief'
  AND "languageCode" = 'en';
