'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, TrendingUp, AlertCircle, ArrowLeft, Loader2, FileText, CheckSquare, Square } from 'lucide-react';

function ConsentContent() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecked, setIsChecked] = useState(false); // MUST NEVER be pre-checked!
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check auth and consent status on mount
  useEffect(() => {
    async function checkConsentStatus() {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/login');
          return;
        }

        const json = await res.json();
        if (!json.user) {
          // Not logged in -> go to login
          router.push('/login');
          return;
        }

        if (json.hasConsented) {
          // Already accepted current versions -> proceed to app
          router.push('/?tab=settings');
          return;
        }

        setUser(json.user);
      } catch (err) {
        console.error('Consent session check failed:', err);
        setErrorMessage('Failed to load user session. Please sign in again.');
      } finally {
        setIsLoading(false);
      }
    }

    checkConsentStatus();
  }, [router]);

  const handleAccept = async () => {
    if (!isChecked || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // Success -> navigate into protected app
      router.push('/?tab=settings');
    } catch (err) {
      console.error('Error accepting consent:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unable to record consent');
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: false }),
      });
    } catch (err) {
      console.warn('Decline call error:', err);
    } finally {
      // Return user to /login
      window.location.href = '/login';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Verifying legal consent status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Navigation */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pt-2 pb-4">
        <button
          type="button"
          onClick={handleDecline}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Decline & Back</span>
        </button>
        <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-blue-600 dark:text-blue-400">
          <TrendingUp className="w-4 h-4" />
          <span>IPO DEALS</span>
        </div>
      </header>

      {/* Main Consent Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white dark:bg-[#161f30] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/[0.08] shadow-xl space-y-5">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white pt-2">
              Before you continue
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              {user?.name ? `Welcome, ${user.name}. ` : ''}Please review and accept our updated legal agreements to access your authenticated account features.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Document Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-500" />
                Terms of Use (v1.0)
              </span>
              <Link
                href="/terms"
                target="_blank"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read Terms &rarr;
              </Link>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-white/[0.06] pt-3">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                Privacy Policy (v1.0)
              </span>
              <Link
                href="/privacy"
                target="_blank"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read Policy &rarr;
              </Link>
            </div>
          </div>

          {/* Explicit Consent Checkbox (NEVER PRE-CHECKED) */}
          <div
            onClick={() => setIsChecked(!isChecked)}
            className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer bg-slate-50/50 dark:bg-white/[0.02]"
          >
            <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
              {isChecked ? (
                <CheckSquare className="w-5 h-5 fill-blue-600/20 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <label className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                Terms of Use
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </Link>.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={!isChecked || isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Preference...</span>
                </>
              ) : (
                <span>Accept & Continue</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all cursor-pointer"
            >
              Decline
            </button>
          </div>

          {/* Security Disclaimer */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-tight">
            Your consent timestamp and accepted version numbers will be stored securely on your server profile.
          </p>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center pb-2">
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          IPO Deals &copy; {new Date().getFullYear()} &bull; Real-Time Indian IPO Intelligence
        </p>
      </footer>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
