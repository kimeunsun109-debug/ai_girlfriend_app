-- PickMeTalk — seed data for Supabase SQL Editor
-- Run AFTER supabase/schema.sql on a fresh database.
-- Safe to re-run: uses ON CONFLICT / WHERE NOT EXISTS (idempotent).

-- Fixed IDs (match prisma/seed.ts and API demos)
-- Demo user:     00000000-0000-0000-0000-000000000010
-- Demo UC (유나): 00000000-0000-0000-0000-000000000020

BEGIN;

-- ─── Relationship stages (8단계) ───────────────────────────
INSERT INTO "RelationshipStage" ("id", "name", "nameKo", "description", "minAffection", "maxAffection", "speechStyle", "rewards")
VALUES
  (1, 'first_meet',     '처음 만남',           '어색하고 조심스러운 첫 만남', 0,  12, 'formal',    ARRAY[]::TEXT[]),
  (2, 'awkward',        '어색한 사이',         '조금씩 친해지는 중',         13, 25, 'polite',    ARRAY['selfie']::TEXT[]),
  (3, 'friends',        '친해진 사이',         '편하게 연락하는 사이',       26, 37, 'friendly',  ARRAY['voice_message']::TEXT[]),
  (4, 'daily_contact',  '매일 연락하는 사이', '하루도 빠지지 않고 연락',   38, 50, 'warm',      ARRAY['call']::TEXT[]),
  (5, 'some',           '썸',                 '설레는 썸 타는 사이',         51, 62, 'flirty',    ARRAY['jealousy']::TEXT[]),
  (6, 'lovers',         '연인',               '서로를 좋아하는 연인',       63, 75, 'loving',    ARRAY['nickname']::TEXT[]),
  (7, 'long_term',      '오래된 연인',         '오래 함께한 연인',           76, 88, 'intimate',  ARRAY['couple_photo']::TEXT[]),
  (8, 'forever',        '평생 함께',           '평생 함께할 사이',           89, 100, 'soulmate', ARRAY['special_event']::TEXT[])
ON CONFLICT ("id") DO UPDATE SET
  "nameKo" = EXCLUDED."nameKo",
  "description" = EXCLUDED."description",
  "minAffection" = EXCLUDED."minAffection",
  "maxAffection" = EXCLUDED."maxAffection",
  "speechStyle" = EXCLUDED."speechStyle",
  "rewards" = EXCLUDED."rewards";

-- ─── Characters (5명) ────────────────────────────────────────
INSERT INTO "Character" ("id", "slug", "name", "personality", "speechStyle", "createdAt")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'yuna',   '유나', '착하고 따뜻한 성격, 공부하러 가는 길에 사진 보내는 타입', '다정하고 부드러운 말투, "~해요" 체, 이모티콘 적당히', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'narin',  '나린', '겉으로는 차갑지만 은근히 챙겨주는 타입', '짧고 시크한 말투, 가끔 츤데레, "흥" "뭐야" ', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'yunseo', '윤서', '지적이고 단아한 이미지, 비 오는 날 창가 사진 잘 보냄', '정중하고 차분한 말투, 문장이 깔끔함', NOW()),
  ('00000000-0000-0000-0000-000000000004', 'eunha',  '은하', '예측 불가하지만 항상 밝은 에너지', '밝고 엉뚱한 말투, "ㅋㅋㅋ", 감탄사 많음', NOW()),
  ('00000000-0000-0000-0000-000000000005', 'jiyu',   '지유', '게임·방탈출·PC방 좋아하는 친근한 타입', '친구 같은 반말, "ㅋㅋ", "한 판만..."', NOW())
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "personality" = EXCLUDED."personality",
  "speechStyle" = EXCLUDED."speechStyle";

-- ─── Demo user ───────────────────────────────────────────────
INSERT INTO "User" ("id", "name", "age", "timezone", "country", "birthday", "pushEnabled", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '은선',
  28,
  'Asia/Seoul',
  'KR',
  '1998-03-15'::timestamp,
  true,
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "age" = EXCLUDED."age";

-- ─── Demo user ↔ 유나 relationship ──────────────────────────
INSERT INTO "UserCharacter" (
  "id", "userId", "characterId",
  "relationshipStartAt", "day100Date",
  "isActive", "affectionScore", "relationshipLevel", "relationshipStageAt",
  "createdAt"
)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '50 days',
  NOW() - INTERVAL '50 days' + INTERVAL '100 days',
  true,
  45,
  4,
  NOW(),
  NOW()
)
ON CONFLICT ("userId", "characterId") DO UPDATE SET
  "affectionScore" = EXCLUDED."affectionScore",
  "relationshipLevel" = EXCLUDED."relationshipLevel",
  "relationshipStartAt" = EXCLUDED."relationshipStartAt",
  "day100Date" = EXCLUDED."day100Date";

-- ─── Journey init: 첫 만남 타임라인 ──────────────────────────
INSERT INTO "MemoryTimeline" (
  "id", "userCharacterId", "eventType", "title", "description", "emoji",
  "emotionalIntensity", "occurredAt", "createdAt"
)
SELECT
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000020',
  'FIRST_MEET',
  '유나와(과) 첫 만남',
  '우리의 첫 시작',
  '😊',
  0.8,
  NOW() - INTERVAL '50 days',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "MemoryTimeline"
  WHERE "userCharacterId" = '00000000-0000-0000-0000-000000000020'
    AND "eventType" = 'FIRST_MEET'
);

-- ─── Journey init: 단계 이력 ─────────────────────────────────
INSERT INTO "RelationshipStageHistory" (
  "id", "userCharacterId", "stageLevel", "stageName", "reachedAt"
)
SELECT
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000020',
  1,
  '처음 만남',
  NOW() - INTERVAL '50 days'
WHERE NOT EXISTS (
  SELECT 1 FROM "RelationshipStageHistory"
  WHERE "userCharacterId" = '00000000-0000-0000-0000-000000000020'
    AND "stageLevel" = 1
);

-- ─── Anniversary milestones ──────────────────────────────────
INSERT INTO "Anniversary" ("id", "userCharacterId", "dayCount", "label", "scheduledDate", "createdAt")
SELECT
  gen_random_uuid()::text,
  '00000000-0000-0000-0000-000000000020',
  m.day_count,
  m.label,
  (SELECT "relationshipStartAt" FROM "UserCharacter" WHERE "id" = '00000000-0000-0000-0000-000000000020')
    + (m.day_count || ' days')::interval,
  NOW()
FROM (VALUES
  (1,   '1일'),
  (7,   '7일'),
  (30,  '30일'),
  (50,  '50일'),
  (100, '100일'),
  (200, '200일'),
  (300, '300일'),
  (365, '1주년'),
  (500, '500일'),
  (1000,'1000일')
) AS m(day_count, label)
ON CONFLICT ("userCharacterId", "dayCount") DO NOTHING;

COMMIT;

-- Demo IDs for API / UI testing:
--   userId:          00000000-0000-0000-0000-000000000010
--   userCharacterId: 00000000-0000-0000-0000-000000000020
-- Next: npm run photos:migrate  (local photo catalog)
