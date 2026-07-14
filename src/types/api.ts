/** API 요청/응답 타입 */
export interface ChatRequestBody {
  conversationId: string;
  message: string;
  /** 재생성 — 마지막 사용자 메시지 재전송, user insert 생략 */
  resend?: boolean;
}

export interface CreateConversationBody {
  characterId: string;
  title?: string;
}

export type ChatFollowUp = "question" | "comment" | "joke" | "none";

export interface ChatStreamChunk {
  /** SSE heartbeat — not model content */
  streaming?: boolean;
  content?: string;
  emotion?: string;
  done?: boolean;
  /** DB에 저장된 user 메시지 id (insert 직후 또는 done 시) */
  userMessageId?: string;
  follow_up?: ChatFollowUp;
  /** true면 content로 메시지 전체 교체 (폴백 후 본문 확정 등) */
  replace?: boolean;
  /** 폴백 문장을 실제 응답으로 교체할 때 */
  clearFallback?: boolean;
  should_stream?: boolean;
  /** DB에 저장된 assistant 메시지 id (done 시) */
  assistantMessageId?: string;
  assistantCreatedAt?: string;
  affection?: number;
  relationshipLevel?: number;
}
