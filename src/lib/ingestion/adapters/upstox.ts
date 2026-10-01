import { BaseIpoProviderAdapter } from './base';
import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
  ProviderUnavailableError,
  ProviderQuotaExceededError,
} from '../types';
import { usageTracker } from '../usage-tracker';

/**
 * ==============================================================================
 * UPSTOX PROVIDER ADAPTER (Priority Rank 3 - Explicit Opt-In Only)
 * ==============================================================================
 * Rules:
 * - Upstox only enabled if process.env.ENABLE_UPSTOX === 'true'.
 * - Priority 3 (evaluated after IPO Guru and IPO Alerts).
 * ==============================================================================
 */
export class UpstoxIpoProviderAdapter extends BaseIpoProviderAdapter {
  readonly providerId = 'upstox';
  readonly providerName = 'Upstox Broker API (Opt-In)';
  readonly priorityRank = 3; // Priority 3: Only later if explicitly enabled

  isConfigured(): boolean {
    const isExplicitlyEnabled = process.env.ENABLE_UPSTOX === 'true';
    const hasKey = Boolean(process.env.UPSTOX_API_KEY);
    return isExplicitlyEnabled && hasKey;
  }

  async fetchIpos(): Promise<NormalizedIpoPayload[]> {
    if (!this.isConfigured()) {
      throw new ProviderUnavailableError(
        this.providerId,
        'Upstox provider is disabled. Enable by setting ENABLE_UPSTOX=true and UPSTOX_API_KEY.'
      );
    }

    if (!usageTracker.hasQuota(this.providerId)) {
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      throw new ProviderQuotaExceededError(
        this.providerId,
        tomorrow,
        `Upstox daily request quota exhausted.`
      );
    }

    usageTracker.recordRequest(this.providerId);
    return [];
  }

  async fetchGmpData(): Promise<NormalizedGmpPayload[]> {
    // Official broker APIs do not distribute non-official GMP data
    return [];
  }

  async fetchSubscriptionData(): Promise<NormalizedSubscriptionPayload[]> {
    if (!this.isConfigured()) return [];
    return [];
  }
}
