import React from 'react';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: 'MAINBOARD' | 'SME';
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  if (category === 'MAINBOARD') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase',
          'bg-[#003920]/80 text-[#00d084] border border-[#00d084]/30',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#00d084] animate-pulse" />
        MAINBOARD
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase',
        'bg-[#472a00]/80 text-[#f59e0b] border border-[#f59e0b]/40',
        className
      )}
      title="SME IPO: Minimum investment is typically ₹1,00,000+ with 1000+ share lot sizes."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
      SME IPO
      <span className="text-[9px] text-[#f59e0b]/80 bg-[#f59e0b]/10 px-1 rounded font-numeric">
        MIN ₹1L+
      </span>
    </span>
  );
}

interface StatusBadgeProps {
  status: 'OPEN' | 'UPCOMING' | 'CLOSED' | 'LISTED';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const configs = {
    OPEN: {
      label: 'BIDDING OPEN',
      bg: 'bg-[#00d084]/15 text-[#00d084] border-[#00d084]/30',
      dot: 'bg-[#00d084] animate-ping',
    },
    UPCOMING: {
      label: 'UPCOMING',
      bg: 'bg-[#6366f1]/15 text-[#cecdff] border-[#6366f1]/30',
      dot: 'bg-[#6366f1]',
    },
    CLOSED: {
      label: 'CLOSED',
      bg: 'bg-white/5 text-[#859588] border-white/10',
      dot: 'bg-[#859588]',
    },
    LISTED: {
      label: 'LISTED',
      bg: 'bg-[#f59e0b]/15 text-[#ffb95f] border-[#f59e0b]/30',
      dot: 'bg-[#f59e0b]',
    },
  };

  const config = configs[status] || configs.CLOSED;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border',
        config.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
