'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface LivingPhotoProps {
  src: string;
  alt: string;
  accent: string;
  layoutId?: string;
  priority?: boolean;
  className?: string;
  ambientSrc?: string;
  breathe?: boolean;
}

export function LivingPhoto({
  src,
  alt,
  accent,
  layoutId,
  priority,
  className = '',
  ambientSrc,
  breathe = true,
}: LivingPhotoProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={`relative overflow-hidden ${className}`}
      animate={
        breathe
          ? { scale: [1, 1.018, 1], y: [0, -2, 0] }
          : undefined
      }
      transition={
        breathe
          ? { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }
          : undefined
      }
    >
      {ambientSrc && (
        <Image
          src={ambientSrc}
          alt=""
          fill
          className="object-cover scale-110 blur-2xl opacity-40"
          aria-hidden
          unoptimized
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover object-[center_20%]"
        unoptimized
      />
      <div
        className="absolute inset-0 opacity-30 mix-blend-soft-light shimmer"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${accent}88, transparent 55%)`,
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10"
        animate={{ opacity: [0.85, 0.95, 0.85] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
