'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getChatContext, reactToMessage } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'character';
  text: string;
}

interface ChatScreenProps {
  slug: string;
}

export function ChatScreen({ slug }: ChatScreenProps) {
  const searchParams = useSearchParams();
  const heroEntry = searchParams.get('hero') === '1';
  const ctx = getChatContext(slug);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(heroEntry);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctx) return;
    setMessages([
      {
        id: 'welcome',
        role: 'character',
        text: `${ctx.name}야... 왔네ㅎㅎ`,
      },
    ]);
    const t = setTimeout(() => setExpanded(false), heroEntry ? 900 : 0);
    return () => clearTimeout(t);
  }, [ctx, heroEntry]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !ctx || sending) return;

    setInput('');
    setSending(true);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { reaction } = await reactToMessage(ctx.userCharacterId, text);
      setMessages((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, role: 'character', text: reaction },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'character', text: '잠깐... 다시 말해줄래?' },
      ]);
    } finally {
      setSending(false);
    }
  }, [ctx, input, sending]);

  if (!ctx) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-[var(--ink-soft)]">먼저 만나기 화면에서 들어와 주세요.</p>
        <Link href="/" className="glass rounded-full px-5 py-2 text-sm font-medium">
          돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--cream)]">
      <motion.header
        layout
        className="relative overflow-hidden"
        animate={{ height: expanded ? '42vh' : '88px' }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      >
        <motion.div
          layoutId={`photo-${slug}`}
          className="absolute inset-0"
        >
          <Image
            src={ctx.photoUrl}
            alt={ctx.name}
            fill
            className="object-cover object-[center_20%]"
            priority
            unoptimized
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[var(--cream)]"
            style={{
              background: `linear-gradient(180deg, transparent 40%, ${ctx.accent}33 70%, var(--cream) 100%)`,
            }}
          />
        </motion.div>
        <div className="relative z-10 flex items-center gap-3 px-4 pt-12 pb-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/30 text-lg backdrop-blur-md"
            aria-label="뒤로"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white drop-shadow">{ctx.name}</h1>
            {!expanded && (
              <p className="text-xs text-white/85 drop-shadow-sm">지금 대화 중</p>
            )}
          </div>
        </div>
      </motion.header>

      <div className="flex flex-1 flex-col px-4 pt-2">
        <div className="flex-1 space-y-3 overflow-y-auto pb-4 hide-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-md bg-[#3d342f] text-white'
                      : 'glass rounded-bl-md text-[var(--ink)]'
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <form
          className="safe-bottom sticky bottom-0 flex gap-2 border-t border-white/40 bg-[var(--cream)]/90 py-3 backdrop-blur-md"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="말 걸어봐..."
            className="glass flex-1 rounded-full px-4 py-3 text-sm outline-none placeholder:text-[var(--ink-soft)]"
            disabled={sending}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.94 }}
            disabled={sending || !input.trim()}
            className="rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: ctx.accent }}
          >
            보내기
          </motion.button>
        </form>
      </div>
    </div>
  );
}
