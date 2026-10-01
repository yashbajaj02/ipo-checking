import { BaseIpoProviderAdapter } from './base';
import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
  ProviderQuotaExceededError,
  ProviderUnavailableError,
} from '../types';
import { usageTracker } from '../usage-tracker';

/**
 * ==============================================================================
 * IPO GURU PROVIDER ADAPTER (Active Data Provider)
 * ==============================================================================
 * Verified Endpoint:
 * - https://www.ipoguru.in/api/v2/ipos
 * - Authentication: X-API-KEY header
 * ==============================================================================
 */
export class IpoGuruProviderAdapter extends BaseIpoProviderAdapter {
  readonly providerId = 'ipo_guru';
  readonly providerName = 'IPO Guru';
  readonly priorityRank = 1;

  private cachedRawData: { timestamp: number; data: Record<string, unknown>[] } | null = null;
  private pendingFetch: Promise<Record<string, unknown>[]> | null = null;

  private getApiKey(): string | undefined {
    return process.env.IPO_GURU_KEY || process.env.IPO_GURU_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  private async fetchRawList(): Promise<Record<string, unknown>[]> {
    // Reuse payload if fetched within the last 30 seconds (single cycle deduplication)
    if (this.cachedRawData && Date.now() - this.cachedRawData.timestamp < 30000) {
      return this.cachedRawData.data;
    }

    // Share in-flight request if another caller is already fetching right now
    if (this.pendingFetch) {
      return this.pendingFetch;
    }

    const fetchPromise = this.doFetchRawList();
    this.pendingFetch = fetchPromise;
    try {
      const data = await fetchPromise;
      return data;
    } finally {
      this.pendingFetch = null;
    }
  }

  private async doFetchRawList(): Promise<Record<string, unknown>[]> {
    // Reuse payload if fetched within the last 30 seconds (single cycle deduplication)
    if (this.cachedRawData && Date.now() - this.cachedRawData.timestamp < 30000) {
      return this.cachedRawData.data;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderUnavailableError(
        this.providerId,
        'IPO Guru API key is not configured in .env.local (IPO_GURU_KEY).'
      );
    }

    const apiUrl = process.env.IPO_GURU_API_URL || 'https://www.ipoguru.in/api/v2/ipos';

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      // Record real external API request
      await usageTracker.recordRequest(this.providerId);

      // Handle Rate Limit / Quota Exceeded (429 / 402)
      if (response.status === 429 || response.status === 402) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        const resetAt = new Date(Date.now() + retryAfterSeconds * 1000);

        await usageTracker.lockProvider(
          this.providerId,
          resetAt,
          `IPO Guru rate limit/quota reached (HTTP ${response.status}).`
        );

        throw new ProviderQuotaExceededError(
          this.providerId,
          resetAt,
          `IPO Guru rate limit/quota reached (HTTP ${response.status}). Switching to fallback.`,
          response.status
        );
      }

      // Check X-RateLimit-Remaining header
      const rateLimitRemaining =
        response.headers.get('x-ratelimit-remaining') || response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        const resetAt = new Date(Date.now() + retryAfterSeconds * 1000);
        await usageTracker.lockProvider(
          this.providerId,
          resetAt,
          'IPO Guru header indicates X-RateLimit-Remaining is 0.'
        );
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`IPO Guru API responded with HTTP status ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const json = await response.json();

      const rawList: Record<string, unknown>[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.ipos)
        ? json.ipos
        : Array.isArray(json.results)
        ? json.results
        : [];

      this.cachedRawData = {
        timestamp: Date.now(),
        data: rawList,
      };

      return rawList;
    } catch (err) {
      if (err instanceof ProviderQuotaExceededError) {
        throw err;
      }
      throw new Error(`IPO Guru fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fetchIpos(): Promise<NormalizedIpoPayload[]> {
    try {
      const rawList = await this.fetchRawList();

      const normalized: NormalizedIpoPayload[] = rawList.map((item: Record<string, unknown>) => {
        const companyName = String(
          item.name || item.display_name || item.company_name || item.company || item.ipo_name || ''
        );
        const symbol = item.symbol ? String(item.symbol) : undefined;
        const slug = String(
          item.slug || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        );
        const typeStr = String(item.type || item.category || '').toUpperCase();
        const isSme =
          typeStr === 'SME' ||
          item.is_sme === true ||
          item.market_type === 'SME' ||
          companyName.toLowerCase().includes('sme');

        let priceBandMin: number | undefined = undefined;
        let priceBandMax: number | undefined = undefined;

        if (item.price_min != null && !isNaN(Number(item.price_min))) {
          priceBandMin = Number(item.price_min);
        }
        if (item.price_max != null && !isNaN(Number(item.price_max))) {
          priceBandMax = Number(item.price_max);
        } else if (item.issue_price != null && !isNaN(Number(item.issue_price))) {
          priceBandMax = Number(item.issue_price);
        }

        if ((priceBandMin === undefined || priceBandMax === undefined) && typeof item.price_band === 'string') {
          const parts = item.price_band.split('-').map((s) => parseFloat(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (priceBandMin === undefined) priceBandMin = parts[0];
            if (priceBandMax === undefined) priceBandMax = parts[1];
          } else if (parts.length === 1 && !isNaN(parts[0])) {
            if (priceBandMin === undefined) priceBandMin = parts[0];
            if (priceBandMax === undefined) priceBandMax = parts[0];
          }
        }

        const rawStatus = String(item.status || '').toUpperCase();
        const status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED' =
          rawStatus === 'UPCOMING' ? 'UPCOMING' :
          rawStatus === 'OPEN' ? 'OPEN' :
          rawStatus === 'CLOSED' ? 'CLOSED' :
          rawStatus === 'LISTED' || item.is_listed === true ? 'LISTED' : 'UPCOMING';

        const lotSize = item.lot_size != null && Number(item.lot_size) > 0
          ? Number(item.lot_size)
          : item.lot != null && Number(item.lot) > 0
          ? Number(item.lot)
          : undefined;

        const issueSizeCrores = item.issue_size != null && !isNaN(Number(item.issue_size))
          ? Number(item.issue_size)
          : undefined;

        const issuePrice = item.issue_price != null && !isNaN(Number(item.issue_price))
          ? Number(item.issue_price)
          : undefined;

        const listingPrice = item.listing_price != null && !isNaN(Number(item.listing_price))
          ? Number(item.listing_price)
          : undefined;

        const faceValue = item.face_value != null && !isNaN(Number(item.face_value))
          ? Number(item.face_value)
          : undefined;

        const minInvestment = item.min_investment != null && !isNaN(Number(item.min_investment))
          ? Number(item.min_investment)
          : lotSize && priceBandMax
          ? lotSize * priceBandMax
          : undefined;

        const freshIssueCrores =
          item.fresh_issue != null && !isNaN(Number(item.fresh_issue))
            ? Number(item.fresh_issue)
            : item.fresh_issue_cr != null && !isNaN(Number(item.fresh_issue_cr))
            ? Number(item.fresh_issue_cr)
            : undefined;

        const ofsCrores =
          item.ofs != null && !isNaN(Number(item.ofs))
            ? Number(item.ofs)
            : item.ofs_cr != null && !isNaN(Number(item.ofs_cr))
            ? Number(item.ofs_cr)
            : undefined;

        const retailQuotaPercent =
          item.retail_quota != null && !isNaN(Number(item.retail_quota))
            ? Number(item.retail_quota)
            : item.retail_quota_percent != null && !isNaN(Number(item.retail_quota_percent))
            ? Number(item.retail_quota_percent)
            : undefined;

        const qibQuotaPercent =
          item.qib_quota != null && !isNaN(Number(item.qib_quota))
            ? Number(item.qib_quota)
            : item.qib_quota_percent != null && !isNaN(Number(item.qib_quota_percent))
            ? Number(item.qib_quota_percent)
            : undefined;

        const niiQuotaPercent =
          item.nii_quota != null && !isNaN(Number(item.nii_quota))
            ? Number(item.nii_quota)
            : item.nii_quota_percent != null && !isNaN(Number(item.nii_quota_percent))
            ? Number(item.nii_quota_percent)
            : item.hni_quota != null && !isNaN(Number(item.hni_quota))
            ? Number(item.hni_quota)
            : undefined;

        const drhpUrl = item.drhp ? String(item.drhp) : item.drhp_url ? String(item.drhp_url) : undefined;
        const rhpUrl = item.rhp ? String(item.rhp) : item.rhp_url ? String(item.rhp_url) : undefined;
        const listingExchange = item.exchange
          ? String(item.exchange)
          : item.listing_exchange
          ? String(item.listing_exchange)
          : undefined;
        const registrar = item.registrar
          ? String(item.registrar)
          : item.registrar_name
          ? String(item.registrar_name)
          : undefined;

        const datesObj = item.dates && typeof item.dates === 'object' ? (item.dates as Record<string, unknown>) : null;

        const offerStartDate = String(
          item.open_date ||
            item.start_date ||
            item.bidding_start_date ||
            item.bidding_start ||
            item.offer_start_date ||
            datesObj?.open_date ||
            datesObj?.start_date ||
            ''
        ) || undefined;

        const offerEndDate = String(
          item.close_date ||
            item.end_date ||
            item.bidding_end_date ||
            item.bidding_end ||
            item.offer_end_date ||
            datesObj?.close_date ||
            datesObj?.end_date ||
            ''
        ) || undefined;

        const allotmentDate = String(
          item.allotment_date ||
            item.allotment ||
            item.allotment_finalization_date ||
            datesObj?.allotment_date ||
            datesObj?.allotment ||
            ''
        ) || undefined;

        const unblockingDate = String(
          item.unblocking_date ||
            item.unblock_date ||
            item.refund_date ||
            datesObj?.unblocking_date ||
            datesObj?.refund_date ||
            ''
        ) || undefined;

        const creditToDematDate = String(
          item.credit_to_demat_date ||
            item.credit_date ||
            item.demat_date ||
            datesObj?.credit_to_demat_date ||
            datesObj?.demat_date ||
            ''
        ) || undefined;

        const listingDate = String(
          item.listing_date ||
            item.listing ||
            item.tentative_listing_date ||
            datesObj?.listing_date ||
            datesObj?.listing ||
            ''
        ) || undefined;

        const logoUrl = item.logo ? String(item.logo) : item.logo_url ? String(item.logo_url) : undefined;
        const description = item.about
          ? String(item.about)
          : item.description
          ? String(item.description)
          : item.overview
          ? String(item.overview)
          : undefined;
        const strengths = Array.isArray(item.strengths) ? (item.strengths as string[]) : undefined;
        const risks = Array.isArray(item.risks) ? (item.risks as string[]) : undefined;

        return {
          companyName,
          symbol,
          slug,
          category: isSme ? 'SME' : 'MAINBOARD',
          status,
          priceBandMin,
          priceBandMax,
          issuePrice,
          lotSize,
          minInvestment,
          issueSizeCrores,
          freshIssueCrores,
          ofsCrores,
          faceValue,
          retailQuotaPercent,
          qibQuotaPercent,
          niiQuotaPercent,
          drhpUrl,
          rhpUrl,
          listingExchange,
          registrar,
          logoUrl,
          description,
          strengths,
          risks,
          listingPrice,
          dates: {
            offerStartDate,
            offerEndDate,
            allotmentDate,
            unblockingDate,
            creditToDematDate,
            listingDate,
          },
        };
      });

      return this.filterValidCategories(normalized);
    } catch (err) {
      if (err instanceof ProviderQuotaExceededError) {
        throw err;
      }
      throw new Error(`IPO Guru fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fetchGmpData(companySlug?: string): Promise<NormalizedGmpPayload[]> {
    try {
      const rawList = await this.fetchRawList();

      const results: NormalizedGmpPayload[] = [];

      for (const item of rawList) {
        if (companySlug && item.slug !== companySlug) continue;
        if (item.gmp == null) continue;

        const companyName = String(item.name || item.display_name || item.company_name || '');
        const slug = String(item.slug || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

        const gmpObj = (item.gmp && typeof item.gmp === 'object') ? (item.gmp as Record<string, unknown>) : null;

        let gmpAmount: number | undefined = undefined;
        if (gmpObj && gmpObj.price != null && !isNaN(Number(gmpObj.price))) {
          gmpAmount = Number(gmpObj.price);
        } else if (item.gmp != null && !isNaN(Number(item.gmp))) {
          gmpAmount = Number(item.gmp);
        } else if (item.gmp_amount != null && !isNaN(Number(item.gmp_amount))) {
          gmpAmount = Number(item.gmp_amount);
        }

        if (gmpAmount === undefined) continue;

        let maxPrice = Number(item.price_max || item.issue_price || item.price || 0);
        if (!maxPrice && typeof item.price_band === 'string') {
          const parts = item.price_band.split('-');
          maxPrice = parseFloat(parts[parts.length - 1].trim()) || 0;
        }

        let gmpPercentage: number | undefined = undefined;
        if (gmpObj && gmpObj.percentage != null && !isNaN(Number(gmpObj.percentage))) {
          gmpPercentage = Number(gmpObj.percentage);
        } else if (item.gmp_percent != null && !isNaN(Number(item.gmp_percent))) {
          gmpPercentage = Number(item.gmp_percent);
        } else if (maxPrice > 0) {
          gmpPercentage = (gmpAmount / maxPrice) * 100;
        }

        let estimatedListingPrice: number | undefined = undefined;
        if (gmpObj && gmpObj.estimated_listing_price != null && !isNaN(Number(gmpObj.estimated_listing_price))) {
          estimatedListingPrice = Number(gmpObj.estimated_listing_price);
        } else if (item.estimated_listing_price != null && !isNaN(Number(item.estimated_listing_price))) {
          estimatedListingPrice = Number(item.estimated_listing_price);
        } else if (maxPrice > 0) {
          estimatedListingPrice = maxPrice + gmpAmount;
        }

        const timestampStr = gmpObj?.updated_at || item.updated_at;
        const sourceTimestamp = timestampStr ? new Date(String(timestampStr)) : new Date();

        results.push({
          companySlug: slug,
          gmpAmount,
          gmpPercentage: gmpPercentage ?? 0,
          estimatedListingPrice,
          sourceTimestamp,
          providerId: this.providerId,
        });
      }

      return results;
    } catch (err) {
      if (err instanceof ProviderQuotaExceededError) throw err;
      return [];
    }
  }

  async fetchSubscriptionData(companySlug?: string): Promise<NormalizedSubscriptionPayload[]> {
    try {
      const rawList = await this.fetchRawList();

      const results: NormalizedSubscriptionPayload[] = [];

      for (const item of rawList) {
        if (companySlug && item.slug !== companySlug) continue;

        const totalSubVal = item.subscription_total ?? item.total_subscription ?? item.subscription;
        if (totalSubVal === undefined || totalSubVal === null || totalSubVal === '') continue;

        const totalSubscription = Number(totalSubVal);
        if (isNaN(totalSubscription) || totalSubscription < 0) continue;

        const companyName = String(item.name || item.display_name || item.company_name || '');
        const slug = String(item.slug || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

        const qib = item.qib != null && !isNaN(Number(item.qib)) ? Number(item.qib) : undefined;
        const nii = item.nii != null && !isNaN(Number(item.nii)) ? Number(item.nii) : undefined;
        const retail = item.retail != null && !isNaN(Number(item.retail)) ? Number(item.retail) : undefined;

        results.push({
          companySlug: slug,
          snapshotTimestamp: item.updated_at ? new Date(String(item.updated_at)) : new Date(),
          qibSubscription: qib,
          niiSubscription: nii,
          retailSubscription: retail,
          totalSubscription,
          providerId: this.providerId,
        });
      }

      return results;
    } catch (err) {
      if (err instanceof ProviderQuotaExceededError) throw err;
      return [];
    }
  }
}

