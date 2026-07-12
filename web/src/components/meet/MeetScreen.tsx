'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { MeetHome } from '@/types/meet';
import { fetchMeetHome } from '@/lib/api';
import { GreetingHeader } from './GreetingHeader';
import { HeroCharacterCard } from './HeroCharacterCard';
import { CharacterCard } from './CharacterCard';

export function MeetScreen() {
  const [home, setHome] = useState<MeetHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMeetHome();
      setHome(data);
    } catch {
      setError('잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-sm text-[var(--ink-soft)]"
        >
          문 열고 있어...
        </motion.div>
      </div>
    );
  }

  if (error || !home) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-[var(--ink-soft)]">{error}</p>
        <button
          type="button"
          onClick={load}
          className="glass rounded-full px-5 py-2 text-sm font-medium"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const hero = home.characters.find((c) => c.slug === home.todaysPickSlug) ?? home.characters[0]!;
  const others = home.characters.filter((c) => c.slug !== hero.slug);

  return (
    <main className="safe-bottom pb-8">
      <GreetingHeader greeting={home.greeting} greetingSub={home.greetingSub} />

      <HeroCharacterCard character={hero} userId={home.userId} onLinked={load} />

      {others.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 px-5">
            <h2 className="text-lg font-semibold text-[var(--ink)]">다른 사람들도 있어</h2>
            <p className="text-sm text-[var(--ink-soft)]">말 걸어볼까?</p>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 hide-scrollbar snap-x snap-mandatory">
            {others.map((c, i) => (
              <CharacterCard
                key={c.slug}
                character={c}
                userId={home.userId}
                index={i}
                onLinked={load}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 px-5 text-center text-[11px] text-[var(--ink-soft)]">
        캐릭터를 고르는 게 아니라, 만나러 가는 거야.
      </footer>
    </main>
  );
}
