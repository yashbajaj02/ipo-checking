import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/db';

/**
 * Health & Readiness Check Endpoint (/api/health)
 *
 * Verifies application and database readiness without exposing internal secrets or architecture details.
 * Cache Policy: strictly no-store.
 */
export async function GET() {
  const dbConfigured = isDatabaseConfigured();

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConfigured ? 'connected' : 'unconfigured',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
