import { z } from 'zod';

// Board Category Enum & Triage
export const IpoCategorySchema = z.enum(['MAINBOARD', 'SME', 'UNKNOWN']);
export type IpoCategory = z.infer<typeof IpoCategorySchema>;

export const IpoStatusSchema = z.enum(['UPCOMING', 'OPEN', 'CLOSED', 'LISTED']);
export type IpoStatus = z.infer<typeof IpoStatusSchema>;

// Normalized IPO Details Payload from any External Provider
export const NormalizedIpoPayloadSchema = z.object({
  companyName: z.string().min(1),
  symbol: z.string().nullable().optional(),
  slug: z.string().min(1),
  category: IpoCategorySchema,
  status: IpoStatusSchema,
  priceBandMin: z.number().nullable().optional(),
  priceBandMax: z.number().nullable().optional(),
  issuePrice: z.number().nullable().optional(),
  lotSize: z.number().int().nullable().optional(),
  minInvestment: z.number().nullable().optional(),
  issueSizeCrores: z.number().nullable().optional(),
  freshIssueCrores: z.number().nullable().optional(),
  ofsCrores: z.number().nullable().optional(),
  faceValue: z.number().nullable().optional(),
  retailQuotaPercent: z.number().nullable().optional(),
  qibQuotaPercent: z.number().nullable().optional(),
  niiQuotaPercent: z.number().nullable().optional(),
  drhpUrl: z.string().nullable().optional(),
  rhpUrl: z.string().nullable().optional(),
  listingExchange: z.string().nullable().optional(),
  registrar: z.string().nullable().optional(),
  registrarUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  strengths: z.array(z.string()).nullable().optional(),
  risks: z.array(z.string()).nullable().optional(),
  listingPrice: z.number().nullable().optional(),
  dates: z.object({
    offerStartDate: z.string().nullable().optional(), // YYYY-MM-DD
    offerEndDate: z.string().nullable().optional(),
    allotmentDate: z.string().nullable().optional(),
    unblockingDate: z.string().nullable().optional(),
    creditToDematDate: z.string().nullable().optional(),
    listingDate: z.string().nullable().optional(),
  }),
});
export type NormalizedIpoPayload = z.infer<typeof NormalizedIpoPayloadSchema>;

// Normalized GMP Payload
export const NormalizedGmpPayloadSchema = z.object({
  companySlug: z.string(),
  gmpAmount: z.number(),
  gmpPercentage: z.number(),
  estimatedListingPrice: z.number().nullable().optional(),
  sourceTimestamp: z.date(),
  providerId: z.string(),
});
export type NormalizedGmpPayload = z.infer<typeof NormalizedGmpPayloadSchema>;

// Normalized Subscription Payload
export const NormalizedSubscriptionPayloadSchema = z.object({
  companySlug: z.string(),
  snapshotTimestamp: z.date(),
  qibSubscription: z.number().nullable().optional(),
  niiSubscription: z.number().nullable().optional(),
  bNiiSubscription: z.number().nullable().optional(),
  sNiiSubscription: z.number().nullable().optional(),
  retailSubscription: z.number().nullable().optional(),
  employeeSubscription: z.number().nullable().optional(),
  shareholderSubscription: z.number().nullable().optional(),
  totalSubscription: z.number(),
  providerId: z.string(),
});
export type NormalizedSubscriptionPayload = z.infer<typeof NormalizedSubscriptionPayloadSchema>;

// External Provider Interface
export interface ExternalIpoProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;
  readonly priorityRank: number; // 1 is highest priority (1. IPO Guru, 2. IPO Alerts, 3. Upstox)

  isConfigured(): boolean;
  fetchIpos(): Promise<NormalizedIpoPayload[]>;
  fetchGmpData(companySlug?: string): Promise<NormalizedGmpPayload[]>;
  fetchSubscriptionData(companySlug?: string): Promise<NormalizedSubscriptionPayload[]>;
}

// Dedicated Error for HTTP 429 or Quota Limit Exceeded
export class ProviderQuotaExceededError extends Error {
  readonly providerId: string;
  readonly resetAt: Date;
  readonly statusCode: number;

  constructor(
    providerId: string,
    resetAt: Date,
    message = 'External provider quota or rate limit exceeded',
    statusCode = 429
  ) {
    super(`[${providerId}] ${message} (rate-limited until: ${resetAt.toISOString()})`);
    this.name = 'ProviderQuotaExceededError';
    this.providerId = providerId;
    this.resetAt = resetAt;
    this.statusCode = statusCode;
  }
}

// Error for Missing Configuration or Explicit Disablement
export class ProviderUnavailableError extends Error {
  readonly providerId: string;

  constructor(providerId: string, message: string) {
    super(`[${providerId}] ${message}`);
    this.name = 'ProviderUnavailableError';
    this.providerId = providerId;
  }
}

// Ingestion Result Summary Interface
export interface IngestionCycleResult {
  success: boolean;
  providerUsed: string;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  recordsProcessed: number;
  timestamp: Date;
  details?: Record<string, unknown>;
}
