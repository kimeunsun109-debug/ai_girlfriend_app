'use client';

import { motion } from 'framer-motion';

interface EmotionalStateBadgeProps {
  emoji: string;
  label: string;
  accent?: string;
}

export function EmotionalStateBadge({ emoji, label, accent = '#E8B4A0' }: EmotionalStateBadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[var(--ink)] shadow-sm"
      style={{ boxShadow: `0 8px 24px -8px ${accent}55` }}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span>{label}</span>
    </motion.span>
  );
}
