import { NextRequest, NextResponse } from 'next/server';
import { fallbackService } from '@/lib/ingestion/fallback-service';
import { usageTracker } from '@/lib/ingestion/usage-tracker';

/**
 * ==============================================================================
 * PROTECTED API USAGE & QUOTA TRACKING ENDPOINT
 * ==============================================================================
 * Route: GET /api/ingest/usage
 *
 * Rules:
 * 1. Protected by server-side authentication (Bearer token / x-cron-secret / ?secret=).
 * 2. Zero API keys or sensitive secrets exposed.
 * 3. Returns per-provider daily limit, requests used today, remaining requests,
 *    last request timestamp, lockout status, and currently active candidate provider.
 * ==============================================================================
 */

function authenticateRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow access if CRON_SECRET is not configured
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }

  const authHeader = req.headers.get('Authorization');
  const customHeader = req.headers.get('x-cron-secret') || req.headers.get('x-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) return true;
  }

  if (customHeader && customHeader.trim() === cronSecret) {
    return true;
  }

  if (querySecret && querySecret.trim() === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!authenticateRequest(req)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required. Provide Authorization: Bearer <CRON_SECRET> header or ?secret=<CRON_SECRET>.',
      },
      { status: 401 }
    );
  }

  await usageTracker.syncWithDatabase();
  const report = fallbackService.getProviderStatusReport();

  return NextResponse.json(
    {
      success: true,
      date: report.date,
      activeProvider: report.activeProvider,
      providers: report.providers,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
