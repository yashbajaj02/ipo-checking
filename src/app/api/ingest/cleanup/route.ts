import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredIpoData } from '@/lib/data/retention';

function authenticateRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
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
 * GET /api/ingest/cleanup
 * Dry-run inspection of expired historical IPO records.
 */
export async function GET(req: NextRequest) {
  if (!authenticateRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const retentionDays = searchParams.get('days') ? Number(searchParams.get('days')) : 7;
  const asOfDate = searchParams.get('asOfDate') || undefined;

  const result = await cleanupExpiredIpoData({
    retentionDays,
    asOfDate,
    dryRun: true,
  });

  return NextResponse.json(result, { status: 200 });
}

/**
 * POST /api/ingest/cleanup
 * Executes cleanup of historical IPO records older than retention threshold.
 * Strictly preserves: users, profiles, sessions, pans, data_sources, logs.
 */
export async function POST(req: NextRequest) {
  if (!authenticateRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { retentionDays?: number; asOfDate?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  try {
    const result = await cleanupExpiredIpoData({
      retentionDays: body.retentionDays ?? 7,
      asOfDate: body.asOfDate,
      dryRun: false,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
