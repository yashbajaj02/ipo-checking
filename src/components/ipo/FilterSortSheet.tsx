'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusFilterType = 'ALL' | 'OPEN' | 'UPCOMING' | 'CLOSED' | 'LISTED';

interface FilterSortSheetProps {
  isOpen: boolean;
  onClose: () => void;
  status: StatusFilterType;
  setStatus: (s: StatusFilterType) => void;
  onlyPositiveGmp: boolean;
  setOnlyPositiveGmp: (v: boolean) => void;
  onlyOpen: boolean;
  setOnlyOpen: (v: boolean) => void;
  onReset: () => void;
}

export function FilterSortSheet({
  isOpen,
  onClose,
  status,
  setStatus,
  onlyPositiveGmp,
  setOnlyPositiveGmp,
  onlyOpen,
  setOnlyOpen,
  onReset,
}: FilterSortSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200">
      {/* Backdrop click area */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#121826] border-t border-slate-200 dark:border-white/10 rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-5 animate-in slide-in-from-bottom duration-200">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full mx-auto -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            Filters
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Status */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-200 block">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'UPCOMING' as StatusFilterType, label: 'Upcoming' },
              { id: 'OPEN' as StatusFilterType, label: 'Open' },
              { id: 'CLOSED' as StatusFilterType, label: 'Closed' },
              { id: 'LISTED' as StatusFilterType, label: 'Listed' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatus(status === st.id ? 'ALL' : st.id)}
                className={cn(
                  'px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all',
                  status === st.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#1b2333] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Toggles */}
        <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Show only with GMP &gt; 5%
            </span>
            <button
              type="button"
              onClick={() => setOnlyPositiveGmp(!onlyPositiveGmp)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative p-0.5',
                onlyPositiveGmp ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                  onlyPositiveGmp && 'translate-x-5'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Show only open IPOs
            </span>
            <button
              type="button"
              onClick={() => setOnlyOpen(!onlyOpen)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative p-0.5',
                onlyOpen ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                  onlyOpen && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Apply Filters Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md text-center cursor-pointer"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
