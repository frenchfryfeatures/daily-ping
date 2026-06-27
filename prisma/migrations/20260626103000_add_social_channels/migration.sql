ALTER TABLE "User" ADD COLUMN "instagramHandle" TEXT;
ALTER TABLE "User" ADD COLUMN "snapchatHandle" TEXT;
ALTER TABLE "User" ADD COLUMN "preferredChannels" TEXT[] NOT NULL DEFAULT ARRAY['whatsapp']::TEXT[];
