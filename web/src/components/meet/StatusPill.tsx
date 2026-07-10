'use client';

interface StatusPillProps {
  emoji: string;
  label: string;
}

export function StatusPill({ emoji, label }: StatusPillProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/95">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base backdrop-blur-md">
        {emoji}
      </span>
      <span className="font-medium drop-shadow-sm">{label}</span>
    </div>
  );
}
