/**
 * AI 프로바이더 추상화 — DeepSeek 우선, OpenAI 교체 가능
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  streamChat(messages: ChatMessage[]): AsyncIterable<string>;
}
