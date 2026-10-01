import { NextRequest, NextResponse } from 'next/server';
import { fallbackService } from '@/lib/ingestion/fallback-service';
import { usageTracker } from '@/lib/ingestion/usage-tracker';
import { cleanupExpiredIpoData } from '@/lib/data/retention';

/**
 * ==============================================================================
 * CENTRALIZED INGESTION TRIGGER API ROUTE
 * ==============================================================================
 * Route: POST /api/ingest/trigger
 *
 * Rules:
 * 1. Protected by server-side CRON_SECRET authentication header.
 * 2. Never exposes or logs secret values.
 * 3. Uses strictly ONE external provider per successful execution (IPO Alerts -> fallback to IPO Guru).
 * 4. Persists normalized records into Neon DB so client reads remain 100% cached.
 * ==============================================================================
 */

// Verify incoming authentication
function authenticateRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In production, CRON_SECRET is strictly required
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }

  const authHeader = req.headers.get('Authorization');
  const customHeader = req.headers.get('x-cron-secret');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) return true;
  }

  if (customHeader && customHeader.trim() === cronSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/ingest/trigger
 * Returns current provider status report without triggering external API calls.
 */
export async function GET() {
  await usageTracker.syncWithDatabase();
  const report = fallbackService.getProviderStatusReport();

  return NextResponse.json(
    {
      status: 'ok',
      activeProvider: report.activeProvider,
      providers: report.providers,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

/**
 * POST /api/ingest/trigger
 * Triggers a backend ingestion cycle with single-provider execution and automatic fallback.
 */
export async function POST(req: NextRequest) {
  if (!authenticateRequest(req)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or missing authentication secret. Provide Authorization: Bearer <CRON_SECRET> or x-cron-secret.',
      },
      { status: 401 }
    );
  }

  let bodyOptions: { mode?: 'full' | 'static' | 'dynamic' | 'cleanup'; resetQuotaBeforeRun?: boolean; source?: string } = {};
  try {
    const json = await req.json();
    bodyOptions = json || {};
  } catch {
    // Body is optional
  }

  if (!bodyOptions.mode) {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();

    // Twice daily (02:00 & 14:00 UTC), run full static+dynamic sync
    if ((utcHour === 2 || utcHour === 14) && utcMin < 30) {
      bodyOptions.mode = 'full';
    } else {
      bodyOptions.mode = 'dynamic';
    }
  }

  if (bodyOptions.resetQuotaBeforeRun) {
    fallbackService.resetLockout();
  } else {
    await usageTracker.syncWithDatabase();
  }

  try {
    const result = await fallbackService.executeIngestionCycle(bodyOptions);

    // Periodically enforce 7-day database retention on listed IPOs in background
    cleanupExpiredIpoData().catch((err) => {
      console.warn('[Ingestion] Retention cleanup error:', err);
    });

    return NextResponse.json(
      {
        status: result.success ? 'success' : 'failed',
        mode: bodyOptions.mode,
        result,
        currentReport: fallbackService.getProviderStatusReport(),
      },
      { status: result.success ? 200 : 502 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
