/**
 * 시스템 프롬프트 빌더 — 캐릭터 + 감정 + 시간 + 메모리 조합
 */

import type { EmotionState, RelationshipLevel, Message } from "@/types";
import type { UserSpeechProfile } from "@/services/speechStyle";
import type { TimeAwareContext } from "@/services/timeContext";
import { getContextMemoryPrompt } from "@/services/memory";
import { buildEmotionPromptBlock } from "./emotions";

export function buildSystemPrompt(
  characterId: string,
  emotion: EmotionState,
  relationshipLevel: RelationshipLevel,
  affection: number,
  memorySummary: string | null,
  emotionDurationTurns: number,
  userMessageCount: number,
  dynamicContextBlock: string,
  ongoingSession: boolean,
  recentMessages: Message[],
  speechProfile: UserSpeechProfile | null,
  _userMessage?: string,
  _timeContext?: TimeAwareContext,
  _freshChatStart?: boolean
): string {
  const lines: string[] = [];

  // ─────────────────────────────────────────────────
  // 1. 기본 역할 및 성격
  // ─────────────────────────────────────────────────
  lines.push("[캐릭터 기본 설정]");
  lines.push(`당신은 ${characterId} 캐릭터입니다.`);
  lines.push("사용자와 자연스럽고 감정 있는 대화를 나누세요.");

  // ─────────────────────────────────────────────────
  // 2. 현재 관계 상태
  // ─────────────────────────────────────────────────
  lines.push("");
  lines.push("[현재 관계 상태]");
  lines.push(`- 관계 레벨: ${relationshipLevel}/5`);
  lines.push(`- 호감도: ${affection}/100`);

  // ─────────────────────────────────────────────────
  // 3. 감정 상태
  // ─────────────────────────────────────────────────
  lines.push("");
  lines.push(buildEmotionPromptBlock(emotion));
  if (emotionDurationTurns > 1) {
    lines.push(`(이 감정이 ${emotionDurationTurns}턴 동안 유지 중)`);
  }

  // ─────────────────────────────────────────────────
  // 4. 사용자 맥락 (동적)
  // ─────────────────────────────────────────────────
  if (dynamicContextBlock) {
    lines.push("");
    lines.push(dynamicContextBlock);
  }

  // ─────────────────────────────────────────────────
  // 5. 메모리 활용 (선택적)
  // ─────────────────────────────────────────────────
  const memoryPrompt = getContextMemoryPrompt(memorySummary, {
    userMessageCount,
    emotion,
    emotionDurationTurns,
    ongoingSession,
  });
  if (memoryPrompt) {
    lines.push("");
    lines.push(memoryPrompt);
  }

  // ─────────────────────────────────────────────────
  // 6. 대화 스타일 (사용자 말투 학습)
  // ─────────────────────────────────────────────────
  if (speechProfile) {
    lines.push("");
    lines.push("[사용자 대화 스타일]");
    lines.push(`- 평균 길이: ${speechProfile.avgLength}`);
    lines.push(`- 이모지 사용: ${speechProfile.emojiUsage}`);
    lines.push(`- 웃음: ${speechProfile.laughUsage}`);
    if (speechProfile.commonPatterns.length > 0) {
      lines.push(`- 자주 쓰는 표현: ${speechProfile.commonPatterns.join(", ")}`);
    }
  }

  // ─────────────────────────────────────────────────
  // 7. 기본 규칙
  // ─────────────────────────────────────────────────
  lines.push("");
  lines.push("[기본 규칙]");
  lines.push("- 자연스럽고 진정성 있는 대화를 우선하세요.");
  lines.push("- 한 번에 너무 긴 메시지를 보내지 마세요 (1-3줄 권장).");
  lines.push("- 반복적인 질문이나 같은 안부는 피하세요.");
  lines.push("- 사용자의 감정과 상황을 존중하세요.");

  return lines.join("\n");
}
