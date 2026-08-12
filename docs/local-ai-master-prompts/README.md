# Local AI Master Dataset Prompts — All Characters

RTX / ComfyUI / FLUX / SDXL용 Master 16장 프롬프트.

| Character | File | Inbox path |
|-----------|------|------------|
| Yuna 유나 | [LOCAL_AI_YUNA_MASTER_PROMPTS.md](../LOCAL_AI_YUNA_MASTER_PROMPTS.md) | `D:\PickMeTalk_PhotoLibrary\master\yuna\_inbox\` |
| Narin 나린 | [LOCAL_AI_NARIN_MASTER_PROMPTS.md](./LOCAL_AI_NARIN_MASTER_PROMPTS.md) | `D:\PickMeTalk_PhotoLibrary\master\narin\_inbox\` |
| Yunseo 윤서 | [LOCAL_AI_YUNSEO_MASTER_PROMPTS.md](./LOCAL_AI_YUNSEO_MASTER_PROMPTS.md) | `D:\PickMeTalk_PhotoLibrary\master\yunseo\_inbox\` |
| Eunha 은하 | [LOCAL_AI_EUNHA_MASTER_PROMPTS.md](./LOCAL_AI_EUNHA_MASTER_PROMPTS.md) | `D:\PickMeTalk_PhotoLibrary\master\eunha\_inbox\` |
| Jiyu 지유 | [LOCAL_AI_JIYU_MASTER_PROMPTS.md](./LOCAL_AI_JIYU_MASTER_PROMPTS.md) | `D:\PickMeTalk_PhotoLibrary\master\jiyu\_inbox\` |

## 공통 Negative 베이스

```
different person, different face, face morph, identity drift, cartoon, anime, illustration, 3d render, cgi, plastic skin, deformed face, asymmetrical eyes, extra fingers, bad anatomy, uncanny valley, western features, heavy makeup, over-smoothed skin, watermark, text, logo
```

Yuna 유나도 동일 구조: `docs/LOCAL_AI_YUNA_MASTER_PROMPTS.md`

재생성:

```powershell
npx tsx scripts/generate-local-ai-master-prompts.ts
```
