import { BaseIpoProviderAdapter } from './base';
import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from '../types';

/**
 * IPO Alerts Provider Adapter Placeholder
 *
 * NOTE: Do NOT make live API calls until credentials, endpoint schemas,
 * and rate limits have been verified in sandbox testing.
 */
export class IpoAlertsProviderAdapter extends BaseIpoProviderAdapter {
  readonly providerId = 'ipo_alerts';
  readonly providerName = 'IPO Alerts Data Source';
  readonly priorityRank = 3; // Priority ranking pending sandbox validation

  async fetchMainboardIpos(): Promise<NormalizedIpoPayload[]> {
    // Placeholder - to be implemented after API response verification
    return [];
  }

  async fetchGmpData(): Promise<NormalizedGmpPayload[]> {
    // Placeholder - to be implemented after API response verification
    return [];
  }

  async fetchSubscriptionData(): Promise<NormalizedSubscriptionPayload[]> {
    // Placeholder - to be implemented after API response verification
    return [];
  }
}
