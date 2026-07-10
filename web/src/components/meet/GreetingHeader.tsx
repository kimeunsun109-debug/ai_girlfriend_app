'use client';

import { motion } from 'framer-motion';

interface GreetingHeaderProps {
  greeting: string;
  greetingSub: string;
}

export function GreetingHeader({ greeting, greetingSub }: GreetingHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="px-5 pt-12 pb-4"
    >
      <p className="text-[13px] font-medium tracking-wide text-[var(--ink-soft)] uppercase">
        PickMeTalk
      </p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
        {greeting}
      </h1>
      <p className="mt-2 text-base text-[var(--ink-soft)] text-balance">{greetingSub}</p>
    </motion.header>
  );
}
