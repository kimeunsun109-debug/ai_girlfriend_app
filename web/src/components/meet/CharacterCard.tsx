'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { MeetCharacter } from '@/types/meet';
import { ensureCharacterLink, storeChatContext } from '@/lib/api';
import { LivingPhoto } from './LivingPhoto';
import { EmotionalStateBadge } from './EmotionalStateBadge';

interface CharacterCardProps {
  character: MeetCharacter;
  userId: string;
  index: number;
  onLinked?: () => void;
}

export function CharacterCard({ character, userId, index, onLinked }: CharacterCardProps) {
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
    router.push(`/chat/${character.slug}`);
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 18,
        delay: 0.08 + index * 0.06,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={handleOpen}
      className="relative w-[72vw] max-w-[280px] shrink-0 snap-center text-left"
      style={{ boxShadow: `0 20px 50px -18px ${character.accent}66` }}
    >
      <div className="relative h-[380px] overflow-hidden rounded-[24px]">
        <LivingPhoto
          src={character.photoUrl}
          ambientSrc={character.ambientPhotoUrl}
          alt={character.name}
          accent={character.accent}
          layoutId={`photo-${character.slug}`}
          className="absolute inset-0"
          breathe
        />
        <div className="absolute inset-0" style={{ background: character.gradient }} />

        <div className="absolute left-3 top-3">
          <EmotionalStateBadge
            emoji={character.emotionalState.emoji}
            label={character.emotionalState.label}
            accent={character.accent}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="mb-2 flex items-center gap-2 text-white/90">
            <span className="text-base">{character.status.emoji}</span>
            <span className="text-xs font-medium">{character.status.label}</span>
          </div>
          <h3 className="text-xl font-bold text-white">{character.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-white/80">{character.mood}</p>
          <p className="mt-2 line-clamp-1 text-sm text-white/95">
            &ldquo;{character.lastMessage.text}&rdquo;
          </p>
          <p className="mt-1 text-[10px] text-white/70">{character.lastMessage.relativeTime}</p>
        </div>
      </div>
    </motion.button>
  );
}
