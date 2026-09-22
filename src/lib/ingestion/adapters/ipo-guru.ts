import { BaseIpoProviderAdapter } from './base';
import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from '../types';

export class IpoGuruProviderAdapter extends BaseIpoProviderAdapter {
  readonly providerId = 'ipo_guru';
  readonly providerName = 'IPO Guru Data Source';
  readonly priorityRank = 2; // Secondary source with strong GMP tracking

  async fetchMainboardIpos(): Promise<NormalizedIpoPayload[]> {
    return [];
  }

  async fetchGmpData(): Promise<NormalizedGmpPayload[]> {
    // GMP data observation adapter
    return [];
  }

  async fetchSubscriptionData(): Promise<NormalizedSubscriptionPayload[]> {
    return [];
  }
}
