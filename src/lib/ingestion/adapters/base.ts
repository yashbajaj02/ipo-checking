import {
  ExternalIpoProviderAdapter,
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from '../types';

export abstract class BaseIpoProviderAdapter implements ExternalIpoProviderAdapter {
  abstract readonly providerId: string;
  abstract readonly providerName: string;
  abstract readonly priorityRank: number;

  abstract fetchMainboardIpos(): Promise<NormalizedIpoPayload[]>;
  abstract fetchGmpData(companySlug?: string): Promise<NormalizedGmpPayload[]>;
  abstract fetchSubscriptionData(companySlug?: string): Promise<NormalizedSubscriptionPayload[]>;

  /**
   * Filter out any SME IPOs to guarantee strict Mainboard compliance.
   */
  protected filterMainboardOnly(items: NormalizedIpoPayload[]): NormalizedIpoPayload[] {
    return items.filter((item) => item.category === 'MAINBOARD');
  }
}
