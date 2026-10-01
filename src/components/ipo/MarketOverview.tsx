import React from 'react';
import { Card } from '@/components/ui/Card';
import { Flame, Calendar, TrendingUp, Layers } from 'lucide-react';
import { IpoItem } from '@/types/ipo';

interface MarketOverviewProps {
  ipos: IpoItem[];
  selectedCategory?: 'MAINBOARD' | 'SME' | 'ALL';
}

export function MarketOverview({ ipos }: MarketOverviewProps) {
  const openCount = ipos.filter((i) => i.status === 'OPEN').length;
  const upcomingCount = ipos.filter((i) => i.status === 'UPCOMING').length;
  const mainboardCount = ipos.filter((i) => i.category === 'MAINBOARD').length;
  const smeCount = ipos.filter((i) => i.category === 'SME').length;

  // Average GMP percentage across open/upcoming issues
  const gmpItems = ipos.filter((i) => (i.gmp?.amount ?? 0) > 0);
  const avgGmp =
    gmpItems.length > 0
      ? gmpItems.reduce((acc, curr) => acc + (curr.gmp?.percentage ?? 0), 0) / gmpItems.length
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Metric 1: Open IPOs */}
      <Card className="flex flex-col justify-between hover:border-[#00d084]/30 transition-all">
        <div className="flex items-center justify-between text-xs text-[#859588]">
          <span className="uppercase tracking-wider font-semibold text-[11px]">
            Bidding Open
          </span>
          <span className="p-1.5 rounded bg-[#00d084]/10 text-[#00d084]">
            <Flame className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-numeric text-[#dfe2ee]">
              {openCount}
            </span>
            <span className="text-xs text-[#00d084] font-semibold">Active Issues</span>
          </div>
          <p className="text-[11px] text-[#859588] mt-1">
            Bidding window closes 5:00 PM IST
          </p>
        </div>
      </Card>

      {/* Metric 2: Upcoming Pipeline */}
      <Card className="flex flex-col justify-between hover:border-[#6366f1]/30 transition-all">
        <div className="flex items-center justify-between text-xs text-[#859588]">
          <span className="uppercase tracking-wider font-semibold text-[11px]">
            Upcoming Pipeline
          </span>
          <span className="p-1.5 rounded bg-[#6366f1]/10 text-[#6366f1]">
            <Calendar className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-numeric text-[#dfe2ee]">
              {upcomingCount}
            </span>
            <span className="text-xs text-[#cecdff] font-semibold">Scheduled</span>
          </div>
          <p className="text-[11px] text-[#859588] mt-1">
            Dates announced on BSE/NSE
          </p>
        </div>
      </Card>

      {/* Metric 3: Average GMP */}
      <Card className="flex flex-col justify-between hover:border-[#f59e0b]/30 transition-all">
        <div className="flex items-center justify-between text-xs text-[#859588]">
          <span className="uppercase tracking-wider font-semibold text-[11px]">
            Average GMP Gain
          </span>
          <span className="p-1.5 rounded bg-[#f59e0b]/10 text-[#f59e0b]">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-numeric text-[#f59e0b]">
              +{avgGmp.toFixed(1)}%
            </span>
            <span className="text-xs text-[#f59e0b]/80 font-medium">Estimated</span>
          </div>
          <p className="text-[11px] text-[#859588] mt-1">
            Across {gmpItems.length} tracked offerings
          </p>
        </div>
      </Card>

      {/* Metric 4: Board Mix Breakdown */}
      <Card className="flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between text-xs text-[#859588]">
          <span className="uppercase tracking-wider font-semibold text-[11px]">
            Filtered Universe
          </span>
          <span className="p-1.5 rounded bg-white/5 text-[#dfe2ee]">
            <Layers className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-[#859588] block text-[10px] uppercase">
                Mainboard
              </span>
              <span className="text-xl font-bold font-numeric text-[#00d084]">
                {mainboardCount}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-white/10" />
            <div>
              <span className="text-xs text-[#859588] block text-[10px] uppercase">
                SME Issues
              </span>
              <span className="text-xl font-bold font-numeric text-[#f59e0b]">
                {smeCount}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#859588] mt-1">
            Total Offerings: <strong className="text-[#dfe2ee]">{mainboardCount + smeCount}</strong>
          </p>
        </div>
      </Card>
    </div>
  );
}
