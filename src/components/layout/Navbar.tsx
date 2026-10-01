'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

export function Navbar() {
  const appName = 'IPO Deals';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & App Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#00d084]/15 border border-[#00d084]/30 flex items-center justify-center text-[#00d084]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[#dfe2ee]">
                  {appName}
                </span>
                <span className="text-[10px] uppercase font-semibold text-[#00d084] bg-[#003920] px-1.5 py-0.5 rounded border border-[#00d084]/30">
                  IPO Feed
                </span>
              </div>
              <span className="text-[10px] text-[#859588] tracking-normal block">
                NSE & BSE Primary Market
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
