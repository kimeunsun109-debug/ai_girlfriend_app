-- PickMeTalk — PostgreSQL schema for Supabase SQL Editor
-- Source: prisma/schema.prisma (regenerate: npm run db:schema:sql)
--
-- Usage:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file and Run (fresh project only)
--   3. Then run supabase/seed.sql
--
-- Note: Re-running on an existing database will fail on duplicate types/tables.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('SELFIE_BED', 'SELFIE_MIRROR', 'SELFIE_GENERAL', 'COFFEE_CAFE', 'WORK_OVERTIME', 'WORK_LEAVE', 'EXERCISE_GYM', 'EXERCISE_RUNNING', 'WALK', 'HAIR_SALON', 'NAIL_ART', 'DRINKING', 'FOOD_TTEOKBOKKI', 'FOOD_RAMEN', 'FOOD_BURGER', 'FOOD_BAKERY', 'FOOD_COOKING', 'GAME', 'MOVIE', 'SHOPPING', 'DRIVING', 'RAIN', 'SNOW', 'CHERRY_BLOSSOM', 'SEA', 'CAMPING', 'HOME_LOUNGE', 'READING', 'LATE_NIGHT_SNACK', 'BEFORE_MAKEUP', 'AFTER_MAKEUP', 'TIRED_FACE', 'FRIENDS', 'BRUNCH', 'WEEKEND_OUT', 'HAPPY', 'SAD', 'CRYING', 'LAUGHING', 'SLEEPY');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'LATE_NIGHT');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'EXECUTED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PushType" AS ENUM ('REGULAR', 'SPECIAL_DAY', 'FOLLOW_UP', 'LIVING_EVENT');

-- CreateEnum
CREATE TYPE "FollowUpStage" AS ENUM ('AFTER_30_MIN', 'AFTER_2_HOURS', 'NEXT_DAY', 'LATE_REPLY_RESPONSE', 'NEGATIVE_REPLY_RESPONSE', 'POSITIVE_REPLY_RESPONSE');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('USER', 'CHARACTER');

-- CreateEnum
CREATE TYPE "SpecialDayType" AS ENUM ('BIRTHDAY', 'ANNIVERSARY', 'DAY_100', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LivingEmotion" AS ENUM ('HAPPY', 'SLEEPY', 'SAD', 'EXCITED', 'ANGRY', 'EMBARRASSED', 'LOVE', 'BORED', 'HUNGRY', 'TIRED', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "MemoryCategory" AS ENUM ('PREFERENCE', 'FOOD', 'DISLIKE', 'JOB', 'LIFESTYLE', 'BIRTHDAY', 'HOBBY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LifeEventType" AS ENUM ('HAIR', 'NAIL', 'SHOPPING', 'CAFE', 'EXERCISE', 'MOVIE', 'DRIVE', 'WALK', 'LATE_NIGHT_SNACK', 'DRINKING', 'RAIN', 'SICK', 'BIRTHDAY', 'TRAVEL', 'NEW_OUTFIT', 'SELFIE', 'WORK', 'LUNCH', 'COMMUTE', 'SLEEP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PHOTO_PUSH', 'TEXT_NUDGE', 'MEMORY_REMINDER', 'EVENT_PHOTO', 'ANNIVERSARY', 'MEMORY_REPLAY');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('FIRST_MEET', 'FIRST_PHOTO', 'FIRST_SELFIE', 'FIRST_GIFT', 'FIRST_CALL', 'FIRST_LAUGH', 'FIRST_JEALOUSY', 'FIRST_FIGHT', 'RECONCILE', 'BIRTHDAY', 'ANNIVERSARY', 'DAY_100', 'DAY_200', 'FIRST_TRIP', 'FIRST_RAINY_DAY', 'FIRST_CHRISTMAS', 'FIRST_NEW_YEAR', 'PHOTO_SENT', 'GIFT_SENT', 'CALL', 'SPECIAL_CHAT', 'EVENT', 'STAGE_UP', 'MEMORY_REPLAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlbumCategory" AS ENUM ('SELFIE', 'FOOD', 'CAFE', 'ANNIVERSARY', 'GIFT', 'SPRING', 'RAIN', 'CHRISTMAS', 'NEW_YEAR', 'COUPLE', 'TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "PersonalityTrait" AS ENUM ('AEGYO', 'PLAYFULNESS', 'TALKATIVENESS', 'JEALOUSY', 'CURIOSITY', 'CARE', 'SENSITIVITY', 'LOGIC', 'CONFIDENCE', 'ACTIVITY', 'INDEPENDENCE', 'LEADERSHIP', 'SHYNESS', 'OPTIMISM', 'EMPATHY', 'EXPRESSIVENESS', 'ROMANTIC', 'HUMOR', 'ADVENTURE', 'ATTACHMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "country" TEXT NOT NULL DEFAULT 'KR',
    "birthday" TIMESTAMP(3),
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "frequencyMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "speechStyle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCharacter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "relationshipStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day100Date" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "affectionScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "relationshipLevel" INTEGER NOT NULL DEFAULT 1,
    "relationshipStageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterPhoto" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" "PhotoCategory" NOT NULL,
    "categorySlug" TEXT,
    "relativePath" TEXT,
    "emotion" TEXT,
    "tags" TEXT[],
    "expression" TEXT,
    "background" TEXT,
    "lighting" TEXT,
    "cameraAngle" TEXT,
    "outfit" TEXT,
    "hairstyle" TEXT,
    "season" "Season",
    "weather" "Weather",
    "timeOfDay" "TimeOfDay",
    "contentHash" TEXT,
    "status" "PhotoStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentPhotoHistory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentPhotoHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "pushType" "PushType" NOT NULL DEFAULT 'REGULAR',
    "photoId" TEXT,
    "message" TEXT,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "PushSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "photoId" TEXT,
    "message" TEXT NOT NULL,
    "photoCategory" "PhotoCategory",
    "pushType" "PushType" NOT NULL DEFAULT 'REGULAR',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "clickedAt" TIMESTAMP(3),
    "photoViewed" BOOLEAN NOT NULL DEFAULT false,
    "photoViewedAt" TIMESTAMP(3),
    "replied" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),
    "replyLatencyMs" INTEGER,
    "conversationStarted" BOOLEAN NOT NULL DEFAULT false,
    "conversationLength" INTEGER NOT NULL DEFAULT 0,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "emojiUsed" BOOLEAN NOT NULL DEFAULT false,
    "reconnectedAt" TIMESTAMP(3),

    CONSTRAINT "PushLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpScenario" (
    "id" TEXT NOT NULL,
    "pushLogId" TEXT NOT NULL,
    "stage" "FollowUpStage" NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "triggerCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "pushLogId" TEXT,
    "sender" "MessageSender" NOT NULL,
    "content" TEXT NOT NULL,
    "hasEmoji" BOOLEAN NOT NULL DEFAULT false,
    "isLike" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkipDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skipDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'intentional_absence',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkipDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSpecialDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SpecialDayType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSpecialDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPushQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "maxCount" INTEGER NOT NULL DEFAULT 2,
    "bonusCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyPushQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "totalPushesSent" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalReplies" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgReplyLatencyMs" INTEGER,
    "avgConversationLength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retentionRate" DOUBLE PRECISION,
    "skipDayReconnectRate" DOUBLE PRECISION,
    "optimalPushHour" INTEGER,
    "optimalPushDayOfWeek" INTEGER,
    "topPhotoCategory" "PhotoCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentMessageHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentMessageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOptimalTime" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hourWeights" JSONB NOT NULL,
    "dayWeights" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOptimalTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterEmotionState" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "emotion" "LivingEmotion" NOT NULL DEFAULT 'NEUTRAL',
    "intensity" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "triggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterEmotionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortTermMemory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "emotion" "LivingEmotion",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reminded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortTermMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LongTermMemory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "category" "MemoryCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LongTermMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterDailyRoutine" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "activities" JSONB NOT NULL,
    "daySeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterDailyRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLifeEvent" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "eventType" "LifeEventType" NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "emotion" "LivingEmotion" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "pushed" BOOLEAN NOT NULL DEFAULT false,
    "pushLogId" TEXT,
    "probability" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLifeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationQueueItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'PHOTO_PUSH',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "pushScheduleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryTimeline" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "photoId" TEXT,
    "photoUrl" TEXT,
    "pushLogId" TEXT,
    "albumCategory" "AlbumCategory",
    "emotionalIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anniversary" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "dayCount" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "celebratedAt" TIMESTAMP(3),
    "isCelebrated" BOOLEAN NOT NULL DEFAULT false,
    "timelineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anniversary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedMemory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "recallPhrase" TEXT NOT NULL,
    "emotionalIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "lastRecalledAt" TIMESTAMP(3),
    "recallCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryAlbumItem" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "albumCategory" "AlbumCategory" NOT NULL,
    "photoId" TEXT,
    "photoUrl" TEXT NOT NULL,
    "title" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "timelineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryAlbumItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipReward" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "stageLevel" INTEGER NOT NULL,
    "rewardKey" TEXT NOT NULL,
    "rewardLabel" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipStageHistory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "stageLevel" INTEGER NOT NULL,
    "stageName" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipStage" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minAffection" DOUBLE PRECISION NOT NULL,
    "maxAffection" DOUBLE PRECISION NOT NULL,
    "speechStyle" TEXT NOT NULL,
    "rewards" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "RelationshipStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityDNA" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "traitKey" "PersonalityTrait" NOT NULL,
    "coreValue" INTEGER NOT NULL,
    "adaptiveValue" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "lastUpdatedReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalityDNA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityHistory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "traitKey" "PersonalityTrait" NOT NULL,
    "previousValue" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "newValue" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLearning" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "habitKey" TEXT NOT NULL,
    "value" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "preferenceKey" TEXT NOT NULL,
    "likesScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dislikesScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "traitKey" "PersonalityTrait",
    "delta" INTEGER,
    "emotionalIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptiveMemory" (
    "id" TEXT NOT NULL,
    "userCharacterId" TEXT NOT NULL,
    "traitKey" "PersonalityTrait",
    "memoryType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "trigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptiveMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_timezone_idx" ON "User"("timezone");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "WebPushSubscription_userId_idx" ON "WebPushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");

-- CreateIndex
CREATE INDEX "UserCharacter_userId_idx" ON "UserCharacter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCharacter_userId_characterId_key" ON "UserCharacter"("userId", "characterId");

-- CreateIndex
CREATE INDEX "CharacterPhoto_characterId_category_idx" ON "CharacterPhoto"("characterId", "category");

-- CreateIndex
CREATE INDEX "CharacterPhoto_characterId_categorySlug_idx" ON "CharacterPhoto"("characterId", "categorySlug");

-- CreateIndex
CREATE INDEX "CharacterPhoto_characterId_categorySlug_emotion_idx" ON "CharacterPhoto"("characterId", "categorySlug", "emotion");

-- CreateIndex
CREATE INDEX "CharacterPhoto_characterId_timeOfDay_idx" ON "CharacterPhoto"("characterId", "timeOfDay");

-- CreateIndex
CREATE INDEX "SentPhotoHistory_userCharacterId_sentAt_idx" ON "SentPhotoHistory"("userCharacterId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "SentPhotoHistory_userCharacterId_photoId_key" ON "SentPhotoHistory"("userCharacterId", "photoId");

-- CreateIndex
CREATE INDEX "PushSchedule_status_scheduledAt_idx" ON "PushSchedule"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "PushSchedule_userId_scheduledAt_idx" ON "PushSchedule"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "PushLog_userId_sentAt_idx" ON "PushLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "PushLog_characterId_photoCategory_idx" ON "PushLog"("characterId", "photoCategory");

-- CreateIndex
CREATE INDEX "PushLog_sentAt_idx" ON "PushLog"("sentAt");

-- CreateIndex
CREATE INDEX "FollowUpScenario_status_scheduledAt_idx" ON "FollowUpScenario"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUpScenario_pushLogId_idx" ON "FollowUpScenario"("pushLogId");

-- CreateIndex
CREATE INDEX "ChatMessage_userCharacterId_sentAt_idx" ON "ChatMessage"("userCharacterId", "sentAt");

-- CreateIndex
CREATE INDEX "ChatMessage_pushLogId_idx" ON "ChatMessage"("pushLogId");

-- CreateIndex
CREATE INDEX "SkipDay_userId_skipDate_idx" ON "SkipDay"("userId", "skipDate");

-- CreateIndex
CREATE UNIQUE INDEX "SkipDay_userId_skipDate_key" ON "SkipDay"("userId", "skipDate");

-- CreateIndex
CREATE INDEX "UserSpecialDay_userId_idx" ON "UserSpecialDay"("userId");

-- CreateIndex
CREATE INDEX "UserSpecialDay_date_idx" ON "UserSpecialDay"("date");

-- CreateIndex
CREATE INDEX "DailyPushQuota_userId_date_idx" ON "DailyPushQuota"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPushQuota_userId_date_key" ON "DailyPushQuota"("userId", "date");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_userId_periodDays_idx" ON "AnalyticsSnapshot"("userId", "periodDays");

-- CreateIndex
CREATE INDEX "SentMessageHistory_userId_sentAt_idx" ON "SentMessageHistory"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserOptimalTime_userId_key" ON "UserOptimalTime"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterEmotionState_userCharacterId_key" ON "CharacterEmotionState"("userCharacterId");

-- CreateIndex
CREATE INDEX "ShortTermMemory_userCharacterId_expiresAt_idx" ON "ShortTermMemory"("userCharacterId", "expiresAt");

-- CreateIndex
CREATE INDEX "ShortTermMemory_userCharacterId_reminded_idx" ON "ShortTermMemory"("userCharacterId", "reminded");

-- CreateIndex
CREATE INDEX "LongTermMemory_userCharacterId_category_idx" ON "LongTermMemory"("userCharacterId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "LongTermMemory_userCharacterId_category_key_key" ON "LongTermMemory"("userCharacterId", "category", "key");

-- CreateIndex
CREATE INDEX "CharacterDailyRoutine_userCharacterId_date_idx" ON "CharacterDailyRoutine"("userCharacterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterDailyRoutine_userCharacterId_date_key" ON "CharacterDailyRoutine"("userCharacterId", "date");

-- CreateIndex
CREATE INDEX "DailyLifeEvent_userCharacterId_date_idx" ON "DailyLifeEvent"("userCharacterId", "date");

-- CreateIndex
CREATE INDEX "DailyLifeEvent_scheduledAt_pushed_idx" ON "DailyLifeEvent"("scheduledAt", "pushed");

-- CreateIndex
CREATE INDEX "NotificationQueueItem_status_scheduledAt_idx" ON "NotificationQueueItem"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationQueueItem_userId_scheduledAt_idx" ON "NotificationQueueItem"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "MemoryTimeline_userCharacterId_occurredAt_idx" ON "MemoryTimeline"("userCharacterId", "occurredAt");

-- CreateIndex
CREATE INDEX "MemoryTimeline_userCharacterId_eventType_idx" ON "MemoryTimeline"("userCharacterId", "eventType");

-- CreateIndex
CREATE INDEX "Anniversary_userCharacterId_scheduledDate_idx" ON "Anniversary"("userCharacterId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "Anniversary_userCharacterId_dayCount_key" ON "Anniversary"("userCharacterId", "dayCount");

-- CreateIndex
CREATE INDEX "SharedMemory_userCharacterId_occurredAt_idx" ON "SharedMemory"("userCharacterId", "occurredAt");

-- CreateIndex
CREATE INDEX "SharedMemory_userCharacterId_emotionalIntensity_idx" ON "SharedMemory"("userCharacterId", "emotionalIntensity");

-- CreateIndex
CREATE INDEX "MemoryAlbumItem_userCharacterId_albumCategory_idx" ON "MemoryAlbumItem"("userCharacterId", "albumCategory");

-- CreateIndex
CREATE INDEX "MemoryAlbumItem_userCharacterId_capturedAt_idx" ON "MemoryAlbumItem"("userCharacterId", "capturedAt");

-- CreateIndex
CREATE INDEX "RelationshipReward_userCharacterId_stageLevel_idx" ON "RelationshipReward"("userCharacterId", "stageLevel");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipReward_userCharacterId_rewardKey_key" ON "RelationshipReward"("userCharacterId", "rewardKey");

-- CreateIndex
CREATE INDEX "RelationshipStageHistory_userCharacterId_reachedAt_idx" ON "RelationshipStageHistory"("userCharacterId", "reachedAt");

-- CreateIndex
CREATE INDEX "PersonalityDNA_userCharacterId_adaptiveValue_idx" ON "PersonalityDNA"("userCharacterId", "adaptiveValue");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityDNA_userCharacterId_traitKey_key" ON "PersonalityDNA"("userCharacterId", "traitKey");

-- CreateIndex
CREATE INDEX "PersonalityHistory_userCharacterId_createdAt_idx" ON "PersonalityHistory"("userCharacterId", "createdAt");

-- CreateIndex
CREATE INDEX "PersonalityHistory_userCharacterId_traitKey_idx" ON "PersonalityHistory"("userCharacterId", "traitKey");

-- CreateIndex
CREATE INDEX "HabitLearning_userCharacterId_score_idx" ON "HabitLearning"("userCharacterId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLearning_userCharacterId_habitKey_key" ON "HabitLearning"("userCharacterId", "habitKey");

-- CreateIndex
CREATE INDEX "UserPreference_userCharacterId_likesScore_idx" ON "UserPreference"("userCharacterId", "likesScore");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userCharacterId_preferenceKey_key" ON "UserPreference"("userCharacterId", "preferenceKey");

-- CreateIndex
CREATE INDEX "GrowthEvent_userCharacterId_happenedAt_idx" ON "GrowthEvent"("userCharacterId", "happenedAt");

-- CreateIndex
CREATE INDEX "AdaptiveMemory_userCharacterId_createdAt_idx" ON "AdaptiveMemory"("userCharacterId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCharacter" ADD CONSTRAINT "UserCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCharacter" ADD CONSTRAINT "UserCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPhoto" ADD CONSTRAINT "CharacterPhoto_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentPhotoHistory" ADD CONSTRAINT "SentPhotoHistory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentPhotoHistory" ADD CONSTRAINT "SentPhotoHistory_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "CharacterPhoto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSchedule" ADD CONSTRAINT "PushSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushLog" ADD CONSTRAINT "PushLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushLog" ADD CONSTRAINT "PushLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushLog" ADD CONSTRAINT "PushLog_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "CharacterPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpScenario" ADD CONSTRAINT "FollowUpScenario_pushLogId_fkey" FOREIGN KEY ("pushLogId") REFERENCES "PushLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkipDay" ADD CONSTRAINT "SkipDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSpecialDay" ADD CONSTRAINT "UserSpecialDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEmotionState" ADD CONSTRAINT "CharacterEmotionState_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortTermMemory" ADD CONSTRAINT "ShortTermMemory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LongTermMemory" ADD CONSTRAINT "LongTermMemory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterDailyRoutine" ADD CONSTRAINT "CharacterDailyRoutine_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLifeEvent" ADD CONSTRAINT "DailyLifeEvent_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationQueueItem" ADD CONSTRAINT "NotificationQueueItem_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryTimeline" ADD CONSTRAINT "MemoryTimeline_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anniversary" ADD CONSTRAINT "Anniversary_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedMemory" ADD CONSTRAINT "SharedMemory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryAlbumItem" ADD CONSTRAINT "MemoryAlbumItem_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryAlbumItem" ADD CONSTRAINT "MemoryAlbumItem_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "MemoryTimeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipReward" ADD CONSTRAINT "RelationshipReward_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipStageHistory" ADD CONSTRAINT "RelationshipStageHistory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityDNA" ADD CONSTRAINT "PersonalityDNA_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityHistory" ADD CONSTRAINT "PersonalityHistory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLearning" ADD CONSTRAINT "HabitLearning_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptiveMemory" ADD CONSTRAINT "AdaptiveMemory_userCharacterId_fkey" FOREIGN KEY ("userCharacterId") REFERENCES "UserCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

