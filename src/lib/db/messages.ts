import { mapMessage } from "@/lib/db/mappers";
import { CHAT_MESSAGE_LIST_LIMIT } from "@/lib/constants";
import type { Message } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** messages 조회 시 필요 컬럼만 */
export const MESSAGE_LIST_COLUMNS =
  "id, user_id, character_id, conversation_id, role, content, emotion, created_at";

/** 채팅 화면 초기 로드용 최근 메시지 */
export async function fetchConversationMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  limit = CHAT_MESSAGE_LIST_LIMIT
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_LIST_COLUMNS)
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => mapMessage(row)).reverse();
}
