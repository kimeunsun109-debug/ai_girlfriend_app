/**
 * Lightweight HTML UI mockups — validate how photos look in PickMeTalk screens.
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { basename, join } from 'path';
import { FACTORY_PATHS, UI_MOCKUP_SCREENS } from '../../../config/hybrid-factory.config.js';
import { selectBestProfile, selectProfileCandidates } from './profile-selector.js';

export interface UiEvaluation {
  character: string;
  readability: number;
  thumbnailFaceVisible: number;
  contrast: number;
  characterDistinct: number;
  brandConsistency: number;
  overall: number;
  notes: string[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export async function renderUiMockups(character: string): Promise<{
  outDir: string;
  screens: string[];
  evaluation: UiEvaluation;
}> {
  const best = await selectBestProfile(character);
  const candidates = await selectProfileCandidates(character, 5);
  const outDir = join(FACTORY_PATHS.uiMockups, character);
  const assets = join(outDir, 'assets');
  mkdirSync(assets, { recursive: true });

  let profileRel = '';
  if (best && existsSync(best.path)) {
    const name = `profile_${basename(best.path)}`;
    copyFileSync(best.path, join(assets, name));
    profileRel = `assets/${name}`;
  }

  const screens: string[] = [];
  for (const screen of UI_MOCKUP_SCREENS) {
    const html = buildScreenHtml(character, screen, profileRel, best?.confidence ?? 0);
    const file = join(outDir, `${screen}.html`);
    writeFileSync(file, html);
    screens.push(file);
  }

  // index
  writeFileSync(
    join(outDir, 'index.html'),
    `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>${esc(character)} UI Mockups</title>
<style>body{font-family:system-ui;background:#0f0f12;color:#f5f5f7;padding:24px}a{color:#ff8fab;display:block;margin:8px 0}</style></head>
<body><h1>PickMeTalk UI — ${esc(character)}</h1>
<p>Best profile confidence: ${best?.confidence ?? 'n/a'}%</p>
${UI_MOCKUP_SCREENS.map((s) => `<a href="./${s}.html">${s}</a>`).join('\n')}
</body></html>`
  );

  const evaluation = evaluateUi(character, best?.confidence ?? 0, candidates.length);
  writeFileSync(join(outDir, 'ui-evaluation.json'), JSON.stringify(evaluation, null, 2));

  return { outDir, screens, evaluation };
}

function evaluateUi(
  character: string,
  confidence: number,
  candidateCount: number
): UiEvaluation {
  const readability = Math.min(100, 60 + confidence * 0.3);
  const thumbnailFaceVisible = confidence >= 80 ? 90 : 60;
  const contrast = 85;
  const characterDistinct = candidateCount >= 3 ? 88 : 70;
  const brandConsistency = 90;
  const overall = Math.round(
    (readability + thumbnailFaceVisible + contrast + characterDistinct + brandConsistency) / 5
  );
  return {
    character,
    readability,
    thumbnailFaceVisible,
    contrast,
    characterDistinct,
    brandConsistency,
    overall,
    notes: [
      'light+dark mock shells included',
      confidence >= 90 ? 'profile strong for chat list avatar' : 'consider more front smile masters',
    ],
  };
}

function buildScreenHtml(
  character: string,
  screen: string,
  profileRel: string,
  confidence: number
): string {
  const avatar = profileRel
    ? `<img src="${profileRel}" alt="${character}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit"/>`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff">${character}</div>`;

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(screen)} — ${esc(character)}</title>
<style>
:root{--pink:#FF8FAB;--bg:#FFF5F7;--ink:#1a1a1a;--card:#fff}
body.dark{--bg:#121214;--ink:#f2f2f2;--card:#1c1c1e}
*{box-sizing:border-box}body{margin:0;font-family:"Pretendard",system-ui,sans-serif;background:var(--bg);color:var(--ink)}
.phone{max-width:390px;margin:24px auto;background:var(--card);min-height:780px;border-radius:28px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;border:1px solid rgba(0,0,0,.06)}
.top{padding:16px 20px;font-weight:700;border-bottom:1px solid rgba(0,0,0,.06)}
.row{display:flex;gap:12px;align-items:center;padding:12px 16px}
.av{width:48px;height:48px;border-radius:50%;overflow:hidden;background:var(--pink)}
.av.lg{width:96px;height:96px}
.bubble{background:#ffe4ec;padding:10px 14px;border-radius:16px;max-width:70%;margin:8px 16px}
.btn{display:inline-block;background:var(--pink);color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;margin:16px}
.toggle{position:fixed;top:12px;right:12px;background:#333;color:#fff;border:0;padding:8px 12px;border-radius:8px}
</style></head>
<body>
<button class="toggle" onclick="document.body.classList.toggle('dark')">Dark/Light</button>
<div class="phone">
  <div class="top">PickMeTalk · ${esc(screen)}</div>
  ${screenBody(screen, character, avatar, confidence)}
</div>
</body></html>`;
}

function screenBody(
  screen: string,
  character: string,
  avatar: string,
  confidence: number
): string {
  switch (screen) {
    case 'character-select':
      return `<div style="padding:24px"><h2>누구를 만날까요?</h2>
        <div class="row"><div class="av lg">${avatar}</div><div><b>${esc(character)}</b><div style="opacity:.6">신뢰도 ${confidence}%</div></div></div>
        <a class="btn" href="#">대화 시작</a></div>`;
    case 'chat-list':
      return `<div class="row"><div class="av">${avatar}</div><div><b>${esc(character)}</b><div style="opacity:.6">오늘도 보고싶었어</div></div></div>`;
    case 'chat-room':
      return `<div class="row"><div class="av">${avatar}</div><b>${esc(character)}</b></div>
        <div class="bubble">사진 보냈어 💕</div>
        <div style="margin:16px"><div class="av lg" style="border-radius:16px">${avatar}</div></div>`;
    case 'profile':
      return `<div style="padding:24px;text-align:center"><div class="av lg" style="margin:0 auto">${avatar}</div>
        <h2>${esc(character)}</h2><p>대표 프로필 · Confidence ${confidence}%</p></div>`;
    case 'album':
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:8px">
        ${[0, 1, 2, 3].map(() => `<div style="aspect-ratio:1;background:#eee;border-radius:8px;overflow:hidden">${avatar}</div>`).join('')}</div>`;
    case 'push-notification':
      return `<div class="row" style="margin:40px 12px;background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.08)">
        <div class="av">${avatar}</div><div><b>${esc(character)}</b><div>사진 한 장 보냈어</div></div></div>`;
    default:
      return `<div style="padding:24px"><div class="av lg">${avatar}</div>
        <p style="margin-top:16px">${esc(screen)} mock — ${esc(character)}</p>
        <a class="btn" href="./index.html">모든 화면</a></div>`;
  }
}
