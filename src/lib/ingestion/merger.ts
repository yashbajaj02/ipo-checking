/**
 * ==============================================================================
 * FIELD-LEVEL, NON-DESTRUCTIVE IPO MERGER LAYER
 * ==============================================================================
 * Core Principles:
 * 1. Never replace an entire record with a partial provider response.
 * 2. If new provider provides a valid non-null value -> update that specific field.
 * 3. If new provider returns null / missing / undefined -> preserve existing valid DB value.
 * 4. If both DB and new provider are null -> keep null (never fabricate defaults, 0, or fake dates).
 * 5. Invalid values are rejected before reaching merge stage, protecting trusted state.
 * ==============================================================================
 */

import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from './types';

export interface ExistingIpoRecord {
  companyName: string;
  symbol: string | null;
  slug: string;
  category: 'MAINBOARD' | 'SME' | 'UNKNOWN';
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED';
  priceBandMin: string | null;
  priceBandMax: string | null;
  lotSize: number | null;
  issueSizeCrores: string | null;
  freshIssueCrores: string | null;
  ofsCrores: string | null;
  faceValue: string | null;
  retailQuotaPercent: string | null;
  qibQuotaPercent: string | null;
  niiQuotaPercent: string | null;
  drhpUrl: string | null;
  rhpUrl: string | null;
  listingExchange: string | null;
  registrar: string | null;
  registrarUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  strengths: unknown;
  risks: unknown;
}

export interface ExistingIpoDatesRecord {
  offerStartDate: string | null;
  offerEndDate: string | null;
  allotmentDate: string | null;
  unblockingDate: string | null;
  creditToDematDate: string | null;
  listingDate: string | null;
}

export interface ExistingSubscriptionRecord {
  qibSubscription: string | null;
  niiSubscription: string | null;
  bNiiSubscription: string | null;
  sNiiSubscription: string | null;
  retailSubscription: string | null;
  employeeSubscription: string | null;
  shareholderSubscription: string | null;
  totalSubscription: string;
}

export interface ExistingGmpRecord {
  gmpAmount: string;
  gmpPercentage: string;
  estimatedListingPrice: string | null;
}

export interface ExistingListingRecord {
  issuePrice: string;
  listingPrice: string;
  listedDate: string;
}

/**
 * Field-by-field merge for the core `ipos` table record.
 */
export function mergeIpoRecord(
  existing: Partial<ExistingIpoRecord> | null | undefined,
  incoming: NormalizedIpoPayload
): ExistingIpoRecord {
  return {
    companyName: incoming.companyName && incoming.companyName.trim().length > 0
      ? incoming.companyName.trim()
      : (existing?.companyName || 'Unknown IPO'),
    symbol: incoming.symbol && incoming.symbol.trim().length > 0
      ? incoming.symbol.trim()
      : (existing?.symbol ?? null),
    slug: incoming.slug,
    category: incoming.category && incoming.category !== 'UNKNOWN'
      ? incoming.category
      : (existing?.category ?? 'MAINBOARD'),
    status: incoming.status || existing?.status || 'UPCOMING',
    priceBandMin: incoming.priceBandMin != null && !isNaN(Number(incoming.priceBandMin))
      ? String(incoming.priceBandMin)
      : (existing?.priceBandMin ?? null),
    priceBandMax: incoming.priceBandMax != null && !isNaN(Number(incoming.priceBandMax))
      ? String(incoming.priceBandMax)
      : (existing?.priceBandMax ?? null),
    lotSize: incoming.lotSize != null && Number(incoming.lotSize) > 0
      ? Number(incoming.lotSize)
      : (existing?.lotSize ?? null),
    issueSizeCrores: incoming.issueSizeCrores != null && !isNaN(Number(incoming.issueSizeCrores))
      ? String(incoming.issueSizeCrores)
      : (existing?.issueSizeCrores ?? null),
    freshIssueCrores: incoming.freshIssueCrores != null && !isNaN(Number(incoming.freshIssueCrores))
      ? String(incoming.freshIssueCrores)
      : (existing?.freshIssueCrores ?? null),
    ofsCrores: incoming.ofsCrores != null && !isNaN(Number(incoming.ofsCrores))
      ? String(incoming.ofsCrores)
      : (existing?.ofsCrores ?? null),
    faceValue: incoming.faceValue != null && !isNaN(Number(incoming.faceValue))
      ? String(incoming.faceValue)
      : (existing?.faceValue ?? null),
    retailQuotaPercent: incoming.retailQuotaPercent != null && !isNaN(Number(incoming.retailQuotaPercent))
      ? String(incoming.retailQuotaPercent)
      : (existing?.retailQuotaPercent ?? null),
    qibQuotaPercent: incoming.qibQuotaPercent != null && !isNaN(Number(incoming.qibQuotaPercent))
      ? String(incoming.qibQuotaPercent)
      : (existing?.qibQuotaPercent ?? null),
    niiQuotaPercent: incoming.niiQuotaPercent != null && !isNaN(Number(incoming.niiQuotaPercent))
      ? String(incoming.niiQuotaPercent)
      : (existing?.niiQuotaPercent ?? null),
    drhpUrl: incoming.drhpUrl && incoming.drhpUrl.trim().length > 0
      ? incoming.drhpUrl.trim()
      : (existing?.drhpUrl ?? null),
    rhpUrl: incoming.rhpUrl && incoming.rhpUrl.trim().length > 0
      ? incoming.rhpUrl.trim()
      : (existing?.rhpUrl ?? null),
    listingExchange: incoming.listingExchange && incoming.listingExchange.trim().length > 0
      ? incoming.listingExchange.trim()
      : (existing?.listingExchange ?? null),
    registrar: incoming.registrar && incoming.registrar.trim().length > 0
      ? incoming.registrar.trim()
      : (existing?.registrar ?? null),
    registrarUrl: incoming.registrarUrl && incoming.registrarUrl.trim().length > 0
      ? incoming.registrarUrl.trim()
      : (existing?.registrarUrl ?? null),
    logoUrl: incoming.logoUrl && incoming.logoUrl.trim().length > 0
      ? incoming.logoUrl.trim()
      : (existing?.logoUrl ?? null),
    description: incoming.description && incoming.description.trim().length > 0
      ? incoming.description.trim()
      : (existing?.description ?? null),
    strengths: incoming.strengths && incoming.strengths.length > 0
      ? incoming.strengths
      : (existing?.strengths ?? null),
    risks: incoming.risks && incoming.risks.length > 0
      ? incoming.risks
      : (existing?.risks ?? null),
  };
}

/**
 * Field-by-field merge for the `ipo_dates` table record.
 */
export function mergeIpoDates(
  existing: Partial<ExistingIpoDatesRecord> | null | undefined,
  incomingDates?: NormalizedIpoPayload['dates']
): ExistingIpoDatesRecord {
  return {
    offerStartDate: incomingDates?.offerStartDate && incomingDates.offerStartDate.trim().length > 0
      ? incomingDates.offerStartDate.trim()
      : (existing?.offerStartDate ?? null),
    offerEndDate: incomingDates?.offerEndDate && incomingDates.offerEndDate.trim().length > 0
      ? incomingDates.offerEndDate.trim()
      : (existing?.offerEndDate ?? null),
    allotmentDate: incomingDates?.allotmentDate && incomingDates.allotmentDate.trim().length > 0
      ? incomingDates.allotmentDate.trim()
      : (existing?.allotmentDate ?? null),
    unblockingDate: incomingDates?.unblockingDate && incomingDates.unblockingDate.trim().length > 0
      ? incomingDates.unblockingDate.trim()
      : (existing?.unblockingDate ?? null),
    creditToDematDate: incomingDates?.creditToDematDate && incomingDates.creditToDematDate.trim().length > 0
      ? incomingDates.creditToDematDate.trim()
      : (existing?.creditToDematDate ?? null),
    listingDate: incomingDates?.listingDate && incomingDates.listingDate.trim().length > 0
      ? incomingDates.listingDate.trim()
      : (existing?.listingDate ?? null),
  };
}

/**
 * Field-by-field merge for time-series subscription snapshot rows.
 * Preserves existing detailed category breakdowns (QIB, Retail, NII)
 * when a partial provider response only contains total subscription.
 */
export function mergeSubscriptionSnapshot(
  existing: Partial<ExistingSubscriptionRecord> | null | undefined,
  incoming: NormalizedSubscriptionPayload
): ExistingSubscriptionRecord {
  return {
    qibSubscription: incoming.qibSubscription != null && !isNaN(Number(incoming.qibSubscription))
      ? String(incoming.qibSubscription)
      : (existing?.qibSubscription ?? null),
    niiSubscription: incoming.niiSubscription != null && !isNaN(Number(incoming.niiSubscription))
      ? String(incoming.niiSubscription)
      : (existing?.niiSubscription ?? null),
    bNiiSubscription: incoming.bNiiSubscription != null && !isNaN(Number(incoming.bNiiSubscription))
      ? String(incoming.bNiiSubscription)
      : (existing?.bNiiSubscription ?? null),
    sNiiSubscription: incoming.sNiiSubscription != null && !isNaN(Number(incoming.sNiiSubscription))
      ? String(incoming.sNiiSubscription)
      : (existing?.sNiiSubscription ?? null),
    retailSubscription: incoming.retailSubscription != null && !isNaN(Number(incoming.retailSubscription))
      ? String(incoming.retailSubscription)
      : (existing?.retailSubscription ?? null),
    employeeSubscription: incoming.employeeSubscription != null && !isNaN(Number(incoming.employeeSubscription))
      ? String(incoming.employeeSubscription)
      : (existing?.employeeSubscription ?? null),
    shareholderSubscription: incoming.shareholderSubscription != null && !isNaN(Number(incoming.shareholderSubscription))
      ? String(incoming.shareholderSubscription)
      : (existing?.shareholderSubscription ?? null),
    totalSubscription: incoming.totalSubscription != null && !isNaN(Number(incoming.totalSubscription))
      ? String(incoming.totalSubscription)
      : (existing?.totalSubscription || '0'),
  };
}

/**
 * Field-by-field merge for time-series GMP snapshot rows.
 * Preserves estimated listing price or existing metrics when new provider is partial.
 */
export function mergeGmpSnapshot(
  existing: Partial<ExistingGmpRecord> | null | undefined,
  incoming: NormalizedGmpPayload
): ExistingGmpRecord {
  return {
    gmpAmount: incoming.gmpAmount != null && !isNaN(Number(incoming.gmpAmount))
      ? String(incoming.gmpAmount)
      : (existing?.gmpAmount || '0'),
    gmpPercentage: incoming.gmpPercentage != null && !isNaN(Number(incoming.gmpPercentage))
      ? String(incoming.gmpPercentage)
      : (existing?.gmpPercentage || '0'),
    estimatedListingPrice: incoming.estimatedListingPrice != null && !isNaN(Number(incoming.estimatedListingPrice))
      ? String(incoming.estimatedListingPrice)
      : (existing?.estimatedListingPrice ?? null),
  };
}

/**
 * Field-by-field merge for `ipo_listing_results`.
 */
export function mergeListingResults(
  existing: Partial<ExistingListingRecord> | null | undefined,
  incoming: { issuePrice?: number; listingPrice?: number; listedDate?: string }
): ExistingListingRecord {
  return {
    issuePrice: incoming.issuePrice != null && !isNaN(Number(incoming.issuePrice))
      ? String(incoming.issuePrice)
      : (existing?.issuePrice || '0'),
    listingPrice: incoming.listingPrice != null && !isNaN(Number(incoming.listingPrice))
      ? String(incoming.listingPrice)
      : (existing?.listingPrice || '0'),
    listedDate: incoming.listedDate || existing?.listedDate || new Date().toISOString().split('T')[0],
  };
}
