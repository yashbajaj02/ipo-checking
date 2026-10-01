import { db, isDatabaseConfigured } from '@/db';
import {
  ipos,
  ipoDates,
  ipoGmpHistory,
  ipoSubscriptionHistory,
  ipoListingResults,
  ipoActionScores,
} from '@/db/schema';
import { desc, and, eq, gte, lte, isNotNull, ne, inArray, sql } from 'drizzle-orm';
import { IpoItem, IpoGmpPoint, IpoAction, IpoActionConfidence, IpoActionBreakdown } from '@/types/ipo';
import { compareIpoByDateAsc } from '@/lib/utils';
import { getBulkMarketQuotes } from '@/lib/services/upstox-quotes';
import { calculateIpoActionScore, saveIpoActionScore } from '@/lib/services/ipo-action-engine';
export { compareIpoByDateAsc };

export function getISTDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function getDaysPriorIST(dateStr: string, days: number = 7): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}


/**
 * ==============================================================================
 * SERVER-SIDE / NEON CACHE DATA ACCESS LAYER
 * ==============================================================================
 * Rule: User pages must read from Neon/cache, NOT directly from external APIs.
 * If Neon has ingested records, returns them. Otherwise returns empty array.
 * ==============================================================================
 */

export function formatDateToIST(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);
      }
    }
    // Try Date.parse for formats like "22 Sep 2026"
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(val);
  }
  return undefined;
}

export function calculateIpoLifecycleStatus(
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED',
  offerStartDate?: string,
  offerEndDate?: string,
  listingDate?: string
): 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED' {
  const istToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // 1. Listed: listing date has passed (or is today)
  if (listingDate && istToday >= listingDate) {
    return 'LISTED';
  }
  if (status === 'LISTED' && (!offerStartDate || istToday >= offerStartDate)) {
    return 'LISTED';
  }

  // 2. Upcoming: opening date is in the future
  if (offerStartDate && istToday < offerStartDate) {
    return 'UPCOMING';
  }

  // 3. Open: current date is between opening and closing dates (inclusive)
  if (offerStartDate && offerEndDate && istToday >= offerStartDate && istToday <= offerEndDate) {
    return 'OPEN';
  }
  if (offerStartDate && !offerEndDate && istToday === offerStartDate) {
    return 'OPEN';
  }

  // 4. Closed: closing date has passed and listing has not happened
  if (offerEndDate && istToday > offerEndDate) {
    return 'CLOSED';
  }

  // Fallback to persisted database/provider status when lifecycle dates are missing
  return status || 'UPCOMING';
}


export async function getIposFromDatabaseOrFallback(): Promise<IpoItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const [allIpos, allDates, allGmp, allSubs, allListings, allActionScores] = await Promise.all([
      db.select().from(ipos),
      db.select().from(ipoDates),
      db.select().from(ipoGmpHistory).orderBy(desc(ipoGmpHistory.sourceTimestamp)),
      db.select().from(ipoSubscriptionHistory).orderBy(desc(ipoSubscriptionHistory.snapshotTimestamp)),
      db.select().from(ipoListingResults),
      db.select().from(ipoActionScores),
    ]);

    if (!allIpos || allIpos.length === 0) {
      return [];
    }

    // Index related records by ipoId for O(1) lookup
    const datesMap = new Map<string, typeof ipoDates.$inferSelect>();
    for (const d of allDates) {
      if (!datesMap.has(d.ipoId)) datesMap.set(d.ipoId, d);
    }

    const gmpHistoryMap = new Map<string, typeof ipoGmpHistory.$inferSelect[]>();
    for (const g of allGmp) {
      if (!gmpHistoryMap.has(g.ipoId)) gmpHistoryMap.set(g.ipoId, []);
      gmpHistoryMap.get(g.ipoId)!.push(g);
    }

    const subsMap = new Map<string, typeof ipoSubscriptionHistory.$inferSelect>();
    for (const s of allSubs) {
      if (!subsMap.has(s.ipoId)) subsMap.set(s.ipoId, s);
    }

    const listingMap = new Map<string, typeof ipoListingResults.$inferSelect>();
    for (const l of allListings) {
      if (!listingMap.has(l.ipoId)) listingMap.set(l.ipoId, l);
    }

    const actionScoresMap = new Map<string, typeof ipoActionScores.$inferSelect>();
    for (const a of allActionScores) {
      if (!actionScoresMap.has(a.ipoId)) actionScoresMap.set(a.ipoId, a);
    }

    // Map Neon DB records to IpoItem interface
    const mapped: IpoItem[] = allIpos.map((item) => {
      const d = datesMap.get(item.id);
      const ipoGmpRows = gmpHistoryMap.get(item.id) || [];
      const s = subsMap.get(item.id);
      const l = listingMap.get(item.id);

      // Filter out invalid or artificial zero fallback GMP records
      const validGmpRows = ipoGmpRows.filter((row) => {
        if (row.gmpAmount == null || isNaN(Number(row.gmpAmount))) return false;
        const amt = Number(row.gmpAmount);
        const pct = Number(row.gmpPercentage || 0);
        return !(amt === 0 && pct === 0);
      });

      const activeGmpRow = validGmpRows.length > 0 ? validGmpRows[0] : null;
      const gmpHistoryPoints: IpoGmpPoint[] = validGmpRows.map((row) => ({
        date: formatDateToIST(row.sourceTimestamp) || (row.sourceTimestamp ? row.sourceTimestamp.toISOString().split('T')[0] : '—'),
        gmpAmount: Number(row.gmpAmount),
        gmpPercentage: Number(row.gmpPercentage || 0),
      }));

      const offerStartDate = formatDateToIST(d?.offerStartDate);
      const offerEndDate = formatDateToIST(d?.offerEndDate);
      const allotmentDate = formatDateToIST(d?.allotmentDate);
      const refundDate = formatDateToIST(d?.unblockingDate);
      const creditDate = formatDateToIST(d?.creditToDematDate);
      const listingDate = formatDateToIST(d?.listingDate);

      const priceBandMin = item.priceBandMin != null && !isNaN(Number(item.priceBandMin)) ? Number(item.priceBandMin) : undefined;
      const priceBandMax = item.priceBandMax != null && !isNaN(Number(item.priceBandMax)) ? Number(item.priceBandMax) : undefined;
      const lotSize = item.lotSize != null && Number(item.lotSize) > 0 ? Number(item.lotSize) : undefined;
      const minInvestment = lotSize && priceBandMax ? lotSize * priceBandMax : undefined;

      const dynamicStatus = calculateIpoLifecycleStatus(
        item.status,
        offerStartDate,
        offerEndDate,
        listingDate
      );

      // Action Score (Automatic IPO Action Engine v1.0)
      const cachedScore = actionScoresMap.get(item.id);
      let action: IpoAction;
      let actionScore: number;
      let actionConfidence: IpoActionConfidence;
      let actionBreakdown: IpoActionBreakdown;

      if (cachedScore) {
        action = (cachedScore.action as IpoAction) || 'MAY_APPLY';
        actionScore = Number(cachedScore.score) || 50;
        actionConfidence = (cachedScore.confidence as IpoActionConfidence) || 'LOW';
        const exp = (cachedScore.explanations as Record<string, string>) || {};
        actionBreakdown = {
          gmp: {
            score: cachedScore.gmpScore != null ? Number(cachedScore.gmpScore) : 0,
            maxScore: 25,
            available: cachedScore.gmpScore != null,
            reason: exp.gmp || 'GMP & Trend evaluation',
          },
          qib: {
            score: cachedScore.qibScore != null ? Number(cachedScore.qibScore) : 0,
            maxScore: 20,
            available: cachedScore.qibScore != null,
            reason: exp.qib || 'Institutional subscription demand',
          },
          nii: {
            score: cachedScore.niiScore != null ? Number(cachedScore.niiScore) : 0,
            maxScore: 10,
            available: cachedScore.niiScore != null,
            reason: exp.nii || 'Non-institutional (NII/HNI) demand',
          },
          financials: {
            score: cachedScore.financialScore != null ? Number(cachedScore.financialScore) : 0,
            maxScore: 15,
            available: cachedScore.financialScore != null,
            reason: exp.financials || 'Financial performance track record',
          },
          valuation: {
            score: cachedScore.valuationScore != null ? Number(cachedScore.valuationScore) : 0,
            maxScore: 15,
            available: cachedScore.valuationScore != null,
            reason: exp.valuation || 'Issue pricing & valuation multiples',
          },
          issueStructure: {
            score: cachedScore.issueStructureScore != null ? Number(cachedScore.issueStructureScore) : 0,
            maxScore: 5,
            available: cachedScore.issueStructureScore != null,
            reason: exp.issueStructure || 'Issue structure and proceeds allocation',
          },
          risks: {
            score: cachedScore.riskScore != null ? Number(cachedScore.riskScore) : 0,
            maxScore: 10,
            available: cachedScore.riskScore != null,
            reason: exp.risks || 'Material risk factors evaluation',
          },
        };
      } else {
        const calculated = calculateIpoActionScore({
          id: item.id,
          companyName: item.companyName,
          category: item.category === 'SME' ? 'SME' : 'MAINBOARD',
          status: dynamicStatus,
          priceBandMin,
          priceBandMax,
          lotSize,
          issueSizeCrores: item.issueSizeCrores != null && !isNaN(Number(item.issueSizeCrores)) ? Number(item.issueSizeCrores) : undefined,
          freshIssueCrores: item.freshIssueCrores != null && !isNaN(Number(item.freshIssueCrores)) ? Number(item.freshIssueCrores) : undefined,
          ofsCrores: item.ofsCrores != null && !isNaN(Number(item.ofsCrores)) ? Number(item.ofsCrores) : undefined,
          description: item.description || undefined,
          strengths: Array.isArray(item.strengths) ? (item.strengths as string[]) : undefined,
          risks: Array.isArray(item.risks) ? (item.risks as string[]) : undefined,
          gmp: activeGmpRow
            ? {
                amount: Number(activeGmpRow.gmpAmount),
                percentage: Number(activeGmpRow.gmpPercentage || 0),
                history: gmpHistoryPoints,
              }
            : undefined,
          subscription: s && s.totalSubscription != null && !isNaN(Number(s.totalSubscription))
            ? {
                qib: s.qibSubscription != null && !isNaN(Number(s.qibSubscription)) ? Number(s.qibSubscription) : undefined,
                niiTotal: s.niiSubscription != null && !isNaN(Number(s.niiSubscription)) ? Number(s.niiSubscription) : undefined,
                bNii: s.bNiiSubscription != null && !isNaN(Number(s.bNiiSubscription)) ? Number(s.bNiiSubscription) : undefined,
                sNii: s.sNiiSubscription != null && !isNaN(Number(s.sNiiSubscription)) ? Number(s.sNiiSubscription) : undefined,
                retail: s.retailSubscription != null && !isNaN(Number(s.retailSubscription)) ? Number(s.retailSubscription) : undefined,
                total: Number(s.totalSubscription),
              }
            : undefined,
        });

        action = calculated.action;
        actionScore = calculated.score;
        actionConfidence = calculated.confidence;
        actionBreakdown = calculated.breakdown;

        saveIpoActionScore(item.id, calculated).catch((e) =>
          console.warn(`[ActionEngine] Failed background score save for ${item.slug}:`, e)
        );
      }

      return {
        id: item.id,
        action,
        actionScore,
        actionConfidence,
        actionBreakdown,
        companyName: item.companyName,
        symbol: item.symbol || item.slug.substring(0, 8).toUpperCase(),
        slug: item.slug,
        category: item.category === 'SME' ? 'SME' : 'MAINBOARD',
        status: dynamicStatus,
        priceBandMin,
        priceBandMax,
        issuePrice: l?.issuePrice != null && !isNaN(Number(l.issuePrice))
          ? Number(l.issuePrice)
          : priceBandMin && priceBandMax && priceBandMin === priceBandMax
          ? priceBandMax
          : undefined,
        lotSize,
        minInvestment,
        issueSizeCrores: item.issueSizeCrores != null && !isNaN(Number(item.issueSizeCrores)) ? Number(item.issueSizeCrores) : undefined,
        freshIssueCrores: item.freshIssueCrores != null && !isNaN(Number(item.freshIssueCrores)) ? Number(item.freshIssueCrores) : undefined,
        ofsCrores: item.ofsCrores != null && !isNaN(Number(item.ofsCrores)) ? Number(item.ofsCrores) : undefined,
        faceValue: item.faceValue != null && !isNaN(Number(item.faceValue)) ? Number(item.faceValue) : undefined,
        retailQuotaPercent: item.retailQuotaPercent != null && !isNaN(Number(item.retailQuotaPercent)) ? Number(item.retailQuotaPercent) : undefined,
        qibQuotaPercent: item.qibQuotaPercent != null && !isNaN(Number(item.qibQuotaPercent)) ? Number(item.qibQuotaPercent) : undefined,
        niiQuotaPercent: item.niiQuotaPercent != null && !isNaN(Number(item.niiQuotaPercent)) ? Number(item.niiQuotaPercent) : undefined,
        drhpUrl: item.drhpUrl || undefined,
        rhpUrl: item.rhpUrl || undefined,
        listingExchange: item.listingExchange || undefined,
        registrar: item.registrar || undefined,
        registrarUrl: item.registrarUrl || undefined,
        logoUrl: item.logoUrl || undefined,
        description: item.description || undefined,
        aiDescription: item.aiDescription || undefined,
        strengths: Array.isArray(item.strengths) ? (item.strengths as string[]) : undefined,
        risks: Array.isArray(item.risks) ? (item.risks as string[]) : undefined,
        dates: {
          offerStartDate,
          offerEndDate,
          allotmentDate,
          refundDate,
          unblockingDate: refundDate,
          creditDate,
          creditToDematDate: creditDate,
          listingDate,
        },
        gmp: activeGmpRow
          ? {
              amount: Number(activeGmpRow.gmpAmount),
              percentage: Number(activeGmpRow.gmpPercentage || 0),
              estimatedListingPrice: activeGmpRow.estimatedListingPrice != null && !isNaN(Number(activeGmpRow.estimatedListingPrice))
                ? Number(activeGmpRow.estimatedListingPrice)
                : priceBandMax != null
                ? priceBandMax + Number(activeGmpRow.gmpAmount)
                : undefined,
              source: 'Market Quotes',
              sourceTimestamp: activeGmpRow.sourceTimestamp ? activeGmpRow.sourceTimestamp.toISOString() : undefined,
              history: gmpHistoryPoints,
            }
          : undefined,
          subscription: s && s.totalSubscription != null && !isNaN(Number(s.totalSubscription))
            ? {
                qib: s.qibSubscription != null && !isNaN(Number(s.qibSubscription)) ? Number(s.qibSubscription) : undefined,
                niiTotal: s.niiSubscription != null && !isNaN(Number(s.niiSubscription)) ? Number(s.niiSubscription) : undefined,
                bNii: s.bNiiSubscription != null && !isNaN(Number(s.bNiiSubscription)) ? Number(s.bNiiSubscription) : undefined,
                sNii: s.sNiiSubscription != null && !isNaN(Number(s.sNiiSubscription)) ? Number(s.sNiiSubscription) : undefined,
                retail: s.retailSubscription != null && !isNaN(Number(s.retailSubscription)) ? Number(s.retailSubscription) : undefined,
                employee: s.employeeSubscription != null && !isNaN(Number(s.employeeSubscription)) ? Number(s.employeeSubscription) : undefined,
                shareholder: s.shareholderSubscription != null && !isNaN(Number(s.shareholderSubscription)) ? Number(s.shareholderSubscription) : undefined,
                total: Number(s.totalSubscription),
                lastUpdated: s.snapshotTimestamp ? s.snapshotTimestamp.toISOString() : undefined,
              }
            : undefined,
          listing: l && l.listingPrice != null && !isNaN(Number(l.listingPrice))
            ? {
                issuePrice: l.issuePrice != null && !isNaN(Number(l.issuePrice)) ? Number(l.issuePrice) : undefined,
                listingPrice: Number(l.listingPrice),
                gainLossPercent:
                  l.issuePrice != null && Number(l.issuePrice) > 0
                    ? ((Number(l.listingPrice) - Number(l.issuePrice)) / Number(l.issuePrice)) * 100
                    : undefined,
                finalGmp: l.finalGmpBeforeListing != null && !isNaN(Number(l.finalGmpBeforeListing)) ? Number(l.finalGmpBeforeListing) : undefined,
                gmpVariance: l.gmpVsActualVariance != null && !isNaN(Number(l.gmpVsActualVariance)) ? Number(l.gmpVsActualVariance) : undefined,
              }
            : undefined,
        };
      });

    // Bulk fetch live Upstox market quotes for listed IPOs
    const listedIpos = mapped.filter((item) => item.status === 'LISTED');
    if (listedIpos.length > 0) {
      try {
        const quotesMap = await getBulkMarketQuotes(
          listedIpos.map((item) => ({ id: item.id, symbol: item.symbol, companyName: item.companyName }))
        );
        for (const item of mapped) {
          if (item.status === 'LISTED' && quotesMap.has(item.id)) {
            item.marketQuote = quotesMap.get(item.id);
          }
        }
      } catch (err) {
        console.warn('Error fetching bulk Upstox quotes for listed IPOs:', err instanceof Error ? err.message : err);
      }
    }

    return mapped.sort(compareIpoByDateAsc);

  } catch (err) {
    console.warn('Neon query failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

export interface AllotmentIpoSummary {
  id: string;
  companyName: string;
  symbol: string | null;
  slug: string;
  category: 'MAINBOARD' | 'SME' | 'UNKNOWN';
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED';
  registrar: string | null;
  registrarUrl: string | null;
  logoUrl: string | null;
  dates: {
    offerStartDate?: string;
    offerEndDate?: string;
    allotmentDate?: string;
    refundDate?: string;
    listingDate?: string;
  };
}

export interface AllotmentIposResponse {
  asOfDate: string;
  windowDays: number;
  boundaryDate: string;
  totalEligible: number;
  mainboard: AllotmentIpoSummary[];
  sme: AllotmentIpoSummary[];
  all: AllotmentIpoSummary[];
}

/**
 * Server-side / Database query for Allotment page:
 * Enforces the strict 7-day allotment window strictly in SQL:
 * - offerEndDate >= boundaryDate (today - 7 days)
 * - offerEndDate <= asOfDate (current server IST date)
 * - Excludes UPCOMING status (offer must have closed / reached verification stage)
 * - Excludes older closed IPOs from June, July, August, etc.
 */
export async function getRecentAllotmentIpos(options?: {
  asOfDate?: string;
  windowDays?: number;
}): Promise<AllotmentIposResponse> {
  const windowDays = options?.windowDays ?? 7;
  const asOfDate =
    options?.asOfDate && /^\d{4}-\d{2}-\d{2}$/.test(options.asOfDate)
      ? options.asOfDate
      : getISTDateString();
  const boundaryDate = getDaysPriorIST(asOfDate, windowDays);

  if (!isDatabaseConfigured()) {
    return {
      asOfDate,
      windowDays,
      boundaryDate,
      totalEligible: 0,
      mainboard: [],
      sme: [],
      all: [],
    };
  }

  try {
    const rows = await db
      .select({
        id: ipos.id,
        companyName: ipos.companyName,
        symbol: ipos.symbol,
        slug: ipos.slug,
        category: ipos.category,
        status: ipos.status,
        registrar: ipos.registrar,
        registrarUrl: ipos.registrarUrl,
        logoUrl: ipos.logoUrl,
        offerStartDate: ipoDates.offerStartDate,
        offerEndDate: ipoDates.offerEndDate,
        allotmentDate: ipoDates.allotmentDate,
        unblockingDate: ipoDates.unblockingDate,
        listingDate: ipoDates.listingDate,
      })
      .from(ipos)
      .innerJoin(ipoDates, eq(ipoDates.ipoId, ipos.id))
      .where(
        and(
          isNotNull(ipoDates.offerEndDate),
          gte(ipoDates.offerEndDate, boundaryDate),
          lte(ipoDates.offerEndDate, asOfDate),
          ne(ipos.status, 'UPCOMING')
        )
      )
      .orderBy(desc(ipoDates.offerEndDate), ipos.companyName);

    const allSummaries: AllotmentIpoSummary[] = rows.map((r) => ({
      id: r.id,
      companyName: r.companyName,
      symbol: r.symbol,
      slug: r.slug,
      category: r.category as 'MAINBOARD' | 'SME' | 'UNKNOWN',
      status: r.status as 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED',
      registrar: r.registrar,
      registrarUrl: r.registrarUrl,
      logoUrl: r.logoUrl,
      dates: {
        offerStartDate: formatDateToIST(r.offerStartDate),
        offerEndDate: formatDateToIST(r.offerEndDate),
        allotmentDate: formatDateToIST(r.allotmentDate),
        refundDate: formatDateToIST(r.unblockingDate),
        listingDate: formatDateToIST(r.listingDate),
      },
    }));

    const mainboard = allSummaries.filter((i) => i.category === 'MAINBOARD');
    const sme = allSummaries.filter((i) => i.category === 'SME');

    return {
      asOfDate,
      windowDays,
      boundaryDate,
      totalEligible: allSummaries.length,
      mainboard,
      sme,
      all: allSummaries,
    };
  } catch (err) {
    console.warn('getRecentAllotmentIpos query error:', err);
    return {
      asOfDate,
      windowDays,
      boundaryDate,
      totalEligible: 0,
      mainboard: [],
      sme: [],
      all: [],
    };
  }
}

/**
 * Server-side / Database query for Past IPOs:
 * Enforces the strict 7-day listing window strictly in SQL:
 * - status = 'LISTED'
 * - listing_date >= CURRENT_DATE - INTERVAL '7 days'
 * - ORDER BY listing_date DESC
 * - Apply selected segment filter (All / Mainboard / SME)
 * - Never returns older IPOs from June, July, or earlier months.
 */
export async function getRecentPastIpos(options?: {
  category?: 'MAINBOARD' | 'SME' | 'ALL';
}): Promise<IpoItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const category = options?.category || 'ALL';

  try {
    const whereConditions = [
      eq(ipos.status, 'LISTED'),
      sql`${ipoDates.listingDate} >= CURRENT_DATE - INTERVAL '7 days'`,
    ];

    if (category === 'MAINBOARD') {
      whereConditions.push(eq(ipos.category, 'MAINBOARD'));
    } else if (category === 'SME') {
      whereConditions.push(eq(ipos.category, 'SME'));
    }

    const matchedRows = await db
      .select({
        ipo: ipos,
        dates: ipoDates,
      })
      .from(ipos)
      .innerJoin(ipoDates, eq(ipoDates.ipoId, ipos.id))
      .where(and(...whereConditions))
      .orderBy(desc(ipoDates.listingDate), desc(ipos.companyName));

    if (!matchedRows || matchedRows.length === 0) {
      return [];
    }

    const matchedIds = matchedRows.map((m) => m.ipo.id);

    // Fetch related records strictly for these matched IDs to avoid unnecessary DB usage
    const [matchingGmp, matchingSubs, matchingListings] = await Promise.all([
      db
        .select()
        .from(ipoGmpHistory)
        .where(inArray(ipoGmpHistory.ipoId, matchedIds))
        .orderBy(desc(ipoGmpHistory.sourceTimestamp)),
      db
        .select()
        .from(ipoSubscriptionHistory)
        .where(inArray(ipoSubscriptionHistory.ipoId, matchedIds))
        .orderBy(desc(ipoSubscriptionHistory.snapshotTimestamp)),
      db
        .select()
        .from(ipoListingResults)
        .where(inArray(ipoListingResults.ipoId, matchedIds)),
    ]);

    // Map by ipoId
    const gmpHistoryMap = new Map<string, typeof ipoGmpHistory.$inferSelect[]>();
    for (const g of matchingGmp) {
      if (!gmpHistoryMap.has(g.ipoId)) gmpHistoryMap.set(g.ipoId, []);
      gmpHistoryMap.get(g.ipoId)!.push(g);
    }

    const subsMap = new Map<string, typeof ipoSubscriptionHistory.$inferSelect>();
    for (const s of matchingSubs) {
      if (!subsMap.has(s.ipoId)) subsMap.set(s.ipoId, s);
    }

    const listingMap = new Map<string, typeof ipoListingResults.$inferSelect>();
    for (const l of matchingListings) {
      if (!listingMap.has(l.ipoId)) listingMap.set(l.ipoId, l);
    }

    // Build IpoItem list
    const items: IpoItem[] = matchedRows.map(({ ipo: item, dates: d }) => {
      const ipoGmpRows = gmpHistoryMap.get(item.id) || [];
      const s = subsMap.get(item.id);
      const l = listingMap.get(item.id);

      const validGmpRows = ipoGmpRows.filter((row) => {
        if (row.gmpAmount == null || isNaN(Number(row.gmpAmount))) return false;
        const amt = Number(row.gmpAmount);
        const pct = Number(row.gmpPercentage || 0);
        return !(amt === 0 && pct === 0);
      });

      const activeGmpRow = validGmpRows.length > 0 ? validGmpRows[0] : (ipoGmpRows.length > 0 ? ipoGmpRows[0] : null);
      const gmpHistoryPoints: IpoGmpPoint[] = validGmpRows.map((row) => ({
        date: formatDateToIST(row.sourceTimestamp) || (row.sourceTimestamp ? row.sourceTimestamp.toISOString().split('T')[0] : '—'),
        gmpAmount: Number(row.gmpAmount),
        gmpPercentage: Number(row.gmpPercentage || 0),
      }));

      const offerStartDate = formatDateToIST(d?.offerStartDate);
      const offerEndDate = formatDateToIST(d?.offerEndDate);
      const allotmentDate = formatDateToIST(d?.allotmentDate);
      const refundDate = formatDateToIST(d?.unblockingDate);
      const creditDate = formatDateToIST(d?.creditToDematDate);
      const listingDate = formatDateToIST(d?.listingDate);

      const priceBandMin = item.priceBandMin != null && !isNaN(Number(item.priceBandMin)) ? Number(item.priceBandMin) : undefined;
      const priceBandMax = item.priceBandMax != null && !isNaN(Number(item.priceBandMax)) ? Number(item.priceBandMax) : undefined;
      const lotSize = item.lotSize != null && Number(item.lotSize) > 0 ? Number(item.lotSize) : undefined;
      const minInvestment = lotSize && priceBandMax ? lotSize * priceBandMax : undefined;

      return {
        id: item.id,
        action: 'MAY_APPLY' as IpoAction,
        companyName: item.companyName,
        symbol: item.symbol || item.slug.substring(0, 8).toUpperCase(),
        slug: item.slug,
        category: item.category === 'SME' ? 'SME' : 'MAINBOARD',
        status: 'LISTED',
        priceBandMin,
        priceBandMax,
        issuePrice: l?.issuePrice != null && !isNaN(Number(l.issuePrice))
          ? Number(l.issuePrice)
          : priceBandMax != null
          ? priceBandMax
          : undefined,
        lotSize,
        minInvestment,
        issueSizeCrores: item.issueSizeCrores != null && !isNaN(Number(item.issueSizeCrores)) ? Number(item.issueSizeCrores) : undefined,
        freshIssueCrores: item.freshIssueCrores != null && !isNaN(Number(item.freshIssueCrores)) ? Number(item.freshIssueCrores) : undefined,
        ofsCrores: item.ofsCrores != null && !isNaN(Number(item.ofsCrores)) ? Number(item.ofsCrores) : undefined,
        faceValue: item.faceValue != null && !isNaN(Number(item.faceValue)) ? Number(item.faceValue) : undefined,
        retailQuotaPercent: item.retailQuotaPercent != null && !isNaN(Number(item.retailQuotaPercent)) ? Number(item.retailQuotaPercent) : undefined,
        qibQuotaPercent: item.qibQuotaPercent != null && !isNaN(Number(item.qibQuotaPercent)) ? Number(item.qibQuotaPercent) : undefined,
        niiQuotaPercent: item.niiQuotaPercent != null && !isNaN(Number(item.niiQuotaPercent)) ? Number(item.niiQuotaPercent) : undefined,
        drhpUrl: item.drhpUrl || undefined,
        rhpUrl: item.rhpUrl || undefined,
        listingExchange: item.listingExchange || undefined,
        registrar: item.registrar || undefined,
        registrarUrl: item.registrarUrl || undefined,
        logoUrl: item.logoUrl || undefined,
        description: item.description || undefined,
        strengths: Array.isArray(item.strengths) ? (item.strengths as string[]) : undefined,
        risks: Array.isArray(item.risks) ? (item.risks as string[]) : undefined,
        dates: {
          offerStartDate,
          offerEndDate,
          allotmentDate,
          refundDate,
          unblockingDate: refundDate,
          creditDate,
          creditToDematDate: creditDate,
          listingDate,
        },
        gmp: activeGmpRow
          ? {
              amount: Number(activeGmpRow.gmpAmount),
              percentage: Number(activeGmpRow.gmpPercentage || 0),
              estimatedListingPrice: activeGmpRow.estimatedListingPrice != null && !isNaN(Number(activeGmpRow.estimatedListingPrice))
                ? Number(activeGmpRow.estimatedListingPrice)
                : priceBandMax != null
                ? priceBandMax + Number(activeGmpRow.gmpAmount)
                : undefined,
              source: 'Market Quotes',
              sourceTimestamp: activeGmpRow.sourceTimestamp ? activeGmpRow.sourceTimestamp.toISOString() : undefined,
              history: gmpHistoryPoints,
            }
          : undefined,
        subscription: s && s.totalSubscription != null && !isNaN(Number(s.totalSubscription))
          ? {
              qib: s.qibSubscription != null && !isNaN(Number(s.qibSubscription)) ? Number(s.qibSubscription) : undefined,
              niiTotal: s.niiSubscription != null && !isNaN(Number(s.niiSubscription)) ? Number(s.niiSubscription) : undefined,
              bNii: s.bNiiSubscription != null && !isNaN(Number(s.bNiiSubscription)) ? Number(s.bNiiSubscription) : undefined,
              sNii: s.sNiiSubscription != null && !isNaN(Number(s.sNiiSubscription)) ? Number(s.sNiiSubscription) : undefined,
              retail: s.retailSubscription != null && !isNaN(Number(s.retailSubscription)) ? Number(s.retailSubscription) : undefined,
              employee: s.employeeSubscription != null && !isNaN(Number(s.employeeSubscription)) ? Number(s.employeeSubscription) : undefined,
              shareholder: s.shareholderSubscription != null && !isNaN(Number(s.shareholderSubscription)) ? Number(s.shareholderSubscription) : undefined,
              total: Number(s.totalSubscription),
              lastUpdated: s.snapshotTimestamp ? s.snapshotTimestamp.toISOString() : undefined,
            }
          : undefined,
        listing: l && l.listingPrice != null && !isNaN(Number(l.listingPrice))
          ? {
              issuePrice: l.issuePrice != null && !isNaN(Number(l.issuePrice)) ? Number(l.issuePrice) : undefined,
              listingPrice: Number(l.listingPrice),
              gainLossPercent:
                l.issuePrice != null && Number(l.issuePrice) > 0
                  ? ((Number(l.listingPrice) - Number(l.issuePrice)) / Number(l.issuePrice)) * 100
                  : undefined,
              finalGmp: l.finalGmpBeforeListing != null && !isNaN(Number(l.finalGmpBeforeListing)) ? Number(l.finalGmpBeforeListing) : undefined,
              gmpVariance: l.gmpVsActualVariance != null && !isNaN(Number(l.gmpVsActualVariance)) ? Number(l.gmpVsActualVariance) : undefined,
            }
          : undefined,
      };
    });

    // Bulk fetch live Upstox market quotes for listed IPOs
    try {
      const quotesMap = await getBulkMarketQuotes(
        items.map((item) => ({ id: item.id, symbol: item.symbol, companyName: item.companyName }))
      );
      for (const item of items) {
        if (quotesMap.has(item.id)) {
          item.marketQuote = quotesMap.get(item.id);
        }
      }
    } catch (err) {
      console.warn('Error fetching quotes for past IPOs:', err);
    }

    return items;
  } catch (err) {
    console.error('getRecentPastIpos error:', err);
    return [];
  }
}


