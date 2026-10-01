import React from 'react';
import { ShieldAlert, Database, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-[#0b0f17] border-t border-white/[0.08] mt-16 py-8 text-xs text-[#859588]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Market Sentiment Disclaimer */}
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#dfe2ee]">
                Grey Market Premium (GMP) Disclaimer
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#859588]">
                Grey Market Premium (GMP) values are strictly non-official,
                unregulated market sentiment indicators sourced from trading
                desks. GMP does not guarantee actual listing price outcomes.
              </p>
            </div>
          </div>

          {/* Privacy Architecture Notice */}
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-[#00d084] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#dfe2ee]">
                Zero-Retention PAN Privacy
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#859588]">
                The platform enforces zero permanent backend retention of user
                PAN numbers. All allotment inquiries are processed via transient
                ephemeral proxies.
              </p>
            </div>
          </div>

          {/* Market Hours & Refresh Cadence */}
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#6366f1] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#dfe2ee]">
                Market Hours & Updates
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#859588]">
                Bidding takes place 10:00 AM – 5:00 PM IST on working days. Data
                snapshots are ingested at 09:30, 13:00, 16:30, and 18:00 IST and
                Edge cached via SWR.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {new Date().getFullYear()} IPO Deals. Built for Indian Mainboard & SME IPO Research.</p>
          <div className="flex items-center gap-4">
            <span className="font-numeric">Neon PostgreSQL Free Tier</span>
            <span>•</span>
            <span className="font-numeric">Vercel Edge</span>
            <span>•</span>
            <span className="text-[#00d084] font-semibold">₹0/mo Target MVP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
