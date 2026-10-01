import React from 'react';
import { cn } from '@/lib/utils';

interface SubscriptionGaugeProps {
  qib?: number;
  nii?: number;
  retail?: number;
  total: number;
  showLabels?: boolean;
  className?: string;
}

export function SubscriptionGauge({
  qib,
  nii,
  retail,
  total,
  showLabels = true,
  className,
}: SubscriptionGaugeProps) {
  const hasCategories = qib != null || nii != null || retail != null;
  const qibVal = qib ?? 0;
  const niiVal = nii ?? 0;
  const retailVal = retail ?? 0;
  const sum = qibVal + niiVal + retailVal;

  const qibPct = sum > 0 ? (qibVal / sum) * 100 : 0;
  const niiPct = sum > 0 ? (niiVal / sum) * 100 : 0;
  const retailPct = sum > 0 ? (retailVal / sum) * 100 : 0;

  // Normalized fill width (max 100% of the visual track)
  const isOversubscribed = total >= 1.0;
  const visualFill = Math.min(Math.max(total * 100, 5), 100);

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {qib != null && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#859588]">
                <span className="w-2 h-2 rounded-sm bg-[#6366f1]" />
                QIB: <strong className="text-slate-800 dark:text-[#dfe2ee] font-numeric">{qib.toFixed(1)}x</strong>
              </span>
            )}
            {nii != null && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#859588]">
                <span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />
                NII: <strong className="text-slate-800 dark:text-[#dfe2ee] font-numeric">{nii.toFixed(1)}x</strong>
              </span>
            )}
            {retail != null && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#859588]">
                <span className="w-2 h-2 rounded-sm bg-[#00d084]" />
                Retail: <strong className="text-slate-800 dark:text-[#dfe2ee] font-numeric">{retail.toFixed(1)}x</strong>
              </span>
            )}
            {!hasCategories && (
              <span className="text-[11px] text-slate-400">
                Overall Demand
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-[#859588] tracking-wider">
              Total:
            </span>
            <span
              className={cn(
                'font-numeric font-bold text-xs px-1.5 py-0.5 rounded',
                isOversubscribed
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-[#00d084] border border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-[#dfe2ee]'
              )}
            >
              {total.toFixed(2)}x
            </span>
          </div>
        </div>
      )}

      {/* Track */}
      <div className="relative w-full h-2 rounded bg-slate-200 dark:bg-[#1f2937] overflow-hidden flex">
        {total > 0 ? (
          <div
            className="h-full flex transition-all duration-500"
            style={{ width: `${visualFill}%` }}
          >
            {hasCategories ? (
              <>
                {qibPct > 0 && (
                  <div
                    style={{ width: `${qibPct}%` }}
                    className="h-full bg-[#6366f1] transition-all"
                    title={`QIB: ${qibVal}x`}
                  />
                )}
                {niiPct > 0 && (
                  <div
                    style={{ width: `${niiPct}%` }}
                    className="h-full bg-[#f59e0b] transition-all"
                    title={`NII: ${niiVal}x`}
                  />
                )}
                {retailPct > 0 && (
                  <div
                    style={{ width: `${retailPct}%` }}
                    className="h-full bg-[#00d084] transition-all"
                    title={`Retail: ${retailVal}x`}
                  />
                )}
              </>
            ) : (
              <div
                className={cn(
                  'w-full h-full transition-all',
                  isOversubscribed ? 'bg-emerald-500' : 'bg-blue-600'
                )}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-slate-200 dark:bg-[#1f2937]" />
        )}

        {/* 1.0x base subscription marker line */}
        <div
          className="absolute top-0 bottom-0 w-[1px] bg-slate-400 dark:bg-white/40 z-10"
          style={{ left: '100%' }}
          title="Fully Subscribed Threshold (1.0x)"
        />
      </div>
    </div>
  );
}
