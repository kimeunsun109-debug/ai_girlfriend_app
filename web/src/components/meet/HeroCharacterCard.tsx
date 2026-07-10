'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { MeetCharacter } from '@/types/meet';
import { ensureCharacterLink, storeChatContext } from '@/lib/api';
import { LivingPhoto } from './LivingPhoto';
import { StatusPill } from './StatusPill';
import { EmotionalStateBadge } from './EmotionalStateBadge';
import { LastMessagePreview } from './LastMessagePreview';

interface HeroCharacterCardProps {
  character: MeetCharacter;
  userId: string;
  onLinked?: () => void;
}

export function HeroCharacterCard({ character, userId, onLinked }: HeroCharacterCardProps) {
  const router = useRouter();

  const handleOpen = async () => {
    let ucId = character.userCharacterId;
    if (!ucId) {
      try {
        const linked = await ensureCharacterLink(userId, character.id);
        ucId = linked.id;
        onLinked?.();
      } catch {
        return;
      }
    }
    if (!ucId) return;
    storeChatContext(character.slug, {
      userCharacterId: ucId,
      name: character.name,
      photoUrl: character.photoUrl,
      accent: character.accent,
    });
    router.push(`/chat/${character.slug}?hero=1`);
  };

  return (
    <motion.section className="px-5 pb-2">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[var(--ink-soft)] uppercase">
            Today&apos;s Pick
          </p>
          <p className="text-sm text-[var(--ink-soft)]">오늘 가장 잘 맞는 사람</p>
        </div>
        <EmotionalStateBadge
          emoji={character.emotionalState.emoji}
          label={character.emotionalState.label}
          accent={character.accent}
        />
      </div>

      <motion.button
        type="button"
        onClick={handleOpen}
        whileTap={{ scale: 0.985 }}
        className="group relative block w-full text-left"
        style={{ boxShadow: 'var(--shadow-warm)' }}
      >
        <div className="relative h-[min(68vh,520px)] overflow-hidden rounded-[28px]">
          <LivingPhoto
            src={character.photoUrl}
            ambientSrc={character.ambientPhotoUrl}
            alt={character.name}
            accent={character.accent}
            layoutId={`photo-${character.slug}`}
            priority
            className="absolute inset-0"
          />
          <div
            className="absolute inset-0"
            style={{ background: character.gradient }}
          />
          <div className="absolute inset-x-0 bottom-0 p-5 pt-16">
            <StatusPill emoji={character.status.emoji} label={character.status.label} />
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white drop-shadow-md">
              {character.name}
            </h2>
            <p className="mt-1 text-sm text-white/85">{character.tagline}</p>
            <p className="mt-0.5 text-xs text-white/70">{character.mood}</p>
            <LastMessagePreview
              text={character.lastMessage.text}
              relativeTime={character.lastMessage.relativeTime}
            />
          </div>
        </div>
      </motion.button>
    </motion.section>
  );
}
