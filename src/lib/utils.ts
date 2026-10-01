import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a single YYYY-MM-DD or ISO date into "DD Mon YYYY" or "DD Mon"
 */
export function formatDisplayDate(str?: string | null, includeYear = true): string {
  if (!str) return '—';
  try {
    const cleanDate = str.includes('T') ? str.split('T')[0] : str.trim();
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const year = parts[0];
      if (!isNaN(day) && months[mIdx]) {
        return includeYear ? `${day} ${months[mIdx]} ${year}` : `${day} ${months[mIdx]}`;
      }
    }
    return str;
  } catch {
    return str;
  }
}

/**
 * Format date as "Day, DD Mon YYYY" e.g. "Wed, 23 Sep 2026"
 */
export function formatTimelineDate(str?: string | null): string {
  if (!str) return '—';
  try {
    const clean = str.includes('T') ? str.split('T')[0] : str.trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayOfWeek = days[dateObj.getDay()];
      const monthName = months[m];
      if (dayOfWeek && monthName && !isNaN(d)) {
        return `${dayOfWeek}, ${d} ${monthName} ${y}`;
      }
    }
    return formatDisplayDate(str);
  } catch {
    return formatDisplayDate(str);
  }
}


/**
 * Unified IPO Date Range Formatter
 * - "22 Sep - 24 Sep 2026" (when both open and close exist)
 * - "Opens 22 Sep 2026" (when only open exists)
 * - "Closes 24 Sep 2026" (when only close exists)
 * - "Listing 29 Sep 2026" (when only listing exists)
 * - "Schedule TBA" (when no dates exist)
 */
export function formatIpoDateRange(dates?: {
  offerStartDate?: string;
  offerEndDate?: string;
  listingDate?: string;
}): string {
  if (!dates) return 'Schedule TBA';

  const formatSingle = (str?: string) => {
    if (!str) return '';
    try {
      const cleanDate = str.includes('T') ? str.split('T')[0] : str.trim();
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(day) && months[mIdx]) {
          return `${day} ${months[mIdx]}`;
        }
      }
      return str;
    } catch {
      return str;
    }
  };

  const start = formatSingle(dates.offerStartDate);
  const end = formatSingle(dates.offerEndDate);
  const listing = formatSingle(dates.listingDate);
  const year =
    (dates.offerEndDate && dates.offerEndDate.split('-')[0]) ||
    (dates.offerStartDate && dates.offerStartDate.split('-')[0]) ||
    (dates.listingDate && dates.listingDate.split('-')[0]);

  if (start && end) return `${start} - ${end} ${year || ''}`.trim();
  if (end) return `Closes ${end} ${year || ''}`.trim();
  if (start) return `Opens ${start} ${year || ''}`.trim();
  if (listing) return `Listing ${listing} ${year || ''}`.trim();
  return 'Schedule TBA';
}

/**
 * Format IPO date range matching the screenshot format:
 * e.g. "Tue, 22 - Thu, 24 Sep 2026"
 */
export function formatCardDateRange(dates?: {
  offerStartDate?: string;
  offerEndDate?: string;
  listingDate?: string;
}): string {
  if (!dates) return 'Schedule TBA';

  const parseDateParts = (str?: string) => {
    if (!str) return null;
    try {
      const clean = str.includes('T') ? str.split('T')[0] : str.trim();
      const parts = clean.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayOfWeek = days[dateObj.getDay()] || '';
        const monthName = months[m] || '';
        return { dayOfWeek, day: d, monthName, year: y };
      }
    } catch {}
    return null;
  };

  const start = parseDateParts(dates.offerStartDate);
  const end = parseDateParts(dates.offerEndDate);

  if (start && end) {
    if (start.monthName === end.monthName && start.year === end.year) {
      return `${start.dayOfWeek}, ${start.day} - ${end.dayOfWeek}, ${end.day} ${end.monthName} ${end.year}`;
    }
    return `${start.dayOfWeek}, ${start.day} ${start.monthName} - ${end.dayOfWeek}, ${end.day} ${end.monthName} ${end.year}`;
  }
  if (start) {
    return `${start.dayOfWeek}, ${start.day} ${start.monthName} ${start.year}`;
  }
  if (end) {
    return `Closes ${end.dayOfWeek}, ${end.day} ${end.monthName} ${end.year}`;
  }
  if (dates.listingDate) {
    const list = parseDateParts(dates.listingDate);
    if (list) return `Listing ${list.dayOfWeek}, ${list.day} ${list.monthName} ${list.year}`;
  }
  return 'Schedule TBA';
}

/**
 * Sort IPO items strictly by validated open date ascending.
 * - Earliest valid open date first
 * - Secondary sort: close date ascending
 * - Missing open dates placed after valid open dates
 */
export function compareIpoByDateAsc(
  a: { companyName: string; dates?: { offerStartDate?: string; offerEndDate?: string } },
  b: { companyName: string; dates?: { offerStartDate?: string; offerEndDate?: string } }
): number {
  const aOpen = a.dates?.offerStartDate;
  const bOpen = b.dates?.offerStartDate;

  // Primary: actual validated open date ascending
  if (aOpen && bOpen) {
    const openDiff = aOpen.localeCompare(bOpen);
    if (openDiff !== 0) return openDiff;

    // Secondary: close date ascending
    const aClose = a.dates?.offerEndDate;
    const bClose = b.dates?.offerEndDate;
    if (aClose && bClose) {
      const closeDiff = aClose.localeCompare(bClose);
      if (closeDiff !== 0) return closeDiff;
    } else if (aClose && !bClose) {
      return -1;
    } else if (!aClose && bClose) {
      return 1;
    }

    return a.companyName.localeCompare(b.companyName);
  }

  // If open date is missing, place that IPO after IPOs with valid open dates
  if (aOpen && !bOpen) return -1;
  if (!aOpen && bOpen) return 1;

  // Both missing open date -> compare close dates ascending
  const aClose = a.dates?.offerEndDate;
  const bClose = b.dates?.offerEndDate;
  if (aClose && bClose) {
    const closeDiff = aClose.localeCompare(bClose);
    if (closeDiff !== 0) return closeDiff;
  } else if (aClose && !bClose) {
    return -1;
  } else if (!aClose && bClose) {
    return 1;
  }

  return a.companyName.localeCompare(b.companyName);
}

/**
 * Format numeric currency in Indian standard numbering
 */
export function formatCurrency(val?: number | string | null): string {
  if (val == null || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Format numeric multiples or counts
 */
export function formatNumber(val?: number | string | null, decimals = 2): string {
  if (val == null || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';
  return num.toFixed(decimals);
}

/**
 * Get current date string formatted in YYYY-MM-DD in Indian Standard Time (IST)
 */
export function getCurrentDateInIST(): string {
  const now = new Date();
  // IST offset: UTC + 5:30 (330 minutes)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}
