import { streamDeepSeekChat } from "@/lib/ai/deepseek";
import type { AIProvider, ChatMessage } from "./provider";

/** DeepSeek API — lib/ai/deepseek.ts 위임 */
export function createDeepSeekProvider(): AIProvider {
  return {
    streamChat(messages: ChatMessage[]) {
      return streamDeepSeekChat(messages);
    },
  };
}
