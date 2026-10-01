'use client';

/**
 * ==============================================================================
 * IPO DETAIL VIEW
 * ==============================================================================
 * Tabs: Overview | GMP | Subscription | Dates | Listing
 * Real Data Only • Clean Mobile-First UI • Theme Aware
 * ==============================================================================
 */

import React, { use, useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { IpoItem } from '@/types/ipo';
import { SubscriptionGauge } from '@/components/ui/SubscriptionGauge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ArrowLeft,
  Info,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  TrendingUp,
  FileText,
  Calendar,
  Layers,
  BarChart3,
  BadgeCheck,
  Sparkles,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { cn, formatIpoDateRange, formatDisplayDate } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function subscribeToPopState(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getFromSnapshot() {
  return new URLSearchParams(window.location.search).get('from');
}

function getServerSnapshot() {
  return null;
}

export default function IpoDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'gmp' | 'subscription' | 'dates' | 'listing'>('overview');
  const [isAboutExpanded, setIsAboutExpanded] = useState<boolean>(false);
  const [ipo, setIpo] = useState<IpoItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [logoError, setLogoError] = useState<boolean>(false);
  const fromTab = useSyncExternalStore(subscribeToPopState, getFromSnapshot, getServerSnapshot);

  const getBackDestination = () => {
    if (fromTab === 'allotment') return '/?tab=allotment';
    if (fromTab === 'settings') return '/?tab=settings';
    return '/';
  };

  useEffect(() => {
    let isMounted = true;
    async function loadIpo() {
      try {
        const res = await fetch('/api/ipos');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && isMounted) {
            const found = json.data.find((item: IpoItem) => item.slug === resolvedParams.slug);
            if (found) {
              setIpo(found);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading IPO detail:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadIpo();
    return () => {
      isMounted = false;
    };
  }, [resolvedParams.slug]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#0b0f17] dark:text-[#f1f5f9] p-4 font-sans flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading IPO details...</p>
        </div>
      </div>
    );
  }

  if (!ipo) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#0b0f17] dark:text-[#f1f5f9] p-4 font-sans flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-8 text-center rounded-2xl bg-white dark:bg-[#161f30] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <FileQuestion className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              IPO Not Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The requested IPO offering could not be found or has not yet been ingested.
            </p>
          </div>
          <Link
            href={getBackDestination()}
            className="inline-flex items-center justify-center py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md"
          >
            {fromTab === 'allotment' ? 'Back to Allotment' : 'Back to All IPOs'}
          </Link>
        </div>
      </div>
    );
  }

  const currentIpo = ipo;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#0b0f17] dark:text-[#f1f5f9] pb-8 font-sans select-none">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-white/[0.08] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link
            href={getBackDestination()}
            className="p-1.5 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="text-center font-bold text-sm text-slate-900 dark:text-white">
            {currentIpo.symbol}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. MAIN DETAIL CONTAINER */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* COMPANY HERO BANNER */}
        <div className="flex items-center gap-3.5 bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs">
          {currentIpo.logoUrl && !logoError ? (
            <img
              src={currentIpo.logoUrl}
              alt={currentIpo.companyName}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="w-12 h-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shrink-0">
              {currentIpo.companyName.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight truncate">
              {currentIpo.companyName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
                {currentIpo.category === 'SME' ? 'SME' : 'Mainboard'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50">
                {currentIpo.status === 'OPEN'
                  ? 'Open'
                  : currentIpo.status === 'UPCOMING'
                  ? 'Upcoming'
                  : currentIpo.status === 'LISTED'
                  ? 'Listed'
                  : 'Closed'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-1">
              {formatIpoDateRange(currentIpo.dates)}
            </span>
          </div>
        </div>

        {/* SUBTABS: Overview | GMP | Subscription | Dates | Listing */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] text-xs font-bold">
          {(['overview', 'gmp', 'subscription', 'dates', 'listing'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2.5 text-center capitalize transition-colors relative cursor-pointer',
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ==================================================================== */}
        {/* SUBTAB 1: OVERVIEW */}
        {/* ==================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Real Issue Details Grid */}
            <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Issue Particulars</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Price Band */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Price Band</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.priceBandMin && currentIpo.priceBandMax && currentIpo.priceBandMin !== currentIpo.priceBandMax
                      ? `₹${currentIpo.priceBandMin} - ₹${currentIpo.priceBandMax}`
                      : currentIpo.priceBandMax
                      ? `₹${currentIpo.priceBandMax}`
                      : '—'}
                  </span>
                </div>

                {/* Issue Price */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Issue Price</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.issuePrice ? `₹${currentIpo.issuePrice}` : (currentIpo.priceBandMax ? `₹${currentIpo.priceBandMax}` : '—')}
                  </span>
                </div>

                {/* Lot Size */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Lot Size</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.lotSize ? `${currentIpo.lotSize} shares` : '—'}
                  </span>
                </div>

                {/* Min Investment */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Min. Investment</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.minInvestment
                      ? `₹${currentIpo.minInvestment.toLocaleString('en-IN')}`
                      : currentIpo.lotSize && currentIpo.priceBandMax
                      ? `₹${(currentIpo.lotSize * currentIpo.priceBandMax).toLocaleString('en-IN')}`
                      : '—'}
                  </span>
                </div>

                {/* Issue Size */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Total Issue Size</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.issueSizeCrores != null && currentIpo.issueSizeCrores > 0
                      ? `₹${currentIpo.issueSizeCrores} Cr`
                      : '—'}
                  </span>
                </div>

                {/* Face Value */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Face Value</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.faceValue != null ? `₹${currentIpo.faceValue} per share` : '—'}
                  </span>
                </div>

                {/* Fresh Issue */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Fresh Issue</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.freshIssueCrores != null && currentIpo.freshIssueCrores > 0
                      ? `₹${currentIpo.freshIssueCrores} Cr`
                      : '—'}
                  </span>
                </div>

                {/* Offer for Sale (OFS) */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Offer for Sale (OFS)</span>
                  <span className="font-bold text-slate-900 dark:text-white font-numeric text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.ofsCrores != null && currentIpo.ofsCrores > 0
                      ? `₹${currentIpo.ofsCrores} Cr`
                      : '—'}
                  </span>
                </div>

                {/* Listing Exchange */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Listing Exchange</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5 block">
                    {currentIpo.listingExchange || 'NSE, BSE'}
                  </span>
                </div>

                {/* Registrar */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Registrar</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5 block truncate">
                    {currentIpo.registrar ? (
                      currentIpo.registrarUrl ? (
                        <a
                          href={currentIpo.registrarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {currentIpo.registrar} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        currentIpo.registrar
                      )
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quota Structure if available */}
            {(currentIpo.retailQuotaPercent != null || currentIpo.qibQuotaPercent != null || currentIpo.niiQuotaPercent != null) && (
              <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Reservation Quota
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-numeric">
                  <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Retail</span>
                    <strong className="text-slate-900 dark:text-white">{currentIpo.retailQuotaPercent != null ? `${currentIpo.retailQuotaPercent}%` : '—'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">QIB</span>
                    <strong className="text-slate-900 dark:text-white">{currentIpo.qibQuotaPercent != null ? `${currentIpo.qibQuotaPercent}%` : '—'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">NII / HNI</span>
                    <strong className="text-slate-900 dark:text-white">{currentIpo.niiQuotaPercent != null ? `${currentIpo.niiQuotaPercent}%` : '—'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Strengths if available */}
            {currentIpo.strengths && currentIpo.strengths.length > 0 && (
              <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Company Strengths</span>
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-600 dark:text-slate-300">
                  {currentIpo.strengths.map((str, i) => (
                    <li key={i} className="leading-snug">{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks if available */}
            {currentIpo.risks && currentIpo.risks.length > 0 && (
              <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Key Risks</span>
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-600 dark:text-slate-300">
                  {currentIpo.risks.map((risk, i) => (
                    <li key={i} className="leading-snug">{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Official Documents (DRHP / RHP) if available */}
            {(currentIpo.drhpUrl || currentIpo.rhpUrl) && (
              <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-2">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>SEBI Offer Documents</span>
                </h4>
                <div className="flex gap-2 text-xs">
                  {currentIpo.drhpUrl && (
                    <a
                      href={currentIpo.drhpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800/50 hover:underline inline-flex items-center gap-1"
                    >
                      View DRHP <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {currentIpo.rhpUrl && (
                    <a
                      href={currentIpo.rhpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800/50 hover:underline inline-flex items-center gap-1"
                    >
                      View RHP <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* About / Description Section */}
            <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                About {currentIpo.companyName}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentIpo.aiDescription || currentIpo.description || ''}
                {isAboutExpanded && (
                  <span className="block mt-2">
                    Category classification: {currentIpo.category} | Market Status: {currentIpo.status}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer pt-1"
              >
                <span>{isAboutExpanded ? 'Read Less' : 'Read More'}</span>
                {isAboutExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SUBTAB 2: GMP TREND & ESTIMATES */}
        {/* ==================================================================== */}
        {activeTab === 'gmp' && (
          <div className="space-y-4">
            {currentIpo.gmp ? (
              <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Grey Market Premium (GMP)</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">GMP Amount</span>
                    <span
                      className={cn(
                        'text-xl font-black font-numeric block mt-0.5',
                        currentIpo.gmp.percentage < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      ₹{currentIpo.gmp.amount.toFixed(1)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">GMP Gain %</span>
                    <span
                      className={cn(
                        'text-xl font-black font-numeric block mt-0.5',
                        currentIpo.gmp.percentage < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {currentIpo.gmp.percentage < 0 ? '' : '+'}{currentIpo.gmp.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#121826] rounded-xl flex items-center justify-between text-xs font-numeric">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Listing Price</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {currentIpo.gmp.estimatedListingPrice != null
                      ? `₹${currentIpo.gmp.estimatedListingPrice}`
                      : currentIpo.priceBandMax != null
                      ? `₹${currentIpo.priceBandMax + currentIpo.gmp.amount}`
                      : '—'}
                  </span>
                </div>

                {/* GMP Trend History Table */}
                {currentIpo.gmp.history && currentIpo.gmp.history.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      GMP History Timeline
                    </span>
                    <div className="space-y-1.5">
                      {currentIpo.gmp.history.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#121826] text-xs font-numeric"
                        >
                          <span className="text-slate-500 dark:text-slate-400">
                            {formatDisplayDate(pt.date, true)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              ₹{pt.gmpAmount}
                            </span>
                            <span
                              className={cn(
                                'text-[11px] font-semibold',
                                pt.gmpPercentage < 0
                                  ? 'text-rose-500'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              )}
                            >
                              ({pt.gmpPercentage > 0 ? '+' : ''}{pt.gmpPercentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Quote Source</span>
                  <span className="font-numeric">{currentIpo.gmp.source || 'Market Quotes'}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#161f30] p-8 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs text-center space-y-2">
                <TrendingUp className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  No GMP Quotes Available
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Grey market trading activity has not yet reported verified quotes for {currentIpo.companyName}.
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/30 p-3.5 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                GMP quotes are indicators from market desks and are not official exchange prices. Estimated listing price is an estimate and may differ from actual opening auction.
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SUBTAB 3: SUBSCRIPTION */}
        {/* ==================================================================== */}
        {activeTab === 'subscription' && (
          <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Bidding Subscription</span>
              </h3>
              {currentIpo.subscription?.lastUpdated && (
                <span className="text-[10px] text-slate-400 font-numeric">
                  Updated: {new Date(currentIpo.subscription.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            {currentIpo.subscription ? (
              <div className="space-y-3">
                <SubscriptionGauge
                  qib={currentIpo.subscription.qib}
                  nii={currentIpo.subscription.niiTotal}
                  retail={currentIpo.subscription.retail}
                  total={currentIpo.subscription.total}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-2 font-numeric">
                  {/* QIB */}
                  <div className="p-2.5 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">QIB</span>
                    <strong className="text-slate-800 dark:text-white text-sm">
                      {currentIpo.subscription.qib != null ? `${currentIpo.subscription.qib}x` : '—'}
                    </strong>
                  </div>

                  {/* NII / HNI */}
                  <div className="p-2.5 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">NII / HNI</span>
                    <strong className="text-slate-800 dark:text-white text-sm">
                      {currentIpo.subscription.niiTotal != null
                        ? `${currentIpo.subscription.niiTotal}x`
                        : currentIpo.subscription.bNii != null || currentIpo.subscription.sNii != null
                        ? `${((currentIpo.subscription.bNii || 0) + (currentIpo.subscription.sNii || 0)).toFixed(2)}x`
                        : '—'}
                    </strong>
                  </div>

                  {/* Retail */}
                  <div className="p-2.5 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Retail</span>
                    <strong className="text-slate-800 dark:text-white text-sm">
                      {currentIpo.subscription.retail != null ? `${currentIpo.subscription.retail}x` : '—'}
                    </strong>
                  </div>

                  {/* Total */}
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">Total</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-black text-sm">
                      {currentIpo.subscription.total != null ? `${currentIpo.subscription.total}x` : '—'}
                    </strong>
                  </div>
                </div>

                {/* Extended categories if present */}
                {(currentIpo.subscription.bNii != null ||
                  currentIpo.subscription.sNii != null ||
                  currentIpo.subscription.employee != null ||
                  currentIpo.subscription.shareholder != null) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-numeric pt-1">
                    {currentIpo.subscription.bNii != null && (
                      <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                        <span className="text-[10px] text-slate-400 block">bNII (&gt;10L)</span>
                        <strong className="text-slate-800 dark:text-white">{currentIpo.subscription.bNii}x</strong>
                      </div>
                    )}
                    {currentIpo.subscription.sNii != null && (
                      <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                        <span className="text-[10px] text-slate-400 block">sNII (2L-10L)</span>
                        <strong className="text-slate-800 dark:text-white">{currentIpo.subscription.sNii}x</strong>
                      </div>
                    )}
                    {currentIpo.subscription.employee != null && (
                      <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Employee</span>
                        <strong className="text-slate-800 dark:text-white">{currentIpo.subscription.employee}x</strong>
                      </div>
                    )}
                    {currentIpo.subscription.shareholder != null && (
                      <div className="p-2 bg-slate-50 dark:bg-[#121826] rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Shareholder</span>
                        <strong className="text-slate-800 dark:text-white">{currentIpo.subscription.shareholder}x</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                Subscription bidding numbers not yet available for this offering.
              </p>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SUBTAB 4: DATES */}
        {/* ==================================================================== */}
        {activeTab === 'dates' && (
          <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Official Offering Timeline</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Open Date</span>
                <strong className="font-numeric text-slate-900 dark:text-white">{formatDisplayDate(currentIpo.dates?.offerStartDate)}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Close Date</span>
                <strong className="font-numeric text-slate-900 dark:text-white">{formatDisplayDate(currentIpo.dates?.offerEndDate)}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Allotment Date</span>
                <strong className="font-numeric text-slate-900 dark:text-white">{formatDisplayDate(currentIpo.dates?.allotmentDate)}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Refund Date</span>
                <strong className="font-numeric text-slate-900 dark:text-white">{formatDisplayDate(currentIpo.dates?.refundDate || currentIpo.dates?.unblockingDate)}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Listing Date</span>
                <strong className="font-numeric text-slate-900 dark:text-white">{formatDisplayDate(currentIpo.dates?.listingDate)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SUBTAB 5: LISTING */}
        {/* ==================================================================== */}
        {activeTab === 'listing' && (
          <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Exchange Listing Results</span>
            </h3>

            {currentIpo.status === 'LISTED' || currentIpo.listing?.listingPrice != null ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-numeric">
                  <div className="p-2.5 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Issue Price</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      ₹{currentIpo.listing?.issuePrice || currentIpo.priceBandMax || '—'}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-[#121826] rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Actual Listing Price</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {currentIpo.listing?.listingPrice != null ? `₹${currentIpo.listing.listingPrice}` : '—'}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Listing Gain</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      {currentIpo.listing?.gainLossPercent != null
                        ? `${currentIpo.listing.gainLossPercent >= 0 ? '+' : ''}${currentIpo.listing.gainLossPercent.toFixed(1)}%`
                        : '—'}
                    </strong>
                  </div>
                </div>

                {/* Live Market Quote */}
                {currentIpo.marketQuote?.ltp != null && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Live Market Quote</span>
                      <span className="text-[10px] text-slate-400">Via Upstox Real-Time Feed</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-numeric">
                      <div className="p-2 bg-white dark:bg-[#121826] rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Current Price</span>
                        <strong className="text-slate-900 dark:text-white text-sm">₹{currentIpo.marketQuote.ltp.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#121826] rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Since Listing</span>
                        <strong className={cn(
                          'text-sm font-bold',
                          currentIpo.listing?.listingPrice != null && currentIpo.marketQuote.ltp >= currentIpo.listing.listingPrice
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {currentIpo.listing?.listingPrice != null && currentIpo.listing.listingPrice > 0
                            ? (() => {
                                const pct = ((currentIpo.marketQuote.ltp - currentIpo.listing.listingPrice) / currentIpo.listing.listingPrice) * 100;
                                const formatted = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
                                return `${pct >= 0 ? '+' : ''}${formatted}%`;
                              })()
                            : '—'}
                        </strong>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#121826] rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Today&apos;s Change</span>
                        <strong className={cn('text-sm font-bold', (currentIpo.marketQuote.changePercent || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                          {currentIpo.marketQuote.changePercent != null ? `${currentIpo.marketQuote.changePercent >= 0 ? '+' : ''}${currentIpo.marketQuote.changePercent.toFixed(2)}%` : '—'}
                        </strong>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#121826] rounded-lg">
                        <span className="text-[10px] text-slate-400 block">Volume</span>
                        <strong className="text-slate-900 dark:text-white text-sm">
                          {currentIpo.marketQuote.volume != null
                            ? currentIpo.marketQuote.volume >= 10000000
                              ? `${(currentIpo.marketQuote.volume / 10000000).toFixed(2)} Cr`
                              : currentIpo.marketQuote.volume >= 100000
                              ? `${(currentIpo.marketQuote.volume / 100000).toFixed(2)} L`
                              : currentIpo.marketQuote.volume.toLocaleString('en-IN')
                            : '—'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-numeric">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                    <span className="text-[10px] text-slate-400 block">Final GMP Before Listing</span>
                    <strong className="text-slate-900 dark:text-white">
                      {currentIpo.listing?.finalGmp != null ? `₹${currentIpo.listing.finalGmp}` : '—'}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826]">
                    <span className="text-[10px] text-slate-400 block">GMP vs Actual Variance</span>
                    <strong className="text-slate-900 dark:text-white">
                      {currentIpo.listing?.gmpVariance != null ? `₹${currentIpo.listing.gmpVariance}` : '—'}
                    </strong>
                  </div>
                </div>


                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826] text-xs font-numeric">
                  <span className="text-slate-500 dark:text-slate-400">Listing Date</span>
                  <strong className="text-slate-900 dark:text-white">{formatDisplayDate(currentIpo.dates?.listingDate)}</strong>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This IPO has not listed on the exchange yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Actual listing price and gain % will be updated on {formatDisplayDate(currentIpo.dates?.listingDate) !== '—' ? formatDisplayDate(currentIpo.dates?.listingDate) : 'listing day'}.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
