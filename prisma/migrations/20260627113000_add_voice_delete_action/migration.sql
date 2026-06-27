-- AlterEnum
-- Additive value for soft-deleting a loved-one/custom voice profile with audit.
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'VOICE_DELETE';
