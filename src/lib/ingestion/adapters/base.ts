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

  abstract isConfigured(): boolean;
  abstract fetchIpos(): Promise<NormalizedIpoPayload[]>;
  abstract fetchGmpData(companySlug?: string): Promise<NormalizedGmpPayload[]>;
  abstract fetchSubscriptionData(companySlug?: string): Promise<NormalizedSubscriptionPayload[]>;

  /**
   * Filter valid categories eligible for publishing:
   * - MAINBOARD: Accepted (default user view)
   * - SME: Accepted (user-selectable filter)
   * - UNKNOWN / UNVERIFIED: Excluded from public ingestion & quarantined
   */
  protected filterValidCategories(items: NormalizedIpoPayload[]): NormalizedIpoPayload[] {
    return items.filter(
      (item) => item.category === 'MAINBOARD' || item.category === 'SME'
    );
  }
}
