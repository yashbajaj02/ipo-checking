import { NextRequest, NextResponse } from 'next/server';
import { getIposFromDatabaseOrFallback, getRecentPastIpos } from '@/lib/data/ipos';

/**
 * ==============================================================================
 * PUBLIC IPOS READ ENDPOINT
 * ==============================================================================
 * GET /api/ipos
 *
 * Rules:
 * 1. Reads ONLY from Neon PostgreSQL database cache.
 * 2. When status === 'LISTED' or tab === 'past', queries strictly within the 7-day
 *    listing window: listing_date >= CURRENT_DATE - INTERVAL '7 days'.
 * 3. Edge cached for high performance and low DB load.
 * ==============================================================================
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const tab = searchParams.get('tab');
    const categoryParam = searchParams.get('category');
    const category =
      categoryParam === 'MAINBOARD' || categoryParam === 'SME'
        ? (categoryParam as 'MAINBOARD' | 'SME')
        : 'ALL';

    if (status === 'LISTED' || tab === 'past') {
      const pastIpos = await getRecentPastIpos({ category });

      return NextResponse.json(
        {
          success: true,
          data: pastIpos,
          count: pastIpos.length,
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    const ipos = await getIposFromDatabaseOrFallback();

    return NextResponse.json(
      {
        success: true,
        data: ipos,
        count: ipos.length,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
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

