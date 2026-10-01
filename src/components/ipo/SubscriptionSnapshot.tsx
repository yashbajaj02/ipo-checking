import React from 'react';
import { Card } from '@/components/ui/Card';
import { CategoryBadge } from '@/components/ui/Badge';
import { SubscriptionGauge } from '@/components/ui/SubscriptionGauge';
import { IpoItem } from '@/types/ipo';
import { BarChart3, Clock } from 'lucide-react';

interface SubscriptionSnapshotProps {
  ipos: IpoItem[];
  onSelect?: (ipo: IpoItem) => void;
}

export function SubscriptionSnapshot({ ipos, onSelect }: SubscriptionSnapshotProps) {
  // Only show open or active bidding issues that have subscription numbers
  const activeIssues = ipos.filter(
    (i) => (i.status === 'OPEN' || i.status === 'CLOSED') && i.subscription
  );

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#6366f1]/15 text-[#6366f1]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#dfe2ee]">
              Live Subscription Momentum Snapshot
            </h3>
            <p className="text-xs text-[#859588]">
              Multi-tranche demand multiples (QIB, NII, Retail) across active issues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#859588]">
          <Clock className="w-3.5 h-3.5" />
          <span>BSE/NSE Cumulative Bids</span>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-white/5">
        {activeIssues.map((ipo) => {
          if (!ipo.subscription) return null;
          return (
            <div
              key={ipo.id}
              onClick={() => onSelect && onSelect(ipo)}
              className="py-3 flex flex-col gap-2 hover:bg-white/5 px-2 rounded transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#dfe2ee] hover:text-[#00d084] transition-colors">
                    {ipo.companyName}
                  </span>
                  <CategoryBadge category={ipo.category} />
                </div>

                <span className="text-[11px] text-[#859588] font-numeric">
                  Updated: {ipo.subscription.lastUpdated}
                </span>
              </div>

              {/* Multi-segment Gauge */}
              <SubscriptionGauge
                qib={ipo.subscription.qib}
                nii={ipo.subscription.niiTotal}
                retail={ipo.subscription.retail}
                total={ipo.subscription.total}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
