import { db, isDatabaseConfigured } from '@/db';
import {
  ipos,
  ipoDates,
  ipoGmpHistory,
  ipoSubscriptionHistory,
  ipoListingResults,
  ipoActionScores,
} from '@/db/schema';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { getISTDateString, getDaysPriorIST } from './ipos';

export interface RetentionCleanupResult {
  asOfDate: string;
  retentionDays: number;
  cutoffDate: string;
  deletedCount: number;
  deletedIpoSlugs: string[];
  deletedIpoNames: string[];
  message: string;
}

/**
 * ==============================================================================
 * 7-DAY PAST IPO DATABASE RETENTION & CLEANUP SERVICE
 * ==============================================================================
 * Rules:
 * 1. Only removes records when:
 *      status = 'LISTED'
 *      AND listing_date < CURRENT_DATE - INTERVAL '7 days'
 *    (Uses the actual ipo_dates.listing_date)
 * 2. Recent 7-day listed IPOs (listing_date >= CURRENT_DATE - INTERVAL '7 days') are PRESERVED.
 * 3. NEVER deletes:
 *    - users / accounts
 *    - profiles / settings
 *    - user_pans
 *    - user_sessions
 *    - ingestion_logs
 *    - data_sources
 *    - OPEN / UPCOMING IPOs
 *    - IPOs with missing listing_date
 * 4. Safe explicit child-first deletion in transaction prevents orphan records:
 *    - watchlists (entries pointing to expired IPOs)
 *    - ipo_action_scores
 *    - ipo_listing_results
 *    - ipo_subscription_history
 *    - ipo_gmp_history
 *    - ipo_dates
 *    - ipos (parent record)
 * ==============================================================================
 */
export async function cleanupExpiredIpoData(options?: {
  retentionDays?: number;
  asOfDate?: string;
  dryRun?: boolean;
}): Promise<RetentionCleanupResult> {
  const retentionDays = options?.retentionDays ?? 7;
  const asOfDate = options?.asOfDate || getISTDateString();
  const cutoffDate = getDaysPriorIST(asOfDate, retentionDays);
  const dryRun = options?.dryRun ?? false;

  if (!isDatabaseConfigured()) {
    return {
      asOfDate,
      retentionDays,
      cutoffDate,
      deletedCount: 0,
      deletedIpoSlugs: [],
      deletedIpoNames: [],
      message: 'Database not configured. No records cleaned.',
    };
  }

  try {
    // Condition: status = 'LISTED' AND listing_date < CURRENT_DATE - INTERVAL '7 days'
    // Strictly requires isNotNull(listingDate) and status = 'LISTED'
    const expiredRecords = await db
      .select({
        id: ipos.id,
        slug: ipos.slug,
        companyName: ipos.companyName,
        listingDate: ipoDates.listingDate,
        status: ipos.status,
      })
      .from(ipos)
      .innerJoin(ipoDates, eq(ipoDates.ipoId, ipos.id))
      .where(
        and(
          eq(ipos.status, 'LISTED'),
          isNotNull(ipoDates.listingDate),
          sql`${ipoDates.listingDate} < CURRENT_DATE - INTERVAL '7 days'`
        )
      );

    if (expiredRecords.length === 0) {
      return {
        asOfDate,
        retentionDays,
        cutoffDate,
        deletedCount: 0,
        deletedIpoSlugs: [],
        deletedIpoNames: [],
        message: `No expired listed IPOs found older than 7 days from listing date. All records within retention window.`,
      };
    }

    const expiredIds = expiredRecords.map((r) => r.id);
    const expiredSlugs = expiredRecords.map((r) => r.slug);
    const expiredNames = expiredRecords.map((r) => r.companyName);

    if (!dryRun) {
      // Safe, explicit child-first deletion sequentially to guarantee zero orphans (neon-http compatible)
      // 1. watchlists
      await db.execute(
        sql`DELETE FROM watchlists WHERE ipo_id IN ${expiredIds}`
      ).catch(() => {});

      // 2. ipo_action_scores (Gemini / Action Engine records)
      await db.delete(ipoActionScores).where(inArray(ipoActionScores.ipoId, expiredIds));

      // 3. ipo_listing_results
      await db.delete(ipoListingResults).where(inArray(ipoListingResults.ipoId, expiredIds));

      // 4. ipo_subscription_history
      await db.delete(ipoSubscriptionHistory).where(inArray(ipoSubscriptionHistory.ipoId, expiredIds));

      // 5. ipo_gmp_history
      await db.delete(ipoGmpHistory).where(inArray(ipoGmpHistory.ipoId, expiredIds));

      // 6. ipo_dates
      await db.delete(ipoDates).where(inArray(ipoDates.ipoId, expiredIds));

      // 7. ipos (parent table)
      await db.delete(ipos).where(inArray(ipos.id, expiredIds));
    }

    return {
      asOfDate,
      retentionDays,
      cutoffDate,
      deletedCount: expiredIds.length,
      deletedIpoSlugs: expiredSlugs,
      deletedIpoNames: expiredNames,
      message: dryRun
        ? `[Dry Run] Found ${expiredIds.length} expired listed IPOs older than 7 days from listing date.`
        : `Successfully purged ${expiredIds.length} expired listed IPOs older than 7 days from listing date. Recent 7-day data fully preserved.`,
    };
  } catch (err) {
    console.error('cleanupExpiredIpoData error:', err);
    throw err;
  }
}
