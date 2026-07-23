# Jiyu (지유) — Local AI Master Dataset Prompts (16)

RTX / ComfyUI / FLUX / SDXL용. Face Reference(IP-Adapter/PuLID) 권장.

## 사용법

1. M01부터 생성 → 통과 얼굴을 레퍼런스로 고정
2. Positive / Negative 붙여넣기 · 해상도 **768×1024** (3:4)
3. 통과 16장 → `D:\PickMeTalk_PhotoLibrary\master\jiyu\_inbox\`
4. `npm run factory:profile -- --character=jiyu`

---

## Shared Identity

```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter
```

## Shared Negative

```
different person, different face, face morph, identity drift, cartoon, anime, illustration, 3d render, cgi, plastic skin, deformed face, asymmetrical eyes, extra fingers, bad anatomy, uncanny valley, western features, heavy makeup, over-smoothed skin, watermark, text, logo, formal suit, stiff pose, short bob unless specified, overly glamorous makeup, office lady look
```

---

## M01 — 정면 · 무표정 · 실내 · 머리 내림 · 캐주얼

`m01_front_neutral_indoor_down_casual`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, neutral calm expression, closed mouth, soft indoor lighting, natural window light, trendy long hair down, oversized hoodie or trendy casual streetwear, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M02 — 정면 · 미소 · 실내 · 머리 내림 · 셀카

`m02_front_smile_indoor_down_selfie`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, gentle natural smile, soft eyes, soft indoor lighting, natural window light, trendy long hair down, natural smartphone selfie framing, slight arm perspective, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M03 — 정면 · 웃음 · 야외 · 머리 내림 · 데일리룩

`m03_front_laugh_outdoor_down_daily`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, laughing candidly, joyful expression, natural outdoor daylight, trendy long hair down, oversized hoodie or trendy casual streetwear, trendy relaxed cool girlfriend vibe, playful energy, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M04 — 정면 · 미소 · 야외 · 머리 올림 · 캐주얼

`m04_front_smile_outdoor_up_casual`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, gentle natural smile, soft eyes, natural outdoor daylight, trendy high or mid ponytail, oversized hoodie or trendy casual streetwear, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M05 — 왼쪽 45° · 무표정 · 실내 · 머리 내림 · 데일리룩

`m05_left45_neutral_indoor_down_daily`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, three-quarter view from left, face turned 45 degrees, neutral calm expression, closed mouth, soft indoor lighting, natural window light, trendy long hair down, oversized hoodie or trendy casual streetwear, trendy relaxed cool girlfriend vibe, playful energy, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M06 — 왼쪽 45° · 미소 · 야외 · 머리 내림 · 셀카

`m06_left45_smile_outdoor_down_selfie`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, three-quarter view from left, face turned 45 degrees, gentle natural smile, soft eyes, natural outdoor daylight, trendy long hair down, natural smartphone selfie framing, slight arm perspective, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M07 — 오른쪽 45° · 무표정 · 실내 · 머리 내림 · 캐주얼

`m07_right45_neutral_indoor_down_casual`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, three-quarter view from right, face turned 45 degrees, neutral calm expression, closed mouth, soft indoor lighting, natural window light, trendy long hair down, oversized hoodie or trendy casual streetwear, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M08 — 오른쪽 45° · 미소 · 야외 · 머리 올림 · 데일리룩

`m08_right45_smile_outdoor_up_daily`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, three-quarter view from right, face turned 45 degrees, gentle natural smile, soft eyes, natural outdoor daylight, trendy high or mid ponytail, oversized hoodie or trendy casual streetwear, trendy relaxed cool girlfriend vibe, playful energy, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M09 — 왼쪽 프로필 · 무표정 · 실내 · 머리 내림 · 캐주얼

`m09_left_profile_neutral_indoor_down_casual`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, left side profile portrait, clear silhouette of nose and jaw, neutral calm expression, closed mouth, soft indoor lighting, natural window light, trendy long hair down, oversized hoodie or trendy casual streetwear, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M10 — 오른쪽 프로필 · 무표정 · 야외 · 머리 내림 · 데일리룩

`m10_right_profile_neutral_outdoor_down_daily`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, right side profile portrait, clear silhouette of nose and jaw, neutral calm expression, closed mouth, natural outdoor daylight, trendy long hair down, oversized hoodie or trendy casual streetwear, trendy relaxed cool girlfriend vibe, playful energy, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M11 — 정면 · 무표정 · 야외 · 머리 올림 · 셀카

`m11_front_neutral_outdoor_up_selfie`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, neutral calm expression, closed mouth, natural outdoor daylight, trendy high or mid ponytail, natural smartphone selfie framing, slight arm perspective, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M12 — 정면 · 웃음 · 실내 · 머리 올림 · 캐주얼

`m12_front_laugh_indoor_up_casual`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, laughing candidly, joyful expression, soft indoor lighting, natural window light, trendy high or mid ponytail, oversized hoodie or trendy casual streetwear, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M13 — 왼쪽 45° · 웃음 · 실내 · 머리 내림 · 데일리룩

`m13_left45_laugh_indoor_down_daily`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, three-quarter view from left, face turned 45 degrees, laughing candidly, joyful expression, soft indoor lighting, natural window light, trendy long hair down, oversized hoodie or trendy casual streetwear, trendy relaxed cool girlfriend vibe, playful energy, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M14 — 오른쪽 45° · 무표정 · 야외 · 머리 내림 · 셀카

`m14_right45_neutral_outdoor_down_selfie`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, three-quarter view from right, face turned 45 degrees, neutral calm expression, closed mouth, natural outdoor daylight, trendy long hair down, natural smartphone selfie framing, slight arm perspective, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M15 — 정면 · 미소 · 실내 · 머리 올림 · 데일리룩

`m15_front_smile_indoor_up_daily`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, gentle natural smile, soft eyes, soft indoor lighting, natural window light, trendy high or mid ponytail, oversized hoodie or trendy casual streetwear, trendy relaxed cool girlfriend vibe, playful energy, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

## M16 — 정면 · 무표정 · 야외 · 머리 내림 · 캐주얼

`m16_front_neutral_outdoor_down_casual`

**Positive**
```
SAME PERSON every photo — Jiyu, 21 year old Korean woman, trendy cool impression, bright free-spirited eyes, natural nose, friendly easygoing smile like a close friend, healthy bright skin, trendy long hair or ponytail style, athletic slim body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter, front-facing portrait, looking at camera, neutral calm expression, closed mouth, natural outdoor daylight, trendy long hair down, oversized hoodie or trendy casual streetwear, clean background, face fully visible, no occlusion, photorealistic, trendy relaxed cool girlfriend vibe, playful energy, KEEP EXACT SAME FACE
```

---

## 저장 파일명 예시

```
JIYU_MASTER_01.png … JIYU_MASTER_16.png
→ D:\PickMeTalk_PhotoLibrary\master\jiyu\_inbox\
```
