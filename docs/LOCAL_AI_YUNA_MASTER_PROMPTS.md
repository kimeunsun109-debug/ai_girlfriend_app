# Yuna — Local AI Master Dataset Prompts (16)

RTX / ComfyUI / FLUX / SDXL용. Midjourney `--cref` 없이 **텍스트 + (가능하면) Face Reference 이미지**로 씁니다.

## 사용법

1. ComfyUI에서 **IP-Adapter / PuLID / InstantID** 등에 Master 후보 1장을 레퍼런스로 고정 (첫 장 생성 후부터).
2. 아래 Positive / Negative를 그대로 붙여넣기.
3. 해상도 권장: **768×1024** 또는 **832×1216** (3:4).
4. 통과한 16장만  
   `D:\PickMeTalk_PhotoLibrary\master\yuna\_inbox\`  
   에 넣고 `npm run factory:profile -- --character=yuna`

---

## Shared Identity (모든 샷 앞에 붙임)

```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips with subtle smile, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, slim natural body, NEVER change face shape eye shape or bone structure, identical facial identity, photorealistic, natural skin texture, shot on iPhone, no beauty filter
```

## Shared Negative

```
different person, different face, face morph, identity drift, cartoon, anime, illustration, 3d render, cgi, plastic skin, deformed face, asymmetrical eyes, extra fingers, bad anatomy, uncanny valley, western features, blonde hair, blue eyes, short bob, heavy makeup, over-smoothed skin, watermark, text, logo
```

---

## M01 — Front · Neutral · Indoor · Hair down · Casual

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing portrait looking at camera, neutral calm expression closed mouth, soft indoor window light, hair down, beige knit sweater casual everyday outfit, clean simple background, face fully visible, photorealistic, shot on iPhone
```

## M02 — Front · Smile · Indoor · Hair down · Selfie

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing natural smartphone selfie, gentle natural smile soft eyes, soft indoor window light, hair down, slight arm-length selfie perspective, college neighbor vibe, face fully visible, photorealistic, shot on iPhone
```

## M03 — Front · Laugh · Outdoor · Hair down · Daily

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing portrait looking at camera, laughing candidly joyful expression, natural outdoor daylight, hair down, Korean daily street style casual outfit, campus outdoor, face fully visible, photorealistic, shot on iPhone
```

## M04 — Front · Smile · Outdoor · Hair up · Casual

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing portrait looking at camera, gentle natural smile, natural outdoor daylight, hair up in low ponytail, casual everyday outfit, face fully visible, photorealistic, shot on iPhone
```

## M05 — Left 45° · Neutral · Indoor · Hair down · Daily

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, three-quarter view from left face turned 45 degrees, neutral calm expression closed mouth, soft indoor window light, hair down, daily Korean street style, face fully visible, photorealistic, shot on iPhone
```

## M06 — Left 45° · Smile · Outdoor · Hair down · Selfie

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, three-quarter view from left face turned 45 degrees, gentle natural smile, natural outdoor daylight, hair down, natural smartphone selfie framing, face fully visible, photorealistic, shot on iPhone
```

## M07 — Right 45° · Neutral · Indoor · Hair down · Casual

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, three-quarter view from right face turned 45 degrees, neutral calm expression closed mouth, soft indoor window light, hair down, beige knit casual outfit, face fully visible, photorealistic, shot on iPhone
```

## M08 — Right 45° · Smile · Outdoor · Hair up · Daily

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, NEVER change face shape eye shape or bone structure, identical facial identity, three-quarter view from right face turned 45 degrees, gentle natural smile, natural outdoor daylight, hair up in ponytail, Korean daily street style, face fully visible, photorealistic, shot on iPhone
```

## M09 — Left Profile · Neutral · Indoor · Hair down · Casual

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, left side profile portrait clear silhouette of nose and jaw, neutral calm expression, soft indoor window light, hair down, casual outfit, face fully visible no occlusion, photorealistic, shot on iPhone
```

## M10 — Right Profile · Neutral · Outdoor · Hair down · Daily

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, right side profile portrait clear silhouette of nose and jaw, neutral calm expression, natural outdoor daylight, hair down, daily Korean street style, face fully visible, photorealistic, shot on iPhone
```

## M11 — Front · Neutral · Outdoor · Hair up · Selfie

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing smartphone selfie, neutral calm expression closed mouth, natural outdoor daylight, hair up in ponytail, slight arm perspective, face fully visible, photorealistic, shot on iPhone
```

## M12 — Front · Laugh · Indoor · Hair up · Casual

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing portrait looking at camera, laughing candidly joyful expression, soft indoor window light, hair up in bun or ponytail, casual beige knit outfit, face fully visible, photorealistic, shot on iPhone
```

## M13 — Left 45° · Laugh · Indoor · Hair down · Daily

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, three-quarter view from left face turned 45 degrees, laughing candidly, soft indoor window light, hair down, daily Korean street style, face fully visible, photorealistic, shot on iPhone
```

## M14 — Right 45° · Neutral · Outdoor · Hair down · Selfie

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, three-quarter view from right face turned 45 degrees, neutral calm expression, natural outdoor daylight, hair down, natural smartphone selfie framing, face fully visible, photorealistic, shot on iPhone
```

## M15 — Front · Smile · Indoor · Hair up · Daily

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing portrait looking at camera, gentle natural smile soft eyes, soft indoor window light, hair up in ponytail, Korean daily look holding a book optional, face fully visible, photorealistic, shot on iPhone
```

## M16 — Front · Neutral · Outdoor · Hair down · Casual

**Positive**
```
SAME PERSON every photo — Yuna, 22 year old Korean woman, puppy-like soft face, gentle jawline, warm brown eyes with soft downturned outer corners, small natural nose, thin lips, bright warm-toned skin with natural pores, long straight dark brown almost-black hair, NEVER change face shape eye shape or bone structure, identical facial identity, front-facing portrait looking at camera, neutral calm expression closed mouth, natural outdoor daylight, hair down, casual everyday outfit backpack optional, campus outdoor, face fully visible, photorealistic, shot on iPhone
```

---

## 저장 파일명 예시

```
YUNA_MASTER_01.png … YUNA_MASTER_16.png
→ D:\PickMeTalk_PhotoLibrary\master\yuna\_inbox\
```

## 대량 생산 (Master 이후)

Master 16장이 Face Identity로 잡힌 뒤, 생활샷은 Prompt Catalog 조합을 쓰세요.  
예: cafe / commute / bed / rain / selfie 등은 `assets/prompts/yuna/*.json` 또는  
`npm run factory:generate` (ComfyUI 워크플로 연결 후).

다른 캐릭터 Master 프롬프트: [`docs/local-ai-master-prompts/`](./local-ai-master-prompts/)
