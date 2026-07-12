'use client';

interface LastMessagePreviewProps {
  text: string;
  relativeTime: string;
  compact?: boolean;
}

export function LastMessagePreview({ text, relativeTime, compact }: LastMessagePreviewProps) {
  return (
    <div className={`glass rounded-2xl px-3.5 py-2.5 ${compact ? '' : 'mt-3'}`}>
      <p className="line-clamp-2 text-sm leading-snug text-[var(--ink)]">
        &ldquo;{text}&rdquo;
      </p>
      <p className="mt-1 text-[11px] font-medium text-[var(--ink-soft)]">{relativeTime}</p>
    </div>
  );
}
