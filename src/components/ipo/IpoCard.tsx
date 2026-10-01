'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  ClipboardList,
  RotateCcw,
  BarChart2,
} from 'lucide-react';
import { IpoItem, IpoAction } from '@/types/ipo';
import { cn, formatCardDateRange, formatTimelineDate } from '@/lib/utils';

interface IpoCardProps {
  ipo: IpoItem;
  isListedView?: boolean;
}

export function IpoCard({ ipo, isListedView }: IpoCardProps) {
  const [isDatesExpanded, setIsDatesExpanded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Logo Initials Fallback
  const getLogoInitials = () => {
    if (ipo.logoText) return ipo.logoText.slice(0, 3).toUpperCase();
    const parts = ipo.companyName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return ipo.companyName.slice(0, 2).toUpperCase();
  };

  const isListed = isListedView || ipo.status === 'LISTED';

  // Single Relevant Action / State Pill
  const action: IpoAction = ipo.action || 'MAY_APPLY';
  const getSingleActionBadge = () => {
    if (isListed) {
      return {
        label: 'LISTED',
        classes:
          'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40',
      };
    }
    switch (action) {
      case 'APPLY':
        return {
          label: 'APPLY',
          classes:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40',
        };
      case 'AVOID':
        return {
          label: 'AVOID',
          classes:
            'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40',
        };
      case 'MAY_APPLY':
      default:
        return {
          label: 'MAY APPLY',
          classes:
            'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40',
        };
    }
  };

  const actionBadge = getSingleActionBadge();

  // Dates formatted e.g. "Wed, 23 - Fri, 25 Sep 2026"
  const formattedDates = formatCardDateRange(ipo.dates);

  // Price Range
  const formatPriceRange = () => {
    if (ipo.priceBandMin && ipo.priceBandMax) {
      if (ipo.priceBandMin === ipo.priceBandMax) return `₹${ipo.priceBandMin}`;
      return `₹${ipo.priceBandMin} - ₹${ipo.priceBandMax}`;
    }
    if (ipo.priceBandMax) return `₹${ipo.priceBandMax}`;
    if (ipo.priceBandMin) return `₹${ipo.priceBandMin}`;
    if (ipo.issuePrice) return `₹${ipo.issuePrice}`;
    return '—';
  };

  // GMP
  const hasGmp = ipo.gmp != null && ipo.gmp.amount != null;
  const gmpAmount = hasGmp ? ipo.gmp!.amount : null;
  const gmpPercent = hasGmp && ipo.gmp!.percentage != null ? ipo.gmp!.percentage : null;
  const formatGmp = () => {
    if (gmpAmount == null) return '—';
    const sign = gmpPercent != null && gmpPercent > 0 ? '+' : '';
    const pctStr = gmpPercent != null ? ` (${sign}${gmpPercent.toFixed(1)}%)` : '';
    return `₹${gmpAmount}${pctStr}`;
  };

  // Final / Last Recorded Real GMP
  const formatLastGmp = () => {
    const amount = ipo.listing?.finalGmp != null ? ipo.listing.finalGmp : gmpAmount;
    if (amount == null) return '—';
    const sign = gmpPercent != null && gmpPercent > 0 ? '+' : '';
    const pctStr = gmpPercent != null ? ` (${sign}${gmpPercent.toFixed(1)}%)` : '';
    return `₹${amount}${pctStr}`;
  };

  // Overall Subscription: Strictly real subscription total, never invented
  const formatOverallSubscription = () => {
    if (ipo.subscription?.total != null && !isNaN(ipo.subscription.total) && ipo.subscription.total > 0) {
      return `${ipo.subscription.total}x`;
    }
    return '—';
  };

  // Lot Size
  const formatLotSize = () => {
    if (ipo.lotSize && ipo.lotSize > 0) {
      return `${ipo.lotSize} Shares`;
    }
    return '—';
  };

  // Listing stats for listed view
  const formatListingPriceWithGain = () => {
    const listing = ipo.listing?.listingPrice;
    const issue = ipo.listing?.issuePrice || ipo.issuePrice;
    if (listing != null && listing > 0) {
      if (issue != null && issue > 0) {
        const gainPct = ((listing - issue) / issue) * 100;
        const sign = gainPct >= 0 ? '+' : '';
        return {
          text: `₹${listing.toFixed(1)} (${sign}${gainPct.toFixed(1)}%)`,
          isPositive: gainPct >= 0,
        };
      }
      return { text: `₹${listing.toFixed(1)}`, isPositive: true };
    }
    return { text: '—', isPositive: false };
  };

  const formatCurrentPriceWithGain = () => {
    const ltp = ipo.marketQuote?.ltp;
    const listing = ipo.listing?.listingPrice;
    if (ltp != null && ltp > 0) {
      if (listing != null && listing > 0) {
        const gainPct = ((ltp - listing) / listing) * 100;
        const sign = gainPct >= 0 ? '+' : '';
        return {
          text: `₹${ltp.toFixed(1)} (${sign}${gainPct.toFixed(1)}%)`,
          isPositive: gainPct >= 0,
        };
      }
      return { text: `₹${ltp.toFixed(1)}`, isPositive: true };
    }
    return { text: '—', isPositive: false };
  };

  const listingData = formatListingPriceWithGain();
  const currentData = formatCurrentPriceWithGain();

  // Timeline events: Strictly Open, Close, Allotment, Refund, Listing
  const timelineEvents = [
    {
      id: 'open',
      label: 'Open Date',
      date: ipo.dates?.offerStartDate,
      icon: CircleDot,
      iconClass: 'text-emerald-500',
    },
    {
      id: 'close',
      label: 'Close Date',
      date: ipo.dates?.offerEndDate,
      icon: Clock,
      iconClass: 'text-rose-500',
    },
    {
      id: 'allotment',
      label: 'Allotment Date',
      date: ipo.dates?.allotmentDate,
      icon: ClipboardList,
      iconClass: 'text-indigo-500',
    },
    {
      id: 'refund',
      label: 'Refund Date',
      date: ipo.dates?.refundDate || ipo.dates?.unblockingDate,
      icon: RotateCcw,
      iconClass: 'text-blue-500',
    },
    {
      id: 'listing',
      label: 'Listing Date',
      date: ipo.dates?.listingDate,
      icon: BarChart2,
      iconClass: 'text-amber-500',
    },
  ];

  const hasAnyDate = timelineEvents.some((event) => Boolean(event.date));

  return (
    <div className="bg-white dark:bg-[#161f30] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all duration-200 overflow-hidden">
      {/* Top Section */}
      <div className="p-3.5 sm:p-4">
        {/* Row 1: Logo & Company Name/Dates on Left, Action Pill always on Top-Right */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          {/* Left: Logo & Company Name */}
          <Link
            href={`/ipos/${ipo.slug}`}
            className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1 group"
          >
            {/* 1. Logo */}
            {ipo.logoUrl && !imageError ? (
              <img
                src={ipo.logoUrl}
                alt={ipo.companyName}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs">
                {getLogoInitials()}
              </div>
            )}

            {/* Company details */}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight truncate">
                {ipo.symbol || ipo.companyName}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                {ipo.companyName}
              </p>
              {/* 3. Open–Close date stays under company name */}
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal block mt-0.5">
                {formattedDates}
              </span>
            </div>
          </Link>

          {/* Right: Action Pill & Dates Button stacked vertically */}
          <div className="shrink-0 flex flex-col items-stretch justify-start gap-2 pt-0.5 w-[88px] sm:w-[100px]">
            <span
              className={cn(
                'text-[10px] sm:text-[11px] font-bold px-1.5 py-1.5 sm:py-1.5 rounded-xl uppercase tracking-wider block text-center leading-none whitespace-nowrap shadow-2xs',
                actionBadge.classes
              )}
            >
              {actionBadge.label}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDatesExpanded((prev) => !prev);
              }}
              aria-expanded={isDatesExpanded}
              aria-label="Toggle IPO dates timeline"
              className={cn(
                'inline-flex items-center justify-center gap-1 py-1 rounded-xl text-[11px] sm:text-xs font-semibold transition-all border cursor-pointer select-none',
                isDatesExpanded
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60 shadow-xs'
                  : 'bg-blue-50/70 text-blue-600 border-blue-100 hover:bg-blue-50 hover:border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50'
              )}
            >
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Dates</span>
              {isDatesExpanded ? (
                <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable IPO Dates Section */}
        {isDatesExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] rounded-xl bg-slate-50/75 dark:bg-[#111827]/80 p-3 sm:p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                IPO Dates
              </h4>
            </div>

            {hasAnyDate ? (
              <div className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                {timelineEvents.map((evt) => {
                  const Icon = evt.icon;
                  return (
                    <div
                      key={evt.id}
                      className="py-2 first:pt-0.5 last:pb-0.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', evt.iconClass)} />
                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                          {evt.label}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white font-numeric shrink-0 whitespace-nowrap text-right">
                        {formatTimelineDate(evt.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                Detailed timeline dates have not yet been announced.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Metrics: 2-column grid on all breakpoints */}
      <div className="bg-slate-50/90 dark:bg-[#111827] px-3.5 sm:px-4 py-2.5 border-t border-slate-100/90 dark:border-white/[0.04] text-left grid grid-cols-2 gap-2.5 sm:gap-x-4 sm:gap-y-2.5">
        {isListed ? (
          <>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Price Range
              </span>
              <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-numeric block mt-0.5 truncate">
                {formatPriceRange()}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Listing Price
              </span>
              <strong
                className={cn(
                  'text-xs font-semibold font-numeric block mt-0.5 truncate',
                  listingData.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {listingData.text}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Current Price
              </span>
              <strong
                className={cn(
                  'text-xs font-semibold font-numeric block mt-0.5 truncate',
                  currentData.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {currentData.text}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Lot Size
              </span>
              <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-numeric block mt-0.5 truncate">
                {formatLotSize()}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Last GMP
              </span>
              <strong
                className={cn(
                  'text-xs font-semibold font-numeric block mt-0.5 truncate',
                  (ipo.listing?.finalGmp ?? gmpAmount) != null && Number(ipo.listing?.finalGmp ?? gmpAmount) > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : (ipo.listing?.finalGmp ?? gmpAmount) != null && Number(ipo.listing?.finalGmp ?? gmpAmount) < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                )}
              >
                {formatLastGmp()}
              </strong>
            </div>
            <div className="min-w-0">
              <span
                className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate"
                title="Overall Subscription"
              >
                Overall Sub.
              </span>
              <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-numeric block mt-0.5 truncate">
                {formatOverallSubscription()}
              </strong>
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Price Range
              </span>
              <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-numeric block mt-0.5 truncate">
                {formatPriceRange()}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                GMP
              </span>
              <strong
                className={cn(
                  'text-xs font-semibold font-numeric block mt-0.5 truncate',
                  gmpPercent != null && gmpPercent > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : gmpPercent != null && gmpPercent < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                )}
              >
                {formatGmp()}
              </strong>
            </div>
            <div className="min-w-0">
              <span
                className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate"
                title="Overall Subscription"
              >
                Overall Sub.
              </span>
              <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-numeric block mt-0.5 truncate">
                {formatOverallSubscription()}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 block truncate">
                Lot Size
              </span>
              <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-numeric block mt-0.5 truncate">
                {formatLotSize()}
              </strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
