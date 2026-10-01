import { db, isDatabaseConfigured } from '@/db';
import {
  ipos,
  ipoDates,
  dataSources,
  ipoGmpHistory,
  ipoSubscriptionHistory,
  ipoListingResults,
  ingestionLogs,
} from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from './types';
import {
  validateIpoPayload,
  validateGmpPayload,
  validateSubscriptionPayload,
} from './validator';
import { generateGeminiAbout } from '@/lib/services/gemini-enrichment';
import {
  mergeIpoRecord,
  mergeIpoDates,
  mergeSubscriptionSnapshot,
  mergeGmpSnapshot,
  mergeListingResults,
} from './merger';

export interface StorageIngestionPayload {
  providerId: string;
  providerName: string;
  ipos: NormalizedIpoPayload[];
  gmpData: NormalizedGmpPayload[];
  subscriptionData: NormalizedSubscriptionPayload[];
  fetchedAt: Date;
}

export interface StorageSaveResult {
  savedToDatabase: boolean;
  iposProcessed: number;
  gmpProcessed: number;
  subscriptionsProcessed: number;
  dataSourceId?: string;
  error?: string;
}

/**
 * Persist fetched normalized data from an external provider into Neon PostgreSQL.
 * Validates data integrity, enforces state machine guards, and protects existing valid DB values.
 */
export async function saveIngestionDataToNeon(
  payload: StorageIngestionPayload
): Promise<StorageSaveResult> {
  const { providerId, providerName, ipos: ipoList, gmpData, subscriptionData, fetchedAt } = payload;

  if (!isDatabaseConfigured()) {
    return {
      savedToDatabase: false,
      iposProcessed: ipoList.length,
      gmpProcessed: gmpData.length,
      subscriptionsProcessed: subscriptionData.length,
      error: 'Neon DATABASE_URL is not configured. Ingestion data processed in memory only.',
    };
  }

  try {
    // 1. Resolve or create data_sources entry
    const [existingDs] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.providerName, providerId))
      .limit(1);

    let dataSourceRow = existingDs;

    if (!dataSourceRow) {
      const [inserted] = await db
        .insert(dataSources)
        .values({
          providerName: providerId,
          isActive: true,
          priorityRank: 1,
        })
        .returning();
      dataSourceRow = inserted;
    }

    const dataSourceId = dataSourceRow.id;
    const validationIssues: Array<{ slug: string; warnings: string[]; errors: string[] }> = [];
    let savedIposCount = 0;

    // 2. Validate and upsert each IPO and its dates
    for (const rawItem of ipoList) {
      // Find existing DB record to prevent regressions and preserve existing valid fields
      const [existingIpo] = await db
        .select()
        .from(ipos)
        .where(eq(ipos.slug, rawItem.slug))
        .limit(1);

      let existingDates: typeof ipoDates.$inferSelect | undefined = undefined;
      if (existingIpo) {
        const [foundDates] = await db
          .select()
          .from(ipoDates)
          .where(eq(ipoDates.ipoId, existingIpo.id))
          .limit(1);
        existingDates = foundDates;
      }

      // Run validation with existing DB context
      const validation = validateIpoPayload(
        rawItem,
        existingIpo
          ? {
              status: existingIpo.status,
              listingDate: existingDates?.listingDate ? String(existingDates.listingDate) : undefined,
            }
          : undefined
      );

      if (!validation.isValid || !validation.data) {
        validationIssues.push({
          slug: rawItem.slug || 'unknown',
          warnings: validation.warnings,
          errors: validation.errors,
        });
        continue;
      }

      if (validation.warnings.length > 0) {
        validationIssues.push({
          slug: validation.data.slug,
          warnings: validation.warnings,
          errors: [],
        });
      }

      const item = validation.data;

      // 1. Field-level non-destructive merge of IPO core fields
      const mergedIpo = mergeIpoRecord(existingIpo, item);

      // Upsert into ipos table matching on unique slug
      const [upsertedIpo] = await db
        .insert(ipos)
        .values({
          companyName: mergedIpo.companyName,
          symbol: mergedIpo.symbol,
          slug: mergedIpo.slug,
          category: mergedIpo.category,
          status: mergedIpo.status,
          priceBandMin: mergedIpo.priceBandMin,
          priceBandMax: mergedIpo.priceBandMax,
          lotSize: mergedIpo.lotSize,
          issueSizeCrores: mergedIpo.issueSizeCrores,
          freshIssueCrores: mergedIpo.freshIssueCrores,
          ofsCrores: mergedIpo.ofsCrores,
          faceValue: mergedIpo.faceValue,
          retailQuotaPercent: mergedIpo.retailQuotaPercent,
          qibQuotaPercent: mergedIpo.qibQuotaPercent,
          niiQuotaPercent: mergedIpo.niiQuotaPercent,
          drhpUrl: mergedIpo.drhpUrl,
          rhpUrl: mergedIpo.rhpUrl,
          listingExchange: mergedIpo.listingExchange,
          registrar: mergedIpo.registrar,
          registrarUrl: mergedIpo.registrarUrl,
          logoUrl: mergedIpo.logoUrl,
          description: mergedIpo.description,
          strengths: mergedIpo.strengths,
          risks: mergedIpo.risks,
          updatedAt: fetchedAt,
        })
        .onConflictDoUpdate({
          target: ipos.slug,
          set: {
            companyName: mergedIpo.companyName,
            symbol: mergedIpo.symbol,
            category: mergedIpo.category,
            status: mergedIpo.status,
            priceBandMin: mergedIpo.priceBandMin,
            priceBandMax: mergedIpo.priceBandMax,
            lotSize: mergedIpo.lotSize,
            issueSizeCrores: mergedIpo.issueSizeCrores,
            freshIssueCrores: mergedIpo.freshIssueCrores,
            ofsCrores: mergedIpo.ofsCrores,
            faceValue: mergedIpo.faceValue,
            retailQuotaPercent: mergedIpo.retailQuotaPercent,
            qibQuotaPercent: mergedIpo.qibQuotaPercent,
            niiQuotaPercent: mergedIpo.niiQuotaPercent,
            drhpUrl: mergedIpo.drhpUrl,
            rhpUrl: mergedIpo.rhpUrl,
            listingExchange: mergedIpo.listingExchange,
            registrar: mergedIpo.registrar,
            registrarUrl: mergedIpo.registrarUrl,
            logoUrl: mergedIpo.logoUrl,
            description: mergedIpo.description,
            strengths: mergedIpo.strengths,
            risks: mergedIpo.risks,
            updatedAt: fetchedAt,
          },
        })
        .returning({ id: ipos.id });

      if (upsertedIpo) {
        // Backend enrichment layer: check cache, trigger Gemini if missing/changed
        await generateGeminiAbout(upsertedIpo.id, {
          companyName: mergedIpo.companyName,
          category: mergedIpo.category,
          description: mergedIpo.description,
          strengths: mergedIpo.strengths,
          risks: mergedIpo.risks,
          slug: mergedIpo.slug,
          rhpUrl: mergedIpo.rhpUrl,
          drhpUrl: mergedIpo.drhpUrl,
        }).catch((err) => {
          console.warn(`[Gemini Enrichment] Skipped for ${mergedIpo.companyName}:`, err);
        });
      }

      savedIposCount++;

      // 2. Field-level non-destructive merge of IPO dates
      const mergedDates = mergeIpoDates(existingDates, item.dates);

      if (
        upsertedIpo &&
        (mergedDates.offerStartDate ||
          mergedDates.offerEndDate ||
          mergedDates.allotmentDate ||
          mergedDates.unblockingDate ||
          mergedDates.creditToDematDate ||
          mergedDates.listingDate)
      ) {
        if (existingDates) {
          await db
            .update(ipoDates)
            .set({
              offerStartDate: mergedDates.offerStartDate,
              offerEndDate: mergedDates.offerEndDate,
              allotmentDate: mergedDates.allotmentDate,
              unblockingDate: mergedDates.unblockingDate,
              creditToDematDate: mergedDates.creditToDematDate,
              listingDate: mergedDates.listingDate,
              updatedAt: fetchedAt,
            })
            .where(eq(ipoDates.id, existingDates.id));
        } else {
          await db.insert(ipoDates).values({
            ipoId: upsertedIpo.id,
            offerStartDate: mergedDates.offerStartDate,
            offerEndDate: mergedDates.offerEndDate,
            allotmentDate: mergedDates.allotmentDate,
            unblockingDate: mergedDates.unblockingDate,
            creditToDematDate: mergedDates.creditToDematDate,
            listingDate: mergedDates.listingDate,
            updatedAt: fetchedAt,
          });
        }
      }

      // 3. Field-level non-destructive merge of Listing Results
      if (upsertedIpo && item.listingPrice != null && !isNaN(item.listingPrice) && item.listingPrice > 0) {
        const [existingListing] = await db
          .select()
          .from(ipoListingResults)
          .where(eq(ipoListingResults.ipoId, upsertedIpo.id))
          .limit(1);

        const mergedListing = mergeListingResults(existingListing, {
          issuePrice: item.issuePrice ?? (item.priceBandMax != null ? Number(item.priceBandMax) : item.listingPrice),
          listingPrice: item.listingPrice,
          listedDate: mergedDates.listingDate || undefined,
        });

        if (existingListing) {
          await db
            .update(ipoListingResults)
            .set({
              issuePrice: mergedListing.issuePrice,
              listingPrice: mergedListing.listingPrice,
              listedDate: mergedListing.listedDate,
            })
            .where(eq(ipoListingResults.id, existingListing.id));
        } else {
          await db.insert(ipoListingResults).values({
            ipoId: upsertedIpo.id,
            issuePrice: mergedListing.issuePrice,
            listingPrice: mergedListing.listingPrice,
            listedDate: mergedListing.listedDate,
          });
        }
      }

      // 4. Field-level non-destructive merge for GMP snapshots
      const matchingGmp = gmpData.filter((g) => g.companySlug === item.slug);
      for (const gmp of matchingGmp) {
        const gmpValidation = validateGmpPayload(gmp);
        if (gmpValidation.isValid && gmpValidation.data) {
          const [latestExistingGmp] = await db
            .select()
            .from(ipoGmpHistory)
            .where(eq(ipoGmpHistory.ipoId, upsertedIpo.id))
            .orderBy(desc(ipoGmpHistory.sourceTimestamp))
            .limit(1);

          // Prevent duplicate snapshots for the same IPO when sourceTimestamp is identical to an already stored snapshot
          const incomingTime = new Date(gmpValidation.data.sourceTimestamp).getTime();
          if (
            latestExistingGmp?.sourceTimestamp &&
            new Date(latestExistingGmp.sourceTimestamp).getTime() === incomingTime
          ) {
            continue;
          }

          const [existingSameTimestamp] = await db
            .select({ id: ipoGmpHistory.id })
            .from(ipoGmpHistory)
            .where(
              and(
                eq(ipoGmpHistory.ipoId, upsertedIpo.id),
                eq(ipoGmpHistory.sourceTimestamp, gmpValidation.data.sourceTimestamp)
              )
            )
            .limit(1);

          if (existingSameTimestamp) {
            continue;
          }

          const mergedGmp = mergeGmpSnapshot(latestExistingGmp, gmpValidation.data);

          await db.insert(ipoGmpHistory).values({
            ipoId: upsertedIpo.id,
            dataSourceId,
            gmpAmount: mergedGmp.gmpAmount,
            gmpPercentage: mergedGmp.gmpPercentage,
            estimatedListingPrice: mergedGmp.estimatedListingPrice,
            sourceTimestamp: gmpValidation.data.sourceTimestamp,
            fetchedTimestamp: fetchedAt,
            verificationStatus: 'PROVISIONAL',
          });
        }
      }

      // 5. Field-level non-destructive merge for Subscription snapshots
      const matchingSubs = subscriptionData.filter((s) => s.companySlug === item.slug);
      for (const sub of matchingSubs) {
        const subValidation = validateSubscriptionPayload(sub);
        if (subValidation.isValid && subValidation.data) {
          const [latestExistingSub] = await db
            .select()
            .from(ipoSubscriptionHistory)
            .where(eq(ipoSubscriptionHistory.ipoId, upsertedIpo.id))
            .orderBy(desc(ipoSubscriptionHistory.snapshotTimestamp))
            .limit(1);

          const mergedSub = mergeSubscriptionSnapshot(latestExistingSub, subValidation.data);

          await db.insert(ipoSubscriptionHistory).values({
            ipoId: upsertedIpo.id,
            dataSourceId,
            snapshotTimestamp: subValidation.data.snapshotTimestamp,
            qibSubscription: mergedSub.qibSubscription,
            niiSubscription: mergedSub.niiSubscription,
            bNiiSubscription: mergedSub.bNiiSubscription,
            sNiiSubscription: mergedSub.sNiiSubscription,
            retailSubscription: mergedSub.retailSubscription,
            employeeSubscription: mergedSub.employeeSubscription,
            shareholderSubscription: mergedSub.shareholderSubscription,
            totalSubscription: mergedSub.totalSubscription,
            fetchedTimestamp: fetchedAt,
          });
        }
      }
    }

    // Process standalone / dynamic-only GMP data for existing DB IPOs
    const processedSlugs = new Set(ipoList.map((item) => item.slug));

    for (const gmp of gmpData) {
      if (processedSlugs.has(gmp.companySlug)) continue;
      const [existingIpo] = await db
        .select()
        .from(ipos)
        .where(eq(ipos.slug, gmp.companySlug))
        .limit(1);

      if (existingIpo) {
        const gmpValidation = validateGmpPayload(gmp);
        if (gmpValidation.isValid && gmpValidation.data) {
          const [latestExistingGmp] = await db
            .select()
            .from(ipoGmpHistory)
            .where(eq(ipoGmpHistory.ipoId, existingIpo.id))
            .orderBy(desc(ipoGmpHistory.sourceTimestamp))
            .limit(1);

          // Prevent duplicate snapshots for the same IPO when sourceTimestamp is identical to an already stored snapshot
          const incomingTime = new Date(gmpValidation.data.sourceTimestamp).getTime();
          if (
            latestExistingGmp?.sourceTimestamp &&
            new Date(latestExistingGmp.sourceTimestamp).getTime() === incomingTime
          ) {
            continue;
          }

          const [existingSameTimestamp] = await db
            .select({ id: ipoGmpHistory.id })
            .from(ipoGmpHistory)
            .where(
              and(
                eq(ipoGmpHistory.ipoId, existingIpo.id),
                eq(ipoGmpHistory.sourceTimestamp, gmpValidation.data.sourceTimestamp)
              )
            )
            .limit(1);

          if (existingSameTimestamp) {
            continue;
          }

          const mergedGmp = mergeGmpSnapshot(latestExistingGmp, gmpValidation.data);

          await db.insert(ipoGmpHistory).values({
            ipoId: existingIpo.id,
            dataSourceId,
            gmpAmount: mergedGmp.gmpAmount,
            gmpPercentage: mergedGmp.gmpPercentage,
            estimatedListingPrice: mergedGmp.estimatedListingPrice,
            sourceTimestamp: gmpValidation.data.sourceTimestamp,
            fetchedTimestamp: fetchedAt,
            verificationStatus: 'PROVISIONAL',
          });

          savedIposCount++;
        }
      }
    }

    for (const sub of subscriptionData) {
      if (processedSlugs.has(sub.companySlug)) continue;
      const [existingIpo] = await db
        .select()
        .from(ipos)
        .where(eq(ipos.slug, sub.companySlug))
        .limit(1);

      if (existingIpo) {
        const subValidation = validateSubscriptionPayload(sub);
        if (subValidation.isValid && subValidation.data) {
          const [latestExistingSub] = await db
            .select()
            .from(ipoSubscriptionHistory)
            .where(eq(ipoSubscriptionHistory.ipoId, existingIpo.id))
            .orderBy(desc(ipoSubscriptionHistory.snapshotTimestamp))
            .limit(1);

          const mergedSub = mergeSubscriptionSnapshot(latestExistingSub, subValidation.data);

          await db.insert(ipoSubscriptionHistory).values({
            ipoId: existingIpo.id,
            dataSourceId,
            snapshotTimestamp: subValidation.data.snapshotTimestamp,
            qibSubscription: mergedSub.qibSubscription,
            niiSubscription: mergedSub.niiSubscription,
            bNiiSubscription: mergedSub.bNiiSubscription,
            sNiiSubscription: mergedSub.sNiiSubscription,
            retailSubscription: mergedSub.retailSubscription,
            employeeSubscription: mergedSub.employeeSubscription,
            shareholderSubscription: mergedSub.shareholderSubscription,
            totalSubscription: mergedSub.totalSubscription,
            fetchedTimestamp: fetchedAt,
          });

          savedIposCount++;
        }
      }
    }

    // 5. Record audit ingestion log including validation summary
    await db.insert(ingestionLogs).values({
      dataSourceId,
      status: validationIssues.some((v) => v.errors.length > 0) ? 'PARTIAL_SUCCESS' : 'SUCCESS',
      recordsProcessed: savedIposCount,
      details: {
        providerId,
        providerName,
        fetchedAt: fetchedAt.toISOString(),
        totalPayloadCount: ipoList.length,
        savedIposCount,
        gmpRecordsCount: gmpData.length,
        subscriptionRecordsCount: subscriptionData.length,
        validationIssuesCount: validationIssues.length,
        validationIssues: validationIssues.slice(0, 50),
      },
      createdAt: fetchedAt,
    });

    return {
      savedToDatabase: true,
      iposProcessed: savedIposCount,
      gmpProcessed: gmpData.length,
      subscriptionsProcessed: subscriptionData.length,
      dataSourceId,
    };
  } catch (err) {
    return {
      savedToDatabase: false,
      iposProcessed: 0,
      gmpProcessed: 0,
      subscriptionsProcessed: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Record a provider failure or rate limit directly into Neon ingestion_logs.
 * Never stores or exposes secrets or API keys.
 */
export async function recordIngestionFailureLog(params: {
  providerId: string;
  providerName?: string;
  error: string;
  statusCode?: number;
  rateLimited?: boolean;
  attemptedAt?: Date;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const fetchedAt = params.attemptedAt || new Date();

    const [existingDs] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.providerName, params.providerId))
      .limit(1);

    let dataSourceRow = existingDs;

    if (!dataSourceRow) {
      const [inserted] = await db
        .insert(dataSources)
        .values({
          providerName: params.providerId,
          isActive: true,
          priorityRank: 1,
        })
        .returning();
      dataSourceRow = inserted;
    }

    await db.insert(ingestionLogs).values({
      dataSourceId: dataSourceRow.id,
      status: params.rateLimited ? 'RATE_LIMITED' : 'FAILED',
      recordsProcessed: 0,
      details: {
        providerId: params.providerId,
        providerName: params.providerName || params.providerId,
        requestTimestamp: fetchedAt.toISOString(),
        status: params.rateLimited ? 'RATE_LIMITED' : 'FAILED',
        rateLimited: Boolean(params.rateLimited),
        responseStatus: params.statusCode || null,
        error: params.error,
        ingestionResult: 'Failed - snapshot preserved',
      },
      createdAt: fetchedAt,
    });
  } catch (err) {
    console.warn('Failed to record ingestion failure log in Neon:', err);
  }
}
