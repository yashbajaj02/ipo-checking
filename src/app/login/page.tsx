'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, TrendingUp, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const errorParam = searchParams.get('error') || searchParams.get('auth_error');
  let urlError: string | null = null;
  if (errorParam) {
    switch (errorParam) {
      case 'access_denied':
        urlError = 'Sign-in was cancelled or access was denied by Google.';
        break;
      case 'invalid_oauth_state':
      case 'missing_oauth_state':
        urlError = 'Security verification failed (OAuth CSRF state mismatch). Please try again.';
        break;
      case 'token_exchange_failed':
        urlError = 'Failed to exchange authorization code with Google. Please try again.';
        break;
      case 'no_email':
        urlError = 'No valid email address was associated with your Google account.';
        break;
      default:
        urlError = `Sign-in error: ${errorParam}`;
        break;
    }
  }

  const activeError = errorMessage || urlError;

  // Check if user is already logged in, redirect to settings if so
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const json = await res.json();
          if (json.user) {
            router.push('/?tab=settings');
          }
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      }
    }
    checkExistingSession();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error('OAuth URL not returned from server');
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unable to initiate Google Sign-In');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header Navigation */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pt-2 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to IPOs</span>
        </Link>
        <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-blue-600 dark:text-blue-400">
          <TrendingUp className="w-4 h-4" />
          <span>IPO DEALS</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white dark:bg-[#161f30] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/[0.08] shadow-xl space-y-6">
          
          {/* Logo / Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white pt-2">
              Sign in to IPO Deals
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Securely manage your encrypted PAN details, track allotment status across applicants, and manage your device sessions.
            </p>
          </div>

          {/* Error Banner */}
          {activeError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{activeError}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                </>
              )}
            </button>
          </div>

          {/* Security Assurance Disclaimer */}
          <div className="pt-2 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bank-Grade AES-256 PAN Encryption</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
              By signing in, you agree to secure account session management under Google OAuth 2.0 protocol standards.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center pb-2 space-y-1">
        <div className="flex items-center justify-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Link href="/terms" className="hover:underline hover:text-blue-600 dark:hover:text-blue-400">
            Terms of Use
          </Link>
          <span>&bull;</span>
          <Link href="/privacy" className="hover:underline hover:text-blue-600 dark:hover:text-blue-400">
            Privacy Policy
          </Link>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          IPO Deals &copy; {new Date().getFullYear()} &bull; Real-Time Indian IPO Intelligence
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
