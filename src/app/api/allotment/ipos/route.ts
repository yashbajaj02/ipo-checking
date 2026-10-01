import { NextRequest, NextResponse } from 'next/server';
import { getRecentAllotmentIpos } from '@/lib/data/ipos';

/**
 * ==============================================================================
 * RECENT ALLOTMENT IPOS ENDPOINT (STRICT 7-DAY SERVER-SIDE WINDOW)
 * ==============================================================================
 * GET /api/allotment/ipos
 *
 * Rules:
 * 1. Filtered strictly in SQL database query by offerEndDate.
 * 2. Window: [today - 7 days, today] (inclusive).
 * 3. Never returns June, July, or older months.
 * 4. Excludes future/upcoming IPOs that haven't reached offer close.
 * 5. Returns grouping for MAINBOARD and SME.
 * 6. Supports optional `?asOfDate=YYYY-MM-DD` query parameter for controlled tests.
 * ==============================================================================
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const asOfDate = searchParams.get('asOfDate') || undefined;

    const allotmentResult = await getRecentAllotmentIpos({ asOfDate, windowDays: 7 });

    return NextResponse.json(
      {
        success: true,
        asOfDate: allotmentResult.asOfDate,
        windowDays: allotmentResult.windowDays,
        boundaryDate: allotmentResult.boundaryDate,
        count: allotmentResult.totalEligible,
        data: {
          mainboard: allotmentResult.mainboard,
          sme: allotmentResult.sme,
          all: allotmentResult.all,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('Allotment IPOs API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
