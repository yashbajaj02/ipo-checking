import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/db';

/**
 * Health Check API Route (/api/health)
 *
 * Verifies runtime status, service configuration, and environment readiness.
 * Cache Policy: strictly no-store (dynamic verification).
 */
export async function GET() {
  const dbConfigured = isDatabaseConfigured();

  const healthPayload = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'Mainboard IPO Tracker',
    database: {
      configured: dbConfigured,
      provider: 'Neon PostgreSQL (Serverless HTTP)',
    },
    architecture: {
      scope: 'MAINBOARD ONLY (SME Excluded)',
      privacy: 'Zero Database PAN Retention',
      refreshModel: 'Decoupled Scheduled Ingestion & SWR Edge Caching',
    },
  };

  return NextResponse.json(healthPayload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
