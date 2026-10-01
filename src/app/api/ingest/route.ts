import { NextRequest, NextResponse } from 'next/server';
import { fallbackService } from '@/lib/ingestion/fallback-service';
import { usageTracker } from '@/lib/ingestion/usage-tracker';

/**
 * ==============================================================================
 * BACKEND INGESTION TRIGGER API ROUTE
 * ==============================================================================
 * Route: /api/ingest
 *
 * Rules:
 * 1. Protected by server-side CRON_SECRET authentication header.
 * 2. Never exposes or logs secret values.
 * 3. Uses strictly ONE external provider per execution.
 * 4. Starts with IPO Alerts; falls back to IPO Guru on failure/quota exhaustion.
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
 * GET /api/ingest
 * Returns current provider status and rate-limit lockout report without triggering external calls.
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
 * POST /api/ingest
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

  await usageTracker.syncWithDatabase();

  let bodyOptions: { forceFallback?: boolean; resetQuotaBeforeRun?: boolean } = {};
  try {
    const json = await req.json();
    bodyOptions = json || {};
  } catch {
    // Body is optional
  }

  try {
    const result = await fallbackService.executeIngestionCycle(bodyOptions);

    return NextResponse.json(
      {
        status: result.success ? 'success' : 'failed',
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
