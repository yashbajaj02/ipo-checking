import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GmpBadgeProps {
  amount: number;
  percentage: number;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}

export function GmpBadge({ amount, percentage, trend = 'up', className }: GmpBadgeProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold tracking-wide border transition-all',
        isPositive
          ? 'bg-[#00d084]/10 text-[#00d084] border-[#00d084]/30 glow-emerald'
          : isNegative
          ? 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/30'
          : 'bg-white/5 text-[#859588] border-white/10',
        className
      )}
    >
      {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-[#00d084]" />}
      {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-[#f43f5e]" />}
      {trend === 'flat' && <Minus className="w-3.5 h-3.5 text-[#859588]" />}

      <span className="font-numeric">
        {isPositive ? '+' : ''}₹{amount}
      </span>
      <span className="text-[10px] opacity-80 font-numeric">
        ({isPositive ? '+' : ''}{percentage.toFixed(1)}%)
      </span>
    </div>
  );
}
