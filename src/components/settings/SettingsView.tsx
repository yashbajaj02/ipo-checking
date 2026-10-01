'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  Laptop,
  Smartphone,
  Monitor,
  SlidersHorizontal,
  Users,
  Calendar,
  Shield,
  FileText,
  Info,
  Code,
  ChevronRight,
  ArrowLeft,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  LogOut,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SettingsSubView = 'main' | 'account' | 'pans' | 'devices' | 'privacy';

interface PanRecord {
  id: string;
  holderName: string;
  maskedPan: string;
  createdAt: string;
}

interface DeviceSession {
  id: string;
  deviceType: 'mobile' | 'laptop' | 'desktop';
  deviceName: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export function SettingsView() {
  // Active sub-screen inside Settings
  const [subView, setSubView] = useState<SettingsSubView>('main');

  // Preferences & Auth State (Deterministic initial values to prevent hydration mismatch)
  const [defaultSegment, setDefaultSegment] = useState<'All' | 'Mainboard' | 'SME'>('All');
  const [defaultIpoTab, setDefaultIpoTab] = useState<'Current IPO' | 'Upcoming IPO' | 'Past IPO'>('Current IPO');
  const [authToast, setAuthToast] = useState<string | null>(null);

  // User Auth State
  const [user, setUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    picture?: string | null;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Sync client-only preferences and URL auth state on mount
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedSeg = localStorage.getItem('ipo_pref_default_segment');
        if (savedSeg === 'All' || savedSeg === 'Mainboard' || savedSeg === 'SME') {
          setDefaultSegment(savedSeg);
        }

        const savedTab = localStorage.getItem('ipo_pref_default_tab');
        if (savedTab === 'Current IPO' || savedTab === 'Upcoming IPO' || savedTab === 'Past IPO') {
          setDefaultIpoTab(savedTab);
        } else if (savedTab === 'Upcoming') {
          setDefaultIpoTab('Upcoming IPO');
        } else if (savedTab === 'Listed') {
          setDefaultIpoTab('Past IPO');
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth') === 'success') {
          setAuthToast('Signed in successfully with Google!');
        } else if (urlParams.get('auth_error')) {
          setAuthToast(`Sign-in error: ${urlParams.get('auth_error')}`);
        }
      } catch {}
    });
  }, []);

  // PAN Cards State (Real server-side database records, ZERO fake data)
  const [pans, setPans] = useState<PanRecord[]>([]);
  const [pansLoading, setPansLoading] = useState<boolean>(false);
  const [panTab, setPanTab] = useState<'saved' | 'unsaved'>('saved');
  const [panSearchQuery, setPanSearchQuery] = useState<string>('');
  const [panSearchOpen, setPanSearchOpen] = useState<boolean>(false);

  // Add/Edit PAN Modal State
  const [panModalOpen, setPanModalOpen] = useState<boolean>(false);
  const [editingPanId, setEditingPanId] = useState<string | null>(null);
  const [modalPanName, setModalPanName] = useState<string>('');
  const [modalPanNumber, setModalPanNumber] = useState<string>('');
  const [modalPanError, setModalPanError] = useState<string>('');
  const [isSavingPan, setIsSavingPan] = useState<boolean>(false);

  // Logged-in Devices State (Real database sessions only, ZERO fake data)
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);

  // Auto-dismiss auth feedback toast
  useEffect(() => {
    if (authToast) {
      const timer = setTimeout(() => setAuthToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [authToast]);

  // Check authenticated session from server on mount
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            if (json.user && json.hasConsented === false) {
              window.location.href = '/consent';
              return;
            }
            setUser(json.user || null);
          }
        }
      } catch (err) {
        console.warn('Error fetching session:', err);
      } finally {
        if (isMounted) {
          setAuthChecked(true);
        }
      }
    }
    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real PAN records or device sessions when opening respective subviews
  useEffect(() => {
    let isMounted = true;
    if (subView === 'pans' && user) {
      async function loadPans() {
        try {
          const res = await fetch('/api/user/pans');
          if (res.ok) {
            const json = await res.json();
            if (json.pans && Array.isArray(json.pans) && isMounted) {
              setPans(json.pans);
            }
          } else if (res.status === 401 && isMounted) {
            setPans([]);
          }
        } catch (err) {
          console.warn('Error loading PANs:', err);
        } finally {
          if (isMounted) {
            setPansLoading(false);
          }
        }
      }
      loadPans();
    } else if (subView === 'devices' && user) {
      async function loadSessions() {
        try {
          const res = await fetch('/api/user/sessions');
          if (res.ok) {
            const json = await res.json();
            if (json.sessions && Array.isArray(json.sessions) && isMounted) {
              setSessions(json.sessions);
            }
          } else if (res.status === 401 && isMounted) {
            setSessions([]);
          }
        } catch (err) {
          console.warn('Error loading sessions:', err);
        } finally {
          if (isMounted) {
            setSessionsLoading(false);
          }
        }
      }
      loadSessions();
    }

    return () => {
      isMounted = false;
    };
  }, [subView, user]);

  const refreshPans = async () => {
    try {
      const res = await fetch('/api/user/pans');
      if (res.ok) {
        const json = await res.json();
        if (json.pans && Array.isArray(json.pans)) {
          setPans(json.pans);
        }
      }
    } catch (err) {
      console.warn('Error refreshing PANs:', err);
    }
  };

  const refreshSessions = async () => {
    try {
      const res = await fetch('/api/user/sessions');
      if (res.ok) {
        const json = await res.json();
        if (json.sessions && Array.isArray(json.sessions)) {
          setSessions(json.sessions);
        }
      }
    } catch (err) {
      console.warn('Error refreshing sessions:', err);
    }
  };

  // Default Segment Change Handler
  const handleSegmentChange = (seg: 'All' | 'Mainboard' | 'SME') => {
    setDefaultSegment(seg);
    try {
      localStorage.setItem('ipo_pref_default_segment', seg);
    } catch {}
  };

  // Default Tab Change Handler
  const handleIpoTabChange = (t: 'Current IPO' | 'Upcoming IPO' | 'Past IPO') => {
    setDefaultIpoTab(t);
    try {
      localStorage.setItem('ipo_pref_default_tab', t);
    } catch {}
  };

  // Google Sign-In Trigger
  const handleGoogleSignIn = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          window.location.href = json.url;
          return;
        }
      }
      setAuthToast('Unable to initialize Google Auth. Check configuration.');
    } catch (err) {
      console.error('Error initiating Google OAuth:', err);
      setAuthToast('Network error initiating sign in.');
    }
  };

  // Logout Handler
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    setUser(null);
    setPans([]);
    setSessions([]);
    setAuthToast('Signed out of your account');
    window.location.href = '/login';
  };

  // Save / Update PAN to Backend API
  const handleSavePanModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = modalPanName.trim();
    const cleanPan = modalPanNumber.trim().toUpperCase();

    if (!cleanName) {
      setModalPanError('Please enter cardholder name');
      return;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      setModalPanError('Invalid PAN. Must be 10 characters (e.g. ABCDE1234F)');
      return;
    }

    setIsSavingPan(true);
    setModalPanError('');

    try {
      if (editingPanId) {
        // Edit existing PAN
        const res = await fetch('/api/user/pans', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPanId,
            holderName: cleanName,
            panNumber: cleanPan,
          }),
        });
        if (res.ok) {
          await refreshPans();
          setPanModalOpen(false);
          setEditingPanId(null);
        } else {
          const errData = await res.json();
          setModalPanError(errData.error || 'Failed to update PAN');
        }
      } else {
        // Add new PAN
        const res = await fetch('/api/user/pans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            holderName: cleanName,
            panNumber: cleanPan,
          }),
        });
        if (res.ok) {
          await refreshPans();
          setPanModalOpen(false);
        } else {
          const errData = await res.json();
          setModalPanError(errData.error || 'Failed to save PAN');
        }
      }
    } catch {
      setModalPanError('Network error saving PAN');
    } finally {
      setIsSavingPan(false);
    }
  };

  // Delete PAN from Backend API
  const handleDeletePan = async (id: string) => {
    try {
      const res = await fetch('/api/user/pans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPans((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.warn('Error deleting PAN:', err);
    }
  };

  // Sign out a specific device session from Backend API
  const handleDeviceSignOut = async (sessionId: string) => {
    try {
      const res = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        await refreshSessions();
        setAuthToast('Session revoked successfully');
      }
    } catch (err) {
      console.warn('Error revoking session:', err);
    }
  };

  // Filtered PANs for the list
  const filteredPans = pans.filter((p) => {
    if (panSearchQuery.trim()) {
      const q = panSearchQuery.toLowerCase();
      return p.holderName.toLowerCase().includes(q) || p.maskedPan.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {authToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md transition-all">
          {authToast}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. MAIN SETTINGS & PREFERENCES (AGREED DESIGN ONLY) */}
      {/* ==================================================================== */}
      {subView === 'main' && (
        <div className="space-y-4">
          {/* Header Title & Subtitle */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your account, PAN cards and app preferences
            </p>
          </div>

          {/* Section 1: Navigation Cards Group */}
          <div className="space-y-2.5">
            {/* 1. Account (No email/name/picture exposed directly on main screen) */}
            <button
              type="button"
              onClick={() => setSubView('account')}
              className="w-full bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    Account
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Manage your account
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>

            {/* 2. PAN Cards */}
            <button
              type="button"
              onClick={() => setSubView('pans')}
              className="w-full bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    PAN Cards
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    View and manage your PAN cards
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>

            {/* 3. Logged-in Devices */}
            <button
              type="button"
              onClick={() => setSubView('devices')}
              className="w-full bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    Logged-in Devices
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    See where you&apos;re logged in and sign out
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>
          </div>

          {/* Section 2: Preferences Card (Default Segment & Default IPO Tab only) */}
          <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  Preferences
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize your IPO experience
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-3.5">
              {/* Row 1: Default Segment */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Default Segment</span>
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-[#111827] p-1 rounded-xl">
                  {(['All', 'Mainboard', 'SME'] as const).map((seg) => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => handleSegmentChange(seg)}
                      className={cn(
                        'py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                        defaultSegment === seg
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      )}
                    >
                      {seg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Default IPO Tab */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Default IPO Tab</span>
                </div>

                <div className="relative">
                  <select
                    value={defaultIpoTab}
                    onChange={(e) =>
                      handleIpoTabChange(e.target.value as 'Current IPO' | 'Upcoming IPO' | 'Past IPO')
                    }
                    className="appearance-none bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl py-1.5 pl-3 pr-8 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Current IPO">Current IPO</option>
                    <option value="Upcoming IPO">Upcoming IPO</option>
                    <option value="Past IPO">Past IPO</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Legal Card */}
          <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  Legal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Policies and terms
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <a
                href="/terms"
                className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Terms of Use</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
              <a
                href="/privacy"
                className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>Privacy Policy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Section 4: App Card */}
          <div className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  App
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  App information
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 font-semibold text-slate-800 dark:text-slate-200">
                <Code className="w-4 h-4 text-slate-500" />
                <span>Version</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 font-numeric font-medium">
                v1.0.0 (Latest)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PANS MANAGEMENT SCREEN (SECURE REAL DATA ARCHITECTURE) */}
      {/* ==================================================================== */}
      {subView === 'pans' && (
        <div className="space-y-3">
          {/* Top Bar with Back Arrow and Search */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                PANs
              </h2>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => {
                  setPanSearchOpen(!panSearchOpen);
                  if (panSearchOpen) setPanSearchQuery('');
                }}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5 stroke-[1.8]" />
              </button>
            )}
          </div>

          {!user ? (
            /* Honest Unauthenticated State */
            <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-[#161f30] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Sign In to Manage PAN Cards
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  PAN cards are securely stored on your authenticated account and never exposed in plaintext.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = '/login'; }}
                className="inline-flex items-center justify-center py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Sign In / Login
              </button>
            </div>
          ) : (
            <>
              {/* Expandable Search Input */}
              {panSearchOpen && (
                <div className="relative">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={panSearchQuery}
                    onChange={(e) => setPanSearchQuery(e.target.value)}
                    placeholder="Search cardholder or masked PAN..."
                    autoFocus
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {panSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPanSearchQuery('')}
                      className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Subtabs: Saved | Unsaved */}
              <div className="flex items-center justify-around border-b border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPanTab('saved')}
                  className={cn(
                    'flex-1 py-2 text-center transition-colors relative cursor-pointer',
                    panTab === 'saved'
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  Saved ({pans.length})
                  {panTab === 'saved' && (
                    <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPanTab('unsaved')}
                  className={cn(
                    'flex-1 py-2 text-center transition-colors relative cursor-pointer',
                    panTab === 'unsaved'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
                >
                  Unsaved (0)
                  {panTab === 'unsaved' && (
                    <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </button>
              </div>

              {/* PAN Items List (Real Data from Database) */}
              <div className="space-y-2.5 pt-1">
                {pansLoading ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-500">Loading PAN records...</p>
                  </div>
                ) : filteredPans.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                    <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p>{panSearchQuery ? 'No matching PAN cards found' : 'No PAN cards saved yet'}</p>
                    <p className="text-[11px] text-slate-400">Tap the + button below to add your first PAN card.</p>
                  </div>
                ) : (
                  filteredPans.map((item) => {
                    const initial = item.holderName ? item.holderName.charAt(0).toUpperCase() : 'P';
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-[#161f30] p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3"
                      >
                        {/* Avatar with Initial + Name + Masked PAN */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                              {item.holderName}
                            </h4>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-widest block mt-0.5">
                              {item.maskedPan}
                            </span>
                          </div>
                        </div>

                        {/* Action Icons: Edit & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPanId(item.id);
                              setModalPanName(item.holderName);
                              setModalPanNumber('');
                              setModalPanError('');
                              setPanModalOpen(true);
                            }}
                            aria-label="Edit PAN"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePan(item.id)}
                            aria-label="Delete PAN"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Floating Action Button (FAB) to Add Real PAN */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPanId(null);
                    setModalPanName('');
                    setModalPanNumber('');
                    setModalPanError('');
                    setPanModalOpen(true);
                  }}
                  aria-label="Add PAN Card"
                  className="w-12 h-12 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. LOGGED-IN DEVICES SCREEN (REAL SESSIONS ONLY, ZERO FAKE DATA) */}
      {/* ==================================================================== */}
      {subView === 'devices' && (
        <div className="space-y-3.5">
          {/* Top Bar with Back Arrow */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Logged-in Devices
            </h2>
          </div>

          {!user ? (
            /* Honest Unauthenticated State */
            <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-[#161f30] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Laptop className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Sign In to View Active Sessions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Only authentic verified sessions connected to your account are displayed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = '/login'; }}
                className="inline-flex items-center justify-center py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Sign In / Login
              </button>
            </div>
          ) : (
            <>
              {/* Information Notice Card */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Laptop className="w-4 h-4 stroke-[2]" />
                </div>
                <p className="leading-relaxed">
                  These are the devices where your account is currently logged in. You can sign out from
                  any device if needed.
                </p>
              </div>

              {/* Real Sessions List from Database */}
              <div className="space-y-2.5 pt-1">
                {sessionsLoading ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-500">Checking active sessions...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    No active sessions found.
                  </div>
                ) : (
                  sessions.map((device) => {
                    const Icon =
                      device.deviceType === 'mobile'
                        ? Smartphone
                        : device.deviceType === 'laptop'
                        ? Laptop
                        : Monitor;

                    const formattedDate = device.lastActiveAt
                      ? new Date(device.lastActiveAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Active now';

                    return (
                      <div
                        key={device.id}
                        className="bg-white dark:bg-[#161f30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                              {device.deviceName}
                            </h4>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                              Last active: {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Current Badge or Sign Out Button */}
                        <div className="shrink-0">
                          {device.isCurrent ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                              Current
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeviceSignOut(device.id)}
                              className="px-3 py-1 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              Sign out
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ACCOUNT SCREEN (REAL GOOGLE OAUTH FLOW) */}
      {/* ==================================================================== */}
      {subView === 'account' && (
        <div className="space-y-4">
          {/* Top Bar with Back Arrow */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Account
            </h2>
          </div>

          {!authChecked ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Checking account status...</p>
            </div>
          ) : user ? (
            /* Logged In View */
            <div className="bg-white dark:bg-[#161f30] p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
              <div className="flex items-center gap-3.5">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-14 h-14 rounded-full border-2 border-blue-500 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                    {user.name || 'User'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md mt-1 border border-emerald-200/60 dark:border-emerald-800/40">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Google Account
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated View */
            <div className="bg-white dark:bg-[#161f30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <User className="w-7 h-7 stroke-[1.8]" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Sign in to IPO Deals
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Sign in with your Google account to securely save and access your family PAN cards across all devices.
                </p>
              </div>

              {/* Real Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.15] hover:bg-slate-50 dark:hover:bg-[#1b2438] active:scale-[0.99] text-slate-800 dark:text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="pt-2 text-[11px] text-slate-400 text-left bg-slate-50 dark:bg-[#111827] p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  OAuth Configuration Note:
                </span>
                <p>
                  Exact Authorized Redirect URI configured on server:
                  <code className="block mt-1 font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-white dark:bg-[#161f30] p-1.5 rounded border border-slate-200 dark:border-white/[0.1] break-all">
                    http://localhost:3000/api/auth/callback/google
                  </code>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. PRIVACY POLICY SCREEN */}
      {/* ==================================================================== */}
      {subView === 'privacy' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Privacy Policy
            </h2>
          </div>

          <div className="bg-white dark:bg-[#161f30] p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Data Privacy & Security
            </h3>
            <p>
              IPO Deals values your privacy. PAN card numbers entered in the app are stored strictly
              on your authenticated secure profile in PostgreSQL. They are only utilized to query official
              stock exchange registrars (such as Link Intime, KFintech, and Bigshare) for IPO allotment verification.
            </p>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">
              Google Account Information
            </h4>
            <p>
              When you log in with Google, we only request your basic profile information (name, email,
              and profile picture) to personalize your account and provide multi-device synchronization.
              We never share your personal information with any third-party advertisers.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ADD / EDIT PAN MODAL (REAL BACKEND PERSISTENCE) */}
      {/* ==================================================================== */}
      {panModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161f30] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-white/[0.1] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingPanId ? 'Edit Cardholder Name' : 'Add New PAN Card'}
              </h3>
              <button
                type="button"
                onClick={() => setPanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePanModal} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Cardholder Full Name
                </label>
                <input
                  type="text"
                  required
                  value={modalPanName}
                  onChange={(e) => setModalPanName(e.target.value)}
                  placeholder="e.g. Yash Bajaj"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  10-Digit PAN Number {editingPanId && '(Leave blank to keep existing)'}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required={!editingPanId}
                  value={modalPanNumber}
                  onChange={(e) => setModalPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>

              {modalPanError && (
                <div className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{modalPanError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanModalOpen(false)}
                  disabled={isSavingPan}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPan}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPan ? 'Saving...' : 'Save PAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
