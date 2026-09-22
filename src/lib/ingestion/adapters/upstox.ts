import { BaseIpoProviderAdapter } from './base';
import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from '../types';

export class UpstoxIpoProviderAdapter extends BaseIpoProviderAdapter {
  readonly providerId = 'upstox';
  readonly providerName = 'Upstox IPO API';
  readonly priorityRank = 1; // Highest priority for official broker API data

  async fetchMainboardIpos(): Promise<NormalizedIpoPayload[]> {
    // Adapter integration skeleton for Upstox API
    // Returns normalized Mainboard IPO data
    return [];
  }

  async fetchGmpData(): Promise<NormalizedGmpPayload[]> {
    // Official broker APIs rarely supply non-official GMP data
    return [];
  }

  async fetchSubscriptionData(): Promise<NormalizedSubscriptionPayload[]> {
    return [];
  }
}
