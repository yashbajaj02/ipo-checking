import React from 'react';
import { Card } from '@/components/ui/Card';
import { GmpBadge } from '@/components/ui/GmpBadge';
import { CategoryBadge } from '@/components/ui/Badge';
import { IpoItem } from '@/types/ipo';
import { TrendingUp, Info } from 'lucide-react';

interface GmpSnapshotProps {
  ipos: IpoItem[];
  onSelect?: (ipo: IpoItem) => void;
}

export function GmpSnapshot({ ipos, onSelect }: GmpSnapshotProps) {
  // Sort by highest GMP gain percentage
  const sorted = [...ipos]
    .filter((i) => (i.gmp?.amount ?? 0) > 0)
    .sort((a, b) => (b.gmp?.percentage ?? 0) - (a.gmp?.percentage ?? 0));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#f59e0b]/15 text-[#f59e0b]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#dfe2ee]">
              Grey Market Premium (GMP) Snapshot
            </h3>
            <p className="text-xs text-[#859588]">
              Estimated listing premiums based on market sentiment observations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-1 rounded border border-[#f59e0b]/20">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Non-official sentiment quote</span>
        </div>
      </div>

      {/* Snapshot Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-semibold text-[#859588] tracking-wider">
              <th className="pb-2">Company / Board</th>
              <th className="pb-2 font-numeric text-right">Issue Price</th>
              <th className="pb-2 font-numeric text-right">Latest GMP</th>
              <th className="pb-2 font-numeric text-right">Est. Listing Price</th>
              <th className="pb-2 text-right hidden sm:table-cell">Source & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((ipo) => (
              <tr
                key={ipo.id}
                onClick={() => onSelect && onSelect(ipo)}
                className="hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#dfe2ee] group-hover:text-[#00d084] transition-colors line-clamp-1">
                      {ipo.companyName}
                    </span>
                    <CategoryBadge category={ipo.category} />
                  </div>
                  <span className="text-[10px] font-mono text-[#859588]">
                    {ipo.symbol}
                  </span>
                </td>

                <td className="py-2.5 text-right font-numeric font-medium text-[#dfe2ee]">
                  ₹{ipo.priceBandMax}
                </td>

                <td className="py-2.5 text-right">
                  <GmpBadge
                    amount={ipo.gmp?.amount ?? 0}
                    percentage={ipo.gmp?.percentage ?? 0}
                    trend={ipo.gmp?.trend ?? 'flat'}
                    className="py-0.5 text-[11px]"
                  />
                </td>

                <td className="py-2.5 text-right font-numeric font-bold text-[#00d084]">
                  ₹{ipo.gmp?.estimatedListingPrice ?? (ipo.priceBandMax ? ipo.priceBandMax + (ipo.gmp?.amount ?? 0) : '—')}
                </td>

                <td className="py-2.5 text-right text-[10px] text-[#859588] hidden sm:table-cell font-numeric">
                  {ipo.gmp?.sourceTimestamp ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
