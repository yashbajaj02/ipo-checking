'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();
  // Match server snapshot initially to avoid hydration mismatch
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  return (
    <button
      type="button"
      className={`market-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      data-dark={isDark ? 'true' : 'false'}
      style={{ '--dark': isDark ? 1 : 0 } as React.CSSProperties}
    >
      <div className="market-toggle__content">
        {/* Backdrop (Soft White-Blue / Deep Navy) */}
        <div className="market-toggle__backdrop" aria-hidden="true">
          <div className="market-toggle__backdrop-light" />
          <div className="market-toggle__backdrop-dark" />
        </div>

        {/* LIGHT MODE: Blue Rising Market Line Graph (Positioned on the Right) */}
        <div className="market-toggle__line-graph" aria-hidden="true">
          <svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="marketLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area under curve */}
            <path
              d="M 2,16 L 8,12 L 14,13.5 L 22,6 L 29,3.5 L 29,19 L 2,19 Z"
              fill="url(#marketLineGrad)"
            />
            {/* Trend line */}
            <path
              d="M 2,16 L 8,12 L 14,13.5 L 22,6 L 29,3.5"
              stroke="#2563eb"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Uptrend peak pulse dot */}
            <circle cx="29" cy="3.5" r="1.8" fill="#2563eb" />
          </svg>
        </div>

        {/* DARK MODE: Candlestick Chart (Positioned on the Left) */}
        <div className="market-toggle__candlesticks" aria-hidden="true">
          <svg viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Candlestick 1: Bullish Green */}
            <line x1="5.5" y1="3" x2="5.5" y2="17" stroke="#10b981" strokeWidth="1" strokeLinecap="round" />
            <rect x="4" y="6" width="3" height="7" rx="0.6" fill="#10b981" />

            {/* Candlestick 2: Bearish Red */}
            <line x1="14" y1="2" x2="14" y2="18" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
            <rect x="12.5" y="4" width="3" height="9" rx="0.6" fill="#ef4444" />

            {/* Candlestick 3: Bullish Green */}
            <line x1="22.5" y1="4" x2="22.5" y2="16" stroke="#10b981" strokeWidth="1" strokeLinecap="round" />
            <rect x="21" y="7" width="3" height="6" rx="0.6" fill="#10b981" />
          </svg>
        </div>

        {/* Moving Indicator Orb (Sun / Crescent Moon) */}
        <div className="market-toggle__indicator" aria-hidden="true">
          {/* Light: Small Sun with rotating corona */}
          <div className="market-toggle__sun">
            <div className="market-toggle__sun-rays" />
          </div>

          {/* Dark: Crescent Moon */}
          <div className="market-toggle__moon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

export default ThemeToggle;
