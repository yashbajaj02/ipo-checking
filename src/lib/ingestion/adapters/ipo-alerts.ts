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
 * IPO ALERTS PROVIDER ADAPTER (Active Data Provider)
 * ==============================================================================
 * Rules:
 * - Active external data provider.
 * - Reads IPO_ALERTS_KEY from server environment (.env.local).
 * - Never log or expose the key.
 * ==============================================================================
 */
export class IpoAlertsProviderAdapter extends BaseIpoProviderAdapter {
  readonly providerId = 'ipo_alerts';
  readonly providerName = 'IPO Alerts';
  readonly priorityRank = 1;

  private getApiKey(): string | undefined {
    return process.env.IPO_ALERTS_KEY || process.env.IPO_ALERTS_API_KEY;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  private async fetchPage(page: number = 1): Promise<{ items: Record<string, unknown>[]; totalPages: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) return { items: [], totalPages: 0 };

    const baseUrl = process.env.IPO_ALERTS_BASE_URL || 'https://api.ipoalerts.in';
    // Free plan supports /ipos?status=open or /ipos (status=upcoming returns 400 on free plan)
    const url = `${baseUrl}/ipos?status=open&page=${page}`;

    try {
      await usageTracker.recordRequest(this.providerId);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
          'User-Agent': `${process.env.NEXT_PUBLIC_APP_NAME || 'IPO Deals'}-Ingestion/1.0`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 429 || res.status === 402) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 3600;
        const resetAt = new Date(Date.now() + retryAfterSeconds * 1000);
        await usageTracker.lockProvider(this.providerId, resetAt, `IPO Alerts rate limit/quota reached (HTTP ${res.status}).`);
        throw new ProviderQuotaExceededError(this.providerId, resetAt, `IPO Alerts rate limit reached (HTTP ${res.status})`, res.status);
      }

      if (!res.ok) {
        throw new Error(`IPO Alerts API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const list = Array.isArray(json.ipos)
        ? json.ipos
        : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      const totalPages = typeof json.meta?.totalPages === 'number' ? json.meta.totalPages : 1;

      return { items: list as Record<string, unknown>[], totalPages };
    } catch (err) {
      if (err instanceof ProviderQuotaExceededError) throw err;
      console.warn(`[ipo_alerts] Fetch error for page ${page}:`, err instanceof Error ? err.message : err);
      return { items: [], totalPages: 0 };
    }
  }

  async fetchIpos(): Promise<NormalizedIpoPayload[]> {
    if (!usageTracker.hasQuota(this.providerId)) {
      const remaining = usageTracker.getRemainingRequests(this.providerId);
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      throw new ProviderQuotaExceededError(
        this.providerId,
        tomorrow,
        `IPO Alerts daily request quota exhausted (${remaining} remaining today).`
      );
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderUnavailableError(
        this.providerId,
        'IPO Alerts API key is not configured in environment variables (IPO_ALERTS_KEY).'
      );
    }

    try {
      const combinedMap = new Map<string, Record<string, unknown>>();

      // Fetch page 1 (1 request)
      const page1 = await this.fetchPage(1);
      for (const item of page1.items) {
        const id = String(item.id || item.slug || item.symbol || item.name || '');
        if (id && !combinedMap.has(id)) combinedMap.set(id, item);
      }

      // Fetch page 2 if additional items exist and quota is available (max 2 requests per static cycle)
      if (page1.totalPages > 1 && usageTracker.hasQuota(this.providerId)) {
        const page2 = await this.fetchPage(2);
        for (const item of page2.items) {
          const id = String(item.id || item.slug || item.symbol || item.name || '');
          if (id && !combinedMap.has(id)) combinedMap.set(id, item);
        }
      }

      const allItems = Array.from(combinedMap.values());

      const normalized: NormalizedIpoPayload[] = allItems.map((item: Record<string, unknown>) => {
        const companyName = String(
          item.name || item.company || item.company_name || item.display_name || ''
        );
        const symbol = item.symbol ? String(item.symbol) : item.ticker ? String(item.ticker) : undefined;
        const slug = String(
          item.slug ||
            (companyName
              ? companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
              : '')
        );
        const typeStr = String(item.type || item.market_type || item.board || item.category || '').toUpperCase();
        const isSme =
          typeStr === 'SME' ||
          item.is_sme === true ||
          companyName.toLowerCase().includes('sme');

        let priceBandMin: number | undefined = undefined;
        let priceBandMax: number | undefined = undefined;

        if (typeof item.priceRange === 'string') {
          const parts = item.priceRange.split('-').map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
          if (parts.length === 2) {
            priceBandMin = parts[0];
            priceBandMax = parts[1];
          } else if (parts.length === 1) {
            priceBandMin = parts[0];
            priceBandMax = parts[0];
          }
        } else {
          if (item.min_price != null && !isNaN(Number(item.min_price))) {
            priceBandMin = Number(item.min_price);
          } else if (item.price_min != null && !isNaN(Number(item.price_min))) {
            priceBandMin = Number(item.price_min);
          }

          if (item.max_price != null && !isNaN(Number(item.max_price))) {
            priceBandMax = Number(item.max_price);
          } else if (item.price_max != null && !isNaN(Number(item.price_max))) {
            priceBandMax = Number(item.price_max);
          } else if (item.issue_price != null && !isNaN(Number(item.issue_price))) {
            priceBandMax = Number(item.issue_price);
          }
        }

        const rawStatus = String(item.status || '').toUpperCase();
        const status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED' =
          rawStatus === 'UPCOMING'
            ? 'UPCOMING'
            : rawStatus === 'OPEN'
            ? 'OPEN'
            : rawStatus === 'CLOSED'
            ? 'CLOSED'
            : rawStatus === 'LISTED' || item.is_listed === true
            ? 'LISTED'
            : 'UPCOMING';

        const lotSize =
          item.minQty != null && Number(item.minQty) > 0
            ? Number(item.minQty)
            : item.lot != null && Number(item.lot) > 0
            ? Number(item.lot)
            : item.lot_size != null && Number(item.lot_size) > 0
            ? Number(item.lot_size)
            : undefined;

        let issueSizeCrores: number | undefined = undefined;
        if (typeof item.issueSize === 'string') {
          const cleaned = item.issueSize.toLowerCase().replace(/cr|crore|crores/g, '').trim();
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) issueSizeCrores = parsed;
        } else if (item.issue_size != null && !isNaN(Number(item.issue_size))) {
          issueSizeCrores = Number(item.issue_size);
        }

        const minInvestment =
          item.minAmount != null && !isNaN(Number(item.minAmount))
            ? Number(item.minAmount)
            : item.min_investment != null && !isNaN(Number(item.min_investment))
            ? Number(item.min_investment)
            : lotSize && priceBandMax
            ? lotSize * priceBandMax
            : undefined;

        const logoUrl = item.logo ? String(item.logo) : undefined;
        const rhpUrl = item.prospectusUrl ? String(item.prospectusUrl) : item.rhp ? String(item.rhp) : undefined;
        const description = item.about ? String(item.about) : undefined;
        const strengths = Array.isArray(item.strengths) ? (item.strengths as string[]) : undefined;
        const risks = Array.isArray(item.risks) ? (item.risks as string[]) : undefined;

        // Parse schedule events if available
        let allotmentDate: string | undefined = undefined;
        let unblockingDate: string | undefined = undefined;
        let creditToDematDate: string | undefined = undefined;
        let scheduleListingDate: string | undefined = undefined;

        if (Array.isArray(item.schedule)) {
          for (const ev of item.schedule as Array<{ event?: string; date?: string }>) {
            const evName = String(ev.event || '').toLowerCase();
            if (ev.date && typeof ev.date === 'string') {
              if (evName.includes('allotment')) allotmentDate = ev.date;
              else if (evName.includes('refund')) unblockingDate = ev.date;
              else if (evName.includes('credit') || evName.includes('share credit')) creditToDematDate = ev.date;
              else if (evName.includes('listing')) scheduleListingDate = ev.date;
            }
          }
        }

        const offerStartDate = String(item.startDate || item.open_date || item.start_date || '') || undefined;
        const offerEndDate = String(item.endDate || item.close_date || item.end_date || '') || undefined;
        const listingDate = String(item.listingDate || scheduleListingDate || item.listing_date || '') || undefined;

        return {
          companyName,
          symbol,
          slug,
          category: isSme ? 'SME' : 'MAINBOARD',
          status,
          priceBandMin,
          priceBandMax,
          issuePrice: priceBandMax,
          lotSize,
          minInvestment,
          issueSizeCrores,
          rhpUrl,
          logoUrl,
          description,
          strengths,
          risks,
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
      if (err instanceof ProviderQuotaExceededError) throw err;
      throw new Error(`IPO Alerts fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async fetchGmpData(): Promise<NormalizedGmpPayload[]> {
    // IPO Alerts does not have bulk GMP endpoints on the free plan, so returns empty array safely
    return [];
  }

  async fetchSubscriptionData(): Promise<NormalizedSubscriptionPayload[]> {
    // IPO Alerts does not track multi-tranche subscriptions, returns empty array safely
    return [];
  }
}
