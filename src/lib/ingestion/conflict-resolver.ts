import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  ExternalIpoProviderAdapter,
} from './types';

export interface ProviderObservation<T> {
  provider: ExternalIpoProviderAdapter;
  fetchedAt: Date;
  data: T;
}

export interface ResolvedField<T> {
  value: T;
  sourceProviderId: string;
  confidenceScore: number;
  hasConflict: boolean;
  conflictingSources: string[];
}

/**
 * Field-level Conflict Resolver & Normalizer
 * Enforces provider priority, timestamp recency, and non-blind value resolution.
 */
export class IpoConflictResolver {
  /**
   * Resolve conflicting IPO details from multiple provider observations.
   */
  public resolveIpoPayloads(
    observations: ProviderObservation<NormalizedIpoPayload>[]
  ): NormalizedIpoPayload {
    if (observations.length === 0) {
      throw new Error('Cannot resolve IPO payload: No provider observations provided.');
    }

    // Sort observations by provider priority rank (1 = highest priority), then recency
    const sorted = [...observations].sort((a, b) => {
      if (a.provider.priorityRank !== b.provider.priorityRank) {
        return a.provider.priorityRank - b.provider.priorityRank;
      }
      return b.fetchedAt.getTime() - a.fetchedAt.getTime();
    });

    const primary = sorted[0].data;

    // Build resolved IPO payload starting from primary provider
    const resolved: NormalizedIpoPayload = {
      ...primary,
      category: 'MAINBOARD', // Strictly enforce Mainboard category
    };

    // Fall back to lower-priority providers for any missing fields (null / undefined)
    for (const obs of sorted.slice(1)) {
      const d = obs.data;
      if (resolved.priceBandMin == null && d.priceBandMin != null) resolved.priceBandMin = d.priceBandMin;
      if (resolved.priceBandMax == null && d.priceBandMax != null) resolved.priceBandMax = d.priceBandMax;
      if (resolved.lotSize == null && d.lotSize != null) resolved.lotSize = d.lotSize;
      if (resolved.issueSizeCrores == null && d.issueSizeCrores != null) resolved.issueSizeCrores = d.issueSizeCrores;
      if (resolved.freshIssueCrores == null && d.freshIssueCrores != null) resolved.freshIssueCrores = d.freshIssueCrores;
      if (resolved.ofsCrores == null && d.ofsCrores != null) resolved.ofsCrores = d.ofsCrores;
      if (resolved.retailQuotaPercent == null && d.retailQuotaPercent != null) resolved.retailQuotaPercent = d.retailQuotaPercent;
      if (resolved.qibQuotaPercent == null && d.qibQuotaPercent != null) resolved.qibQuotaPercent = d.qibQuotaPercent;
      if (resolved.niiQuotaPercent == null && d.niiQuotaPercent != null) resolved.niiQuotaPercent = d.niiQuotaPercent;
      if (!resolved.drhpUrl && d.drhpUrl) resolved.drhpUrl = d.drhpUrl;
      if (!resolved.rhpUrl && d.rhpUrl) resolved.rhpUrl = d.rhpUrl;

      // Dates fallback
      if (!resolved.dates.offerStartDate && d.dates.offerStartDate) resolved.dates.offerStartDate = d.dates.offerStartDate;
      if (!resolved.dates.offerEndDate && d.dates.offerEndDate) resolved.dates.offerEndDate = d.dates.offerEndDate;
      if (!resolved.dates.allotmentDate && d.dates.allotmentDate) resolved.dates.allotmentDate = d.dates.allotmentDate;
      if (!resolved.dates.listingDate && d.dates.listingDate) resolved.dates.listingDate = d.dates.listingDate;
    }

    return resolved;
  }

  /**
   * Resolve Grey Market Premium (GMP) data with non-official provenance tracking.
   */
  public resolveGmpPayloads(
    observations: ProviderObservation<NormalizedGmpPayload>[]
  ): ResolvedField<NormalizedGmpPayload> {
    if (observations.length === 0) {
      throw new Error('No GMP observations available.');
    }

    const sorted = [...observations].sort((a, b) => {
      // Prioritize timestamp recency for non-official market info (GMP)
      const timeDiff = b.data.sourceTimestamp.getTime() - a.data.sourceTimestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.provider.priorityRank - b.provider.priorityRank;
    });

    const newest = sorted[0];
    const gmpValues = sorted.map((o) => o.data.gmpAmount);
    const uniqueValues = new Set(gmpValues);
    const hasConflict = uniqueValues.size > 1;

    // Calculate confidence score (higher if multiple providers concur)
    let confidenceScore = 1.0;
    if (hasConflict) {
      const agreementRatio = gmpValues.filter((v) => v === newest.data.gmpAmount).length / sorted.length;
      confidenceScore = Number((0.6 + agreementRatio * 0.4).toFixed(2));
    }

    return {
      value: newest.data,
      sourceProviderId: newest.provider.providerId,
      confidenceScore,
      hasConflict,
      conflictingSources: Array.from(new Set(sorted.map((s) => s.provider.providerId))),
    };
  }
}
