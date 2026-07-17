# Midjourney 자동 생성 (수동 복붙 없이)

Cloud Agent / Cursor는 **당신 Discord 계정에 로그인할 수 없습니다.**  
Windows PC에서 ops 프로세스가 Midjourney 프록시 API로 `/imagine`을 제출합니다.

> Midjourney는 공식 공개 API가 없습니다. 자동화는 Discord를 대행하는 **프록시 서비스**(예: useapi.net 계열) + 본인 Midjourney 구독이 필요합니다. Discord/Midjourney 이용약관을 확인하세요.

## 핵심 원칙

1. **얼굴 고정이 최우선** — Identity Lock + `--cref` (캐릭터 레퍼런스 URL)
2. **`--relax` 강제** — Fast 스팸 방지, 기본 on
3. **제출 간격** — 기본 120초 (`MJ_AUTO_DELAY_MS`)
4. **동시 작업 1건** — rate limit 회피
5. 이미지는 `Downloads\PickMeTalk_MJ`로 자동 다운로드 → Watch ingest

## 1. 환경변수 (`.env`)

```env
PICKMETALK_RUNTIME=production
PHOTO_LIBRARY_ROOT=D:/PickMeTalk_PhotoLibrary
MJ_IMPORT_WATCH_FOLDER=C:/Users/user/Downloads/PickMeTalk_MJ

# Midjourney proxy (useapi.net 호환)
MJ_PROXY_BASE_URL=https://api.useapi.net/v2
MJ_PROXY_TOKEN=your_proxy_api_token
MJ_DISCORD_TOKEN=your_discord_user_token
MJ_DISCORD_SERVER_ID=your_server_id
MJ_DISCORD_CHANNEL_ID=your_channel_id
MJ_PROXY_MAX_JOBS=1

# Face lock (CRITICAL) — Discord/CDN에 올린 유나 얼굴 레퍼런스 이미지 URL
MJ_CREF_YUNA=https://cdn.example.com/yuna-face-ref.png
MJ_CREF_WEIGHT=100

# Relax + rate limit
MJ_FORCE_RELAX=1
MJ_AUTO_DELAY_MS=120000
MJ_JOB_TIMEOUT_MS=900000
MJ_JOB_POLL_MS=15000
```

### Discord 토큰 / 채널 ID

- Discord Desktop → Developer Mode ON → 채널 우클릭 Copy Channel ID / Server ID  
- User token은 **본인 계정·로컬 `.env`에만** 보관 (Git에 커밋 금지)

### `--cref` 얼굴 레퍼런스

1. 유나 기준 얼굴 사진 1~3장을 Discord 또는 CDN에 업로드  
2. **이미지 URL**을 `MJ_CREF_YUNA`에 넣기  
3. Queue/Manifest 재생성 시 프롬프트에 `--cref … --cw 100` 자동 첨부

## 2. Windows 실행 (터미널 2개)

```powershell
cd C:\Users\user\ai_girlfriend_app
git pull origin main
npm install

# Terminal A — Watch + Dashboard (ingest)
npm run mj:production

# Terminal B — Queue(Yuna 150) + Manifest 만
npm run mj:phase1 -- --no-watch

# Terminal B — 자동 생성 (복사-붙여넣기 없음)
npm run mj:auto -- --character=yuna --limit=150
```

소량 테스트:

```powershell
npm run mj:auto -- --character=yuna --limit=3
npm run mj:auto -- --dry-run
```

## 3. 처리 흐름

```
Queue job (awaiting_import)
  → Proxy /imagine (--relax + --cref)
  → poll 완료
  → 이미지 다운로드 → Downloads\PickMeTalk_MJ
  → mj:production Watch → Face/Quality/meta/thumbnail/catalog
  → ACTIVE / REVIEW / REJECT
  → REJECT/REVIEW 는 regenerate 큐로 재시도
```

## 4. QA / 통계

```powershell
npm run mj:production -- --stats
```

Gate PASS 후 Phase 500 확장.

## 5. Cloud Agent가 하지 않는 것

- Discord 로그인  
- Midjourney 봇에 직접 메시지  
- 사용자 비밀번호 요청  

자동화는 **Windows + 프록시 자격증명**으로만 동작합니다.
