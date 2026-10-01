/**
 * ==============================================================================
 * CORE IPO TYPES & INTERFACES
 * ==============================================================================
 * Production types for IPO checking, tracking, and detail views.
 * Data is populated strictly from Neon PostgreSQL cache / API.
 * ==============================================================================
 */

export interface IpoGmpPoint {
  date: string;
  gmpAmount: number;
  gmpPercentage: number;
}

export interface IpoSubscriptionData {
  qib?: number;
  sNii?: number;
  bNii?: number;
  niiTotal?: number;
  retail?: number;
  employee?: number;
  shareholder?: number;
  total: number;
  lastUpdated?: string;
}

export interface IpoDatesData {
  offerStartDate?: string;
  offerEndDate?: string;
  allotmentDate?: string;
  refundDate?: string;
  unblockingDate?: string;
  creditDate?: string;
  creditToDematDate?: string;
  listingDate?: string;
  upiMandateDeadline?: string;
}

export interface IpoListingData {
  issuePrice?: number;
  listingPrice?: number;
  gainLossPercent?: number;
  finalGmp?: number;
  gmpVariance?: number;
}

export interface IpoMarketQuote {
  ltp?: number;
  change?: number;
  changePercent?: number;
  previousClose?: number;
  volume?: number;
  lastUpdated?: string;
}

export interface IpoItem {
  id: string;
  companyName: string;
  symbol: string;
  slug: string;
  category: 'MAINBOARD' | 'SME';
  status: 'OPEN' | 'UPCOMING' | 'CLOSED' | 'LISTED';
  priceBandMin?: number;
  priceBandMax?: number;
  issuePrice?: number;
  lotSize?: number;
  minInvestment?: number;
  issueSizeCrores?: number;
  freshIssueCrores?: number;
  ofsCrores?: number;
  faceValue?: number;
  retailQuotaPercent?: number;
  qibQuotaPercent?: number;
  niiQuotaPercent?: number;
  drhpUrl?: string;
  rhpUrl?: string;
  listingExchange?: string;
  registrar?: string;
  registrarUrl?: string;
  logoUrl?: string;
  description?: string;
  aiDescription?: string;
  strengths?: string[];
  risks?: string[];
  dates: IpoDatesData;
  gmp?: {
    amount: number;
    percentage: number;
    estimatedListingPrice?: number;
    trend?: 'up' | 'down' | 'flat';
    source?: string;
    sourceTimestamp?: string;
    history?: IpoGmpPoint[];
  };
  subscription?: IpoSubscriptionData;
  listing?: IpoListingData;
  marketQuote?: IpoMarketQuote;
  daysRemaining?: number;
  closingTag?: string;
  logoText?: string;
  logoBg?: string;

  // Backend Automatic Action Engine fields
  action?: IpoAction;
  actionScore?: number;
  actionConfidence?: IpoActionConfidence;
  actionBreakdown?: IpoActionBreakdown;
}

export type IpoAction = 'APPLY' | 'MAY_APPLY' | 'AVOID';
export type IpoActionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IpoActionComponentScore {
  score: number;
  maxScore: number;
  available: boolean;
  reason: string;
}

export interface IpoActionBreakdown {
  gmp: IpoActionComponentScore;
  qib: IpoActionComponentScore;
  nii: IpoActionComponentScore;
  financials: IpoActionComponentScore;
  valuation: IpoActionComponentScore;
  issueStructure: IpoActionComponentScore;
  risks: IpoActionComponentScore;
}

export interface IpoActionScoreData {
  action: IpoAction;
  score: number;
  confidence: IpoActionConfidence;
  breakdown: IpoActionBreakdown;
  calculatedAt?: string;
  engineVersion?: string;
}
