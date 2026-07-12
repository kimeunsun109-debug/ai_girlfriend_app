import { Suspense } from 'react';
import { ChatScreen } from '@/components/chat/ChatScreen';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--ink-soft)]">
          들어가는 중...
        </div>
      }
    >
      <ChatScreen slug={slug} />
    </Suspense>
  );
}
