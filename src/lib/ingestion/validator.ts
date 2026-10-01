/**
 * ==============================================================================
 * IPO INGESTION VALIDATION LAYER
 * ==============================================================================
 * Enforces data integrity, chronological consistency, price bounds,
 * and state-machine lifecycle irreversibility before persistence to Neon DB.
 * ==============================================================================
 */

import {
  NormalizedIpoPayload,
  NormalizedGmpPayload,
  NormalizedSubscriptionPayload,
} from './types';

export type IpoDatesPayload = NormalizedIpoPayload['dates'];

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  warnings: string[];
  errors: string[];
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a date string format (YYYY-MM-DD) and check if it represents a valid calendar date.
 */
export function isValidDateString(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Safely parse any provider date string (e.g., ISO, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD MMM YYYY)
 * into a canonical YYYY-MM-DD format. Returns undefined if invalid or empty.
 */
export function parseAndNormalizeDate(val: unknown): string | undefined {
  if (!val) return undefined;
  const str = String(val).trim();
  if (
    !str ||
    str === '-' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'tba'
  ) {
    return undefined;
  }

  // If already YYYY-MM-DD
  if (DATE_REGEX.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return str;
  }

  // If ISO string like 2026-09-21T18:30:00.000Z
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
  }

  // If DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const candidate = `${year}-${month}-${day}`;
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) return candidate;
  }

  // Try Date.parse for formats like "22 Sep 2026" or "Sep 22, 2026"
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const year = d.getFullYear();
    if (year >= 2000 && year <= 2100) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
  }

  return undefined;
}

/**
 * Validate chronological ordering of IPO dates.
 */
export function validateDateSequence(dates: IpoDatesPayload): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { offerStartDate, offerEndDate, allotmentDate, unblockingDate, creditToDematDate, listingDate } = dates;

  if (offerStartDate && !isValidDateString(offerStartDate)) {
    errors.push(`Invalid offerStartDate format: ${offerStartDate}`);
  }
  if (offerEndDate && !isValidDateString(offerEndDate)) {
    errors.push(`Invalid offerEndDate format: ${offerEndDate}`);
  }
  if (allotmentDate && !isValidDateString(allotmentDate)) {
    errors.push(`Invalid allotmentDate format: ${allotmentDate}`);
  }
  if (unblockingDate && !isValidDateString(unblockingDate)) {
    errors.push(`Invalid unblockingDate format: ${unblockingDate}`);
  }
  if (creditToDematDate && !isValidDateString(creditToDematDate)) {
    errors.push(`Invalid creditToDematDate format: ${creditToDematDate}`);
  }
  if (listingDate && !isValidDateString(listingDate)) {
    errors.push(`Invalid listingDate format: ${listingDate}`);
  }

  // Chronology validations
  if (offerStartDate && offerEndDate && offerStartDate > offerEndDate) {
    errors.push(`Chronology error: offerStartDate (${offerStartDate}) is after offerEndDate (${offerEndDate})`);
  }
  if (offerEndDate && allotmentDate && offerEndDate > allotmentDate) {
    errors.push(`Chronology error: offerEndDate (${offerEndDate}) is after allotmentDate (${allotmentDate})`);
  }
  if (allotmentDate && listingDate && allotmentDate > listingDate) {
    errors.push(`Chronology error: allotmentDate (${allotmentDate}) is after listingDate (${listingDate})`);
  }
  if (offerEndDate && listingDate && offerEndDate > listingDate) {
    errors.push(`Chronology error: offerEndDate (${offerEndDate}) is after listingDate (${listingDate})`);
  }
  if (offerStartDate && listingDate && offerStartDate > listingDate) {
    errors.push(`Chronology error: offerStartDate (${offerStartDate}) is after listingDate (${listingDate})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * State machine rank for lifecycle statuses
 */
const STATUS_RANK: Record<string, number> = {
  UPCOMING: 1,
  OPEN: 2,
  CLOSED: 3,
  LISTED: 4,
};

/**
 * Validate and sanitize an incoming NormalizedIpoPayload.
 * Optionally checks against existing DB state to prevent lifecycle regression and protect valid historical data.
 */
export function validateIpoPayload(
  incoming: NormalizedIpoPayload,
  existingDbRecord?: {
    status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED';
    listingDate?: string | null;
  }
): ValidationResult<NormalizedIpoPayload> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Identity validation
  const companyName = incoming.companyName ? incoming.companyName.trim() : '';
  if (!companyName) {
    errors.push('Missing or empty company name');
  }

  const slug = incoming.slug ? incoming.slug.trim() : '';
  if (!slug) {
    errors.push('Missing or empty slug');
  }

  // Reject explicit synthetic/test markers in production ingestion
  const lowerName = companyName.toLowerCase();
  const lowerSlug = slug.toLowerCase();
  const explicitTestMarkers = [
    'mock-company-ltd',
    'mock-static-ipo-ltd',
    'test-alerts-ipo-ltd',
    'test_isolation_',
    'mock-',
    'test-ipo-',
    'fake-ipo',
    'example.com',
  ];

  for (const marker of explicitTestMarkers) {
    if (lowerSlug.includes(marker) || lowerName.includes(marker)) {
      errors.push(`Rejected synthetic/test payload marker: '${marker}' detected in incoming record ('${slug}')`);
    }
  }

  const category = incoming.category === 'SME' ? 'SME' : 'MAINBOARD';

  // 2. Status validation & lifecycle regression prevention
  let status = incoming.status;
  if (!['UPCOMING', 'OPEN', 'CLOSED', 'LISTED'].includes(status)) {
    warnings.push(`Unknown status '${status}', defaulting to UPCOMING`);
    status = 'UPCOMING';
  }

  // Prevent status regression if existing record is already further along (especially LISTED)
  if (existingDbRecord) {
    const existingRank = STATUS_RANK[existingDbRecord.status] || 1;
    const incomingRank = STATUS_RANK[status] || 1;

    if (existingDbRecord.status === 'LISTED' && status !== 'LISTED') {
      warnings.push(
        `Lifecycle regression prevented: IPO is already LISTED in database, rejecting regression to '${status}'`
      );
      status = 'LISTED';
    } else if (existingRank > incomingRank && existingDbRecord.status === 'CLOSED' && status === 'UPCOMING') {
      warnings.push(
        `Lifecycle regression prevented: IPO is already CLOSED in database, rejecting regression to '${status}'`
      );
      status = existingDbRecord.status;
    }
  }

  // 3. Price band validation
  let priceBandMin = incoming.priceBandMin;
  let priceBandMax = incoming.priceBandMax;

  if (priceBandMin != null) {
    if (isNaN(priceBandMin) || priceBandMin <= 0) {
      warnings.push(`Invalid priceBandMin (${priceBandMin}), discarding`);
      priceBandMin = undefined;
    }
  }

  if (priceBandMax != null) {
    if (isNaN(priceBandMax) || priceBandMax <= 0) {
      warnings.push(`Invalid priceBandMax (${priceBandMax}), discarding`);
      priceBandMax = undefined;
    }
  }

  if (priceBandMin != null && priceBandMax != null && priceBandMin > priceBandMax) {
    warnings.push(
      `Inverted price band: min (${priceBandMin}) > max (${priceBandMax}), swapping values`
    );
    const temp = priceBandMin;
    priceBandMin = priceBandMax;
    priceBandMax = temp;
  }

  // 4. Lot Size validation
  let lotSize = incoming.lotSize;
  if (lotSize != null) {
    if (isNaN(lotSize) || lotSize <= 0 || !Number.isInteger(lotSize)) {
      warnings.push(`Invalid lotSize (${lotSize}), discarding`);
      lotSize = undefined;
    }
  }

  // 5. Issue Size validation
  let issueSizeCrores = incoming.issueSizeCrores;
  if (issueSizeCrores != null) {
    if (isNaN(issueSizeCrores) || issueSizeCrores <= 0) {
      warnings.push(`Invalid issueSizeCrores (${issueSizeCrores}), discarding`);
      issueSizeCrores = undefined;
    }
  }

  let freshIssueCrores = incoming.freshIssueCrores;
  if (freshIssueCrores != null && (isNaN(freshIssueCrores) || freshIssueCrores < 0)) {
    warnings.push(`Invalid freshIssueCrores (${freshIssueCrores}), discarding`);
    freshIssueCrores = undefined;
  }

  let ofsCrores = incoming.ofsCrores;
  if (ofsCrores != null && (isNaN(ofsCrores) || ofsCrores < 0)) {
    warnings.push(`Invalid ofsCrores (${ofsCrores}), discarding`);
    ofsCrores = undefined;
  }

  let faceValue = incoming.faceValue;
  if (faceValue != null && (isNaN(faceValue) || faceValue <= 0)) {
    warnings.push(`Invalid faceValue (${faceValue}), discarding`);
    faceValue = undefined;
  }

  // 6. Quotas validation (0 to 100)
  const validateQuota = (val: number | undefined | null, name: string): number | undefined => {
    if (val == null) return undefined;
    if (isNaN(val) || val < 0 || val > 100) {
      warnings.push(`Invalid ${name} (${val}), must be between 0 and 100`);
      return undefined;
    }
    return val;
  };

  const retailQuotaPercent = validateQuota(incoming.retailQuotaPercent, 'retailQuotaPercent');
  const qibQuotaPercent = validateQuota(incoming.qibQuotaPercent, 'qibQuotaPercent');
  const niiQuotaPercent = validateQuota(incoming.niiQuotaPercent, 'niiQuotaPercent');

  // 7. Dates normalization & validation
  const sanitizedDates: IpoDatesPayload = {
    offerStartDate: parseAndNormalizeDate(incoming.dates?.offerStartDate),
    offerEndDate: parseAndNormalizeDate(incoming.dates?.offerEndDate),
    allotmentDate: parseAndNormalizeDate(incoming.dates?.allotmentDate),
    unblockingDate: parseAndNormalizeDate(incoming.dates?.unblockingDate),
    creditToDematDate: parseAndNormalizeDate(incoming.dates?.creditToDematDate),
    listingDate: parseAndNormalizeDate(incoming.dates?.listingDate),
  };

  const dateSeqResult = validateDateSequence(sanitizedDates);
  if (!dateSeqResult.isValid) {
    warnings.push(...dateSeqResult.errors);
    // If incoming dates are chronologically broken, drop the invalid contradictory fields
    if (sanitizedDates.offerStartDate && sanitizedDates.offerEndDate && sanitizedDates.offerStartDate > sanitizedDates.offerEndDate) {
      sanitizedDates.offerEndDate = undefined;
    }
    if (sanitizedDates.allotmentDate && sanitizedDates.listingDate && sanitizedDates.allotmentDate > sanitizedDates.listingDate) {
      sanitizedDates.listingDate = undefined;
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      warnings,
      errors,
    };
  }

  const sanitizedData: NormalizedIpoPayload = {
    companyName,
    symbol: incoming.symbol?.trim() || undefined,
    slug,
    category,
    status,
    priceBandMin,
    priceBandMax,
    lotSize,
    issueSizeCrores,
    freshIssueCrores,
    ofsCrores,
    faceValue,
    retailQuotaPercent,
    qibQuotaPercent,
    niiQuotaPercent,
    drhpUrl: incoming.drhpUrl?.trim() || undefined,
    rhpUrl: incoming.rhpUrl?.trim() || undefined,
    listingExchange: incoming.listingExchange?.trim() || undefined,
    registrar: incoming.registrar?.trim() || undefined,
    listingPrice: incoming.listingPrice,
    dates: sanitizedDates,
  };

  return {
    isValid: true,
    data: sanitizedData,
    warnings,
    errors,
  };
}

/**
 * Validate NormalizedGmpPayload
 */
export function validateGmpPayload(gmp: NormalizedGmpPayload): ValidationResult<NormalizedGmpPayload> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!gmp.companySlug) {
    errors.push('Missing companySlug in GMP payload');
  }

  if (isNaN(gmp.gmpAmount) || !isFinite(gmp.gmpAmount)) {
    errors.push(`Invalid gmpAmount: ${gmp.gmpAmount}`);
  }

  if (isNaN(gmp.gmpPercentage) || !isFinite(gmp.gmpPercentage)) {
    errors.push(`Invalid gmpPercentage: ${gmp.gmpPercentage}`);
  }

  if (errors.length > 0) {
    return { isValid: false, warnings, errors };
  }

  return {
    isValid: true,
    data: gmp,
    warnings,
    errors,
  };
}

/**
 * Validate NormalizedSubscriptionPayload
 */
export function validateSubscriptionPayload(
  sub: NormalizedSubscriptionPayload
): ValidationResult<NormalizedSubscriptionPayload> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!sub.companySlug) {
    errors.push('Missing companySlug in subscription payload');
  }

  if (isNaN(sub.totalSubscription) || sub.totalSubscription < 0 || !isFinite(sub.totalSubscription)) {
    errors.push(`Invalid totalSubscription: ${sub.totalSubscription}`);
  }

  const validateSubscriptionMultiplier = (val: number | undefined | null, name: string): number | undefined => {
    if (val == null) return undefined;
    if (isNaN(val) || val < 0 || !isFinite(val)) {
      warnings.push(`Invalid ${name} (${val}), discarding`);
      return undefined;
    }
    return val;
  };

  if (errors.length > 0) {
    return { isValid: false, warnings, errors };
  }

  const sanitized: NormalizedSubscriptionPayload = {
    companySlug: sub.companySlug,
    providerId: sub.providerId,
    qibSubscription: validateSubscriptionMultiplier(sub.qibSubscription, 'qibSubscription'),
    niiSubscription: validateSubscriptionMultiplier(sub.niiSubscription, 'niiSubscription'),
    bNiiSubscription: validateSubscriptionMultiplier(sub.bNiiSubscription, 'bNiiSubscription'),
    sNiiSubscription: validateSubscriptionMultiplier(sub.sNiiSubscription, 'sNiiSubscription'),
    retailSubscription: validateSubscriptionMultiplier(sub.retailSubscription, 'retailSubscription'),
    employeeSubscription: validateSubscriptionMultiplier(sub.employeeSubscription, 'employeeSubscription'),
    shareholderSubscription: validateSubscriptionMultiplier(sub.shareholderSubscription, 'shareholderSubscription'),
    totalSubscription: sub.totalSubscription,
    snapshotTimestamp: sub.snapshotTimestamp || new Date(),
  };

  return {
    isValid: true,
    data: sanitized,
    warnings,
    errors,
  };
}
