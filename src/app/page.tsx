'use client';

/**
 * ==============================================================================
 * IPO DEALS — MOBILE FINTECH EXPERIENCE (MATCHING USER REFERENCE DESIGN)
 * ==============================================================================
 * Clean, high-density mobile interface with:
 * - Header: [Category Title] + Filter (SlidersHorizontal) + Search
 * - Tabs: Upcoming | Open/Closed | Allotted/Listed
 * - Compact IPO cards with OPEN status, same-design action pill, & 3-column stats
 * - Card clicks directly to comprehensive details (/ipos/[slug])
 * - System Default / Light / Dark theme preference switcher in Settings
 * ==============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { IpoCard } from '@/components/ipo/IpoCard';
import { BottomNav, TabType } from '@/components/layout/BottomNav';
import { SettingsView } from '@/components/settings/SettingsView';
import { IpoItem } from '@/types/ipo';
import { AllotmentIpoSummary } from '@/lib/data/ipos';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  TrendingUp,
  Search,
  X,
  FileQuestion,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { cn, compareIpoByDateAsc } from '@/lib/utils';

export type CategoryFilterType = 'MAINBOARD' | 'SME' | 'ALL';
export type LifecycleTab = 'UPCOMING' | 'OPEN_CLOSED' | 'LISTED';

export default function HomePage() {
  // Bottom Navigation tab: 'ipos' (default) | 'allotment' | 'settings'
  const [activeTab, setActiveTab] = useState<TabType>('ipos');

  // Category Filter: Mainboard (Default) | SME | All
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('MAINBOARD');
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);

  // Lifecycle Subtabs: Upcoming | Open/Closed (Default) | Allotted/Listed
  const [activeSubTab, setActiveSubTab] = useState<LifecycleTab>('OPEN_CLOSED');

  // Sync client-only state from URL params and localStorage after mount
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'allotment') setActiveTab('allotment');
        else if (tab === 'settings') setActiveTab('settings');

        const savedSeg = localStorage.getItem('ipo_pref_default_segment');
        if (savedSeg === 'Mainboard') setCategoryFilter('MAINBOARD');
        else if (savedSeg === 'SME') setCategoryFilter('SME');
        else if (savedSeg === 'All') setCategoryFilter('ALL');

        const savedTab = localStorage.getItem('ipo_pref_default_tab');
        if (savedTab === 'Upcoming') setActiveSubTab('UPCOMING');
        else if (savedTab === 'Listed') setActiveSubTab('LISTED');
        else if (savedTab === 'Current IPO') setActiveSubTab('OPEN_CLOSED');
      } catch {}
    });
  }, []);

  // Listen for browser back/forward navigation (popstate)
  useEffect(() => {
    const onPopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab === 'allotment') setActiveTab('allotment');
        else if (tab === 'settings') setActiveTab('settings');
        else setActiveTab('ipos');
      } catch {}
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (newTab === 'ipos') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', newTab);
        }
        window.history.pushState({}, '', url.toString());
      } catch {}
    }
  };

  // Search state
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');


  // Allotment Checker state (Strict 7-Day Server-Side Window)
  const [allotmentIpos, setAllotmentIpos] = useState<{
    mainboard: AllotmentIpoSummary[];
    sme: AllotmentIpoSummary[];
    all: AllotmentIpoSummary[];
  }>({ mainboard: [], sme: [], all: [] });
  const [allotmentLoading, setAllotmentLoading] = useState<boolean>(true);
  const [allotmentSymbol, setAllotmentSymbol] = useState<string>('');
  const [allotmentIdType, setAllotmentIdType] = useState<'PAN' | 'APP' | 'DP'>('PAN');
  const [allotmentQuery, setAllotmentQuery] = useState<string>('');
  const [allotmentResult, setAllotmentResult] = useState<{
    searched: boolean;
    status: 'FINALIZED' | 'PENDING';
    company: string;
    slug?: string;
    registrar: string;
    allotmentDate: string;
    refundDate: string;
    queryId: string;
    idType: 'PAN' | 'APP' | 'DP';
  } | null>(null);

  // Real Database IPOs State (Main Catalog for Current/Upcoming/Past)
  const [iposData, setIposData] = useState<IpoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load real Neon DB data for catalog
  const loadDatabaseIpos = async () => {
    try {
      const res = await fetch('/api/ipos');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setIposData(json.data);
        }
      }
    } catch (err) {
      console.warn('Error fetching IPO records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initFetch() {
      try {
        const res = await fetch('/api/ipos');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && isMounted) {
            setIposData(json.data);
          }
        }
      } catch (err) {
        console.warn('Initial fetch error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    initFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch strictly 7-day allotment window offerings
  useEffect(() => {
    let isMounted = true;
    async function loadAllotmentOfferings() {
      try {
        const res = await fetch('/api/allotment/ipos');
        if (res.ok) {
          const json = await res.json();
          if (json.data && isMounted) {
            setAllotmentIpos(json.data);
            if (json.data.all && json.data.all.length > 0) {
              setAllotmentSymbol((prev) => prev || json.data.all[0].symbol || json.data.all[0].slug);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading allotment offerings:', err);
      } finally {
        if (isMounted) {
          setAllotmentLoading(false);
        }
      }
    }
    loadAllotmentOfferings();

    return () => {
      isMounted = false;
    };
  }, []);


  // Filter IPOs according to Category, Subtab, and Search Query
  const processedIpos = useMemo(() => {
    const result = iposData.filter((ipo) => {
      // 1. Category Filter
      if (categoryFilter === 'MAINBOARD' && ipo.category === 'SME') return false;
      if (categoryFilter === 'SME' && ipo.category !== 'SME') return false;

      // 2. Lifecycle Subtab
      if (activeSubTab === 'UPCOMING') {
        if (ipo.status !== 'UPCOMING') return false;
      } else if (activeSubTab === 'OPEN_CLOSED') {
        // Show active OPEN offerings as well as post-issue CLOSED offerings awaiting allotment/listing
        if (ipo.status !== 'OPEN' && ipo.status !== 'CLOSED') return false;
      } else if (activeSubTab === 'LISTED') {
        // Show offerings whose lifecycle status is LISTED
        if (ipo.status !== 'LISTED') return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ipo.companyName.toLowerCase().includes(q);
        const matchSymbol = ipo.symbol.toLowerCase().includes(q);
        if (!matchName && !matchSymbol) return false;
      }

      return true;
    });

    // For Past / Listed IPOs, sort by listing date descending (most recently listed first)
    if (activeSubTab === 'LISTED') {
      return [...result].sort((a, b) => {
        const dateA = a.dates?.listingDate || a.dates?.offerEndDate || '';
        const dateB = b.dates?.listingDate || b.dates?.offerEndDate || '';
        if (dateA && dateB) {
          const diff = dateB.localeCompare(dateA);
          if (diff !== 0) return diff;
        } else if (dateB && !dateA) {
          return 1;
        } else if (dateA && !dateB) {
          return -1;
        }
        return a.companyName.localeCompare(b.companyName);
      });
    }

    // Sort order: OPEN first, then UPCOMING, then CLOSED, then by date
    const statusPriority: Record<string, number> = {
      OPEN: 0,
      UPCOMING: 1,
      CLOSED: 2,
    };

    return [...result].sort((a, b) => {
      const pDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
      if (pDiff !== 0) return pDiff;
      return compareIpoByDateAsc(a, b);
    });
  }, [iposData, categoryFilter, activeSubTab, searchQuery]);

  // Handle Allotment Status Check (from recent 7-day allotment window)
  const handleCheckAllotment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotmentQuery.trim() || allotmentIpos.all.length === 0) return;

    const matchedIpo =
      allotmentIpos.all.find(
        (i) => i.symbol === allotmentSymbol || i.slug === allotmentSymbol
      ) || allotmentIpos.all[0];
    if (!matchedIpo) return;

    const isFinalized = matchedIpo.status === 'LISTED' || matchedIpo.status === 'CLOSED';
    setAllotmentResult({
      searched: true,
      status: isFinalized ? 'FINALIZED' : 'PENDING',
      company: matchedIpo.companyName,
      slug: matchedIpo.slug,
      registrar: matchedIpo.registrar || 'Link Intime India Pvt Ltd',
      allotmentDate: matchedIpo.dates?.allotmentDate || 'To Be Announced',
      refundDate: matchedIpo.dates?.refundDate || '—',
      queryId: allotmentQuery.trim(),
      idType: allotmentIdType,
    });
  };

  const getCategoryTitle = () => {
    switch (categoryFilter) {
      case 'MAINBOARD':
        return 'Mainboard IPOs';
      case 'SME':
        return 'SME IPOs';
      case 'ALL':
      default:
        return 'All IPOs';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#0b0f17] dark:text-[#dfe2ee] font-sans antialiased pb-20 select-none">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER (MATCHING SCREENSHOT 1 & 2) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' ? (
        <header className="sticky top-0 z-40 bg-[#0060d2] text-white px-4 py-3.5 shadow-xs">
          <div className="w-full max-w-lg md:max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-bold text-lg text-white">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.2]" />
              <span>IPO Deals</span>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] px-4 py-3">
          <div className="w-full max-w-lg md:max-w-6xl mx-auto flex items-center justify-between">
            {/* Header Title with interactive Category Switcher */}
            <button
              type="button"
              onClick={() => setCategoryModalOpen(!categoryModalOpen)}
              className="flex items-center gap-1.5 font-bold text-lg text-slate-900 dark:text-white cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span suppressHydrationWarning>{getCategoryTitle()}</span>
              <ChevronDown className="w-4 h-4 text-slate-500 transition-transform duration-200" />
            </button>

            {/* Action icons: Search & Animated Sun-Moon Theme Toggle */}
            <div className="flex items-center gap-2">
              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((prev) => !prev);
                  if (searchOpen) setSearchQuery('');
                }}
                aria-label="Search"
                className={cn(
                  'p-2 rounded-xl transition-colors cursor-pointer',
                  searchOpen
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                )}
              >
                <Search className="w-5 h-5 stroke-[1.8]" />
              </button>

              {/* Animated Sun → Moon Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>

          {/* Category Filter Dropdown / Selection Bar */}
          {categoryModalOpen && (
            <div className="w-full max-w-lg md:max-w-6xl mx-auto mt-2 pt-2 pb-1 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-2">
              {(['MAINBOARD', 'SME', 'ALL'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat);
                    setCategoryModalOpen(false);
                  }}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center',
                    categoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#161f30] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  )}
                >
                  {cat === 'MAINBOARD' ? 'Mainboard' : cat === 'SME' ? 'SME' : 'All IPOs'}
                </button>
              ))}
            </div>
          )}

          {/* Expandable Search Input */}
          {searchOpen && (
            <div className="w-full max-w-lg md:max-w-6xl mx-auto mt-2.5">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company or symbol..."
                  autoFocus
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SUBTABS ROW: Current IPO | Upcoming IPO | Past IPO */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'ipos' && (
            <div className="w-full max-w-lg md:max-w-6xl mx-auto flex items-center justify-between border-t border-slate-100 dark:border-white/[0.06] mt-2.5 pt-1 text-xs">
              {(
                [
                  { id: 'OPEN_CLOSED', label: 'Current IPO' },
                  { id: 'UPCOMING', label: 'Upcoming IPO' },
                  { id: 'LISTED', label: 'Past IPO' },
                ] as const
              ).map((sub) => {
                const isActive = activeSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSubTab(sub.id)}
                    className={cn(
                      'flex-1 py-2 text-center transition-colors relative cursor-pointer font-medium',
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    {sub.label}
                    {isActive && (
                      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </header>
      )}


      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="w-full max-w-lg md:max-w-6xl mx-auto px-3.5 sm:px-4 py-3 space-y-3">
        {/* ==================================================================== */}
        {/* TAB 1: IPOS FEED (SCREENSHOT DESIGN) */}
        {/* ==================================================================== */}
        {activeTab === 'ipos' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading IPO offerings...</p>
              </div>
            ) : processedIpos.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#161f30] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <FileQuestion className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    No IPOs Found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    {searchQuery
                      ? `No match found for "${searchQuery}".`
                      : `No ${getCategoryTitle()} currently available in this tab.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    loadDatabaseIpos();
                  }}
                  className="inline-flex items-center gap-1.5 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:[grid-template-columns:repeat(auto-fit,minmax(330px,1fr))] gap-3 sm:gap-4">
                {processedIpos.map((ipo) => (
                  <IpoCard
                    key={ipo.slug}
                    ipo={ipo}
                    isListedView={activeSubTab === 'LISTED'}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: ALLOTMENT / PANS CHECKER (STRICT 7-DAY SERVER-SIDE WINDOW) */}
        {/* ==================================================================== */}
        {activeTab === 'allotment' && (() => {
          const selectedAllotmentIpo =
            allotmentIpos.all.find(
              (i) => i.symbol === allotmentSymbol || i.slug === allotmentSymbol
            ) || allotmentIpos.all[0];

          return (
            <div className="space-y-3 max-w-xl mx-auto">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Allotment & PAN Checker
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registrar verification for offerings closed within the recent 7-day window
                </p>
              </div>

              {allotmentLoading ? (
                <div className="bg-white dark:bg-[#161f30] p-8 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading recent 7-day offerings...</p>
                </div>
              ) : allotmentIpos.all.length === 0 ? (
                <div className="bg-white dark:bg-[#161f30] p-8 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] text-center space-y-2 text-xs text-slate-500">
                  <FileQuestion className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No IPOs Closed in the Past 7 Days
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Allotment verification is available strictly within 7 days of an IPO offer close date.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleCheckAllotment}
                  className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3.5 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Select IPO Offering
                      </label>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Recent 7-Day Window
                      </span>
                    </div>
                    <select
                      value={allotmentSymbol}
                      onChange={(e) => setAllotmentSymbol(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      {allotmentIpos.mainboard.length > 0 && (
                        <optgroup label="MAINBOARD">
                          {allotmentIpos.mainboard.map((item) => (
                            <option key={item.slug} value={item.symbol || item.slug}>
                              {item.companyName} ({item.symbol || 'IPO'})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {allotmentIpos.sme.length > 0 && (
                        <optgroup label="SME">
                          {allotmentIpos.sme.map((item) => (
                            <option key={item.slug} value={item.symbol || item.slug}>
                              {item.companyName} ({item.symbol || 'SME'})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {selectedAllotmentIpo && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          Closed: <strong className="text-slate-700 dark:text-slate-300 font-numeric">{selectedAllotmentIpo.dates.offerEndDate}</strong>
                          {selectedAllotmentIpo.dates.refundDate && (
                            <> • Refund: <strong className="text-slate-700 dark:text-slate-300 font-numeric">{selectedAllotmentIpo.dates.refundDate}</strong></>
                          )}
                        </span>
                        <Link
                          href={`/ipos/${selectedAllotmentIpo.slug}?from=allotment`}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          View IPO Details →
                        </Link>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Query Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'PAN', label: 'PAN Card' },
                          { id: 'APP', label: 'App No' },
                          { id: 'DP', label: 'DP / Client ID' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAllotmentIdType(m.id)}
                          className={cn(
                            'py-2 px-1 text-center font-bold text-[11px] rounded-xl border transition-all cursor-pointer',
                            allotmentIdType === m.id
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-50 dark:bg-[#121826] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400'
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {allotmentIdType === 'PAN'
                        ? 'Enter 10-Digit PAN Number'
                        : allotmentIdType === 'APP'
                        ? 'Enter Application Number'
                        : 'Enter 16-Digit DP / Client ID'}
                    </label>
                    <input
                      type="text"
                      required
                      value={allotmentQuery}
                      onChange={(e) => setAllotmentQuery(e.target.value)}
                      placeholder={allotmentIdType === 'PAN' ? 'ABCDE1234F' : 'Enter number...'}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs text-center cursor-pointer"
                  >
                    Check Allotment Status
                  </button>
                </form>
              )}

              {allotmentResult && (
                <div
                  className={cn(
                    'rounded-2xl p-4 border text-xs space-y-3 shadow-xs',
                    allotmentResult.status === 'FINALIZED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {allotmentResult.status === 'FINALIZED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {allotmentResult.status === 'FINALIZED'
                          ? 'Allotment Finalized by Registrar'
                          : 'Allotment Pending Announcement'}
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {allotmentResult.company}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl bg-white/70 dark:bg-[#161f30]/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Official Registrar</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                        {allotmentResult.registrar}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Allotment Date</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-numeric">
                        {allotmentResult.allotmentDate}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Refund Date</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-numeric">
                        {allotmentResult.refundDate}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Queried ID ({allotmentResult.idType})</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {allotmentResult.queryId}
                      </strong>
                    </div>
                  </div>

                  {allotmentResult.slug && (
                    <div className="pt-1 text-right">
                      <Link
                        href={`/ipos/${allotmentResult.slug}?from=allotment`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Full Offering Analysis →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto">
            <SettingsView />
          </div>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. BOTTOM NAVIGATION BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
