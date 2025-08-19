-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('VIDEO', 'IMAGE', 'AUDIO', 'TEXT');

-- CreateEnum
CREATE TYPE "public"."EmbedProvider" AS ENUM ('YOUTUBE', 'TWITTER', 'INSTAGRAM', 'TIKTOK', 'OTHER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stadium" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "openingDate" TIMESTAMP(3),
    "architect" TEXT,
    "surface" TEXT,
    "roof" TEXT,
    "pitchDimensions" TEXT,
    "history" TEXT,
    "wikiUrl" TEXT,
    "wikiImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stadium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "league" TEXT,
    "country" TEXT,
    "wikiUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StadiumTeam" (
    "stadiumId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "StadiumTeam_pkey" PRIMARY KEY ("stadiumId","teamId")
);

-- CreateTable
CREATE TABLE "public"."MediaItem" (
    "id" TEXT NOT NULL,
    "stadiumId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "public"."MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SocialEmbed" (
    "id" TEXT NOT NULL,
    "stadiumId" TEXT NOT NULL,
    "provider" "public"."EmbedProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialEmbed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "idx_stadium_name" ON "public"."Stadium"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_country_key" ON "public"."Team"("name", "country");

-- CreateIndex
CREATE INDEX "MediaItem_stadiumId_idx" ON "public"."MediaItem"("stadiumId");

-- CreateIndex
CREATE INDEX "MediaItem_type_idx" ON "public"."MediaItem"("type");

-- CreateIndex
CREATE INDEX "SocialEmbed_stadiumId_provider_idx" ON "public"."SocialEmbed"("stadiumId", "provider");

-- AddForeignKey
ALTER TABLE "public"."StadiumTeam" ADD CONSTRAINT "StadiumTeam_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "public"."Stadium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StadiumTeam" ADD CONSTRAINT "StadiumTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaItem" ADD CONSTRAINT "MediaItem_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "public"."Stadium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaItem" ADD CONSTRAINT "MediaItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SocialEmbed" ADD CONSTRAINT "SocialEmbed_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "public"."Stadium"("id") ON DELETE CASCADE ON UPDATE CASCADE;
