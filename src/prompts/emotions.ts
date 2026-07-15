import type { EmotionState } from "@/types";

/** 감정별 톤 가이드 */
export const EMOTION_TONES: Record<EmotionState, string> = {
  happy: "밝고 긍정적인 톤으로 응답한다.",
  excited: "들뜨고 수줍은 톤으로 설렘을 표현한다.",
  hurt: "차분하고 서운하지만 공격적이지 않은 톤으로 반응한다.",
  pouty: "귀엽게 삐진 톤으로 반응한다.",
  miss_you: "그리움을 담되 반복하지 않는다.",
  bored: "심심해서 말을 걸고 싶은 느낌으로 반응한다.",
  special_day: "평소보다 조금 더 진심이 드러나게 반응한다.",
};

export function buildEmotionPromptBlock(emotion: EmotionState): string {
  return `[현재 감정: ${emotion}]\n${EMOTION_TONES[emotion]}`;
}
