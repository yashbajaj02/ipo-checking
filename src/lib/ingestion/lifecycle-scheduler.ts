/**
 * ==============================================================================
 * LIFECYCLE-BASED DATA REFRESH ARCHITECTURE
 * ==============================================================================
 * Implements granular, lifecycle-aware refresh rules:
 *
 * 1. NEW IPO:
 *    - Discovered via provider feed -> Initial complete full fetch -> Validate -> Neon.
 * 2. ACTIVE / OPEN IPO:
 *    - Frequent dynamic refresh only (GMP, GMP %, QIB, NII, Retail, Total Subscription).
 *    - Static fields (logo, registrar, face value, lot size, issue size) are NOT repeatedly fetched.
 * 3. EVENT DAY / DATA CHANGE:
 *    - When IST today matches offerStartDate, offerEndDate, allotmentDate, creditDate, or listingDate:
 *      Perform targeted static/event re-fetch.
 * 4. LISTED IPO:
 *    - Once final listing results (listingPrice, listingGainPercent, listedDate) are recorded:
 *      Stop frequent polling for that IPO.
 * ==============================================================================
 */

import { NormalizedGmpPayload, NormalizedSubscriptionPayload } from './types';
import { getCurrentDateInIST } from '../utils';

export type IpoRefreshCategory = 'NEW' | 'DYNAMIC_ACTIVE' | 'EVENT_TARGETED' | 'LISTED_COMPLETED';

export interface IpoLifecycleContext {
  id: string;
  slug: string;
  status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'LISTED';
  offerStartDate?: string;
  offerEndDate?: string;
  allotmentDate?: string;
  creditDate?: string;
  listingDate?: string;
  hasFinalListingResult: boolean;
  lastUpdated?: Date;
}

export class IpoLifecycleScheduler {
  /**
   * Determine the refresh requirement for an IPO given its current state and IST today.
   */
  public static categorizeIpo(context: IpoLifecycleContext): IpoRefreshCategory {
    // 1. Listed and final listing result is already safely captured
    if (context.status === 'LISTED' && context.hasFinalListingResult) {
      return 'LISTED_COMPLETED';
    }

    const todayIST = getCurrentDateInIST();

    // 2. Check if today is a critical lifecycle event day
    const isEventDay =
      context.offerStartDate === todayIST ||
      context.offerEndDate === todayIST ||
      context.allotmentDate === todayIST ||
      context.creditDate === todayIST ||
      context.listingDate === todayIST;

    if (isEventDay) {
      return 'EVENT_TARGETED';
    }

    // 3. Active / Open IPOs (or Upcoming within 3 days)
    if (context.status === 'OPEN' || context.status === 'UPCOMING') {
      return 'DYNAMIC_ACTIVE';
    }

    // 4. Closed IPO awaiting allotment / listing
    if (context.status === 'CLOSED') {
      return 'EVENT_TARGETED';
    }

    return 'DYNAMIC_ACTIVE';
  }

  /**
   * Filters an array of incoming GMP items, only refreshing IPOs that are not already listed & completed.
   */
  public static filterGmpForPolling(
    gmpList: NormalizedGmpPayload[],
    completedSlugs: Set<string>
  ): NormalizedGmpPayload[] {
    return gmpList.filter((item) => !completedSlugs.has(item.companySlug));
  }

  /**
   * Filters an array of incoming subscription items, excluding listed & finalized IPOs.
   */
  public static filterSubscriptionForPolling(
    subsList: NormalizedSubscriptionPayload[],
    completedSlugs: Set<string>
  ): NormalizedSubscriptionPayload[] {
    return subsList.filter((item) => !completedSlugs.has(item.companySlug));
  }
}
