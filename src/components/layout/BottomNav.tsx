'use client';

import React from 'react';
import { TrendingUp, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabType = 'ipos' | 'allotment' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNav({
  activeTab,
  onTabChange,
}: BottomNavProps) {
  const tabs = [
    {
      id: 'ipos' as TabType,
      label: 'IPOs',
      icon: TrendingUp,
    },
    {
      id: 'allotment' as TabType,
      label: 'Allotment',
      icon: Calendar,
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      style={{
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
        paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))',
      }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-white/[0.08] px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] dark:shadow-none touch-none"
    >
      <div className="w-full max-w-lg mx-auto flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative transition-colors duration-150 py-1 select-none cursor-pointer',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              <div
                className={cn(
                  'px-4 py-0.5 rounded-full transition-all duration-150 flex items-center justify-center',
                  isActive && 'bg-blue-100/70 dark:bg-blue-950/60'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-150',
                    isActive && 'scale-105 stroke-[2.2]'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] tracking-tight mt-0.5 font-medium',
                  isActive && 'font-bold text-blue-600 dark:text-blue-400'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
