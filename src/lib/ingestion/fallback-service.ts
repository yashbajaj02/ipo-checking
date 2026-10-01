import {
  ExternalIpoProviderAdapter,
  ProviderQuotaExceededError,
  IngestionCycleResult,
} from './types';
import { IpoAlertsProviderAdapter } from './adapters/ipo-alerts';
import { IpoGuruProviderAdapter } from './adapters/ipo-guru';
import { UpstoxIpoProviderAdapter } from './adapters/upstox';
import { saveIngestionDataToNeon, recordIngestionFailureLog } from './storage';
import { usageTracker, ProviderUsageReport } from './usage-tracker';
import { recalculateAllIpoActionScores } from '@/lib/services/ipo-action-engine';
import { db, isDatabaseConfigured } from '@/db';
import { ipos } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { cleanupExpiredIpoData } from '@/lib/data/retention';

export interface QuotaLockoutInfo {
  providerId: string;
  resetAt: Date;
  reason: string;
  statusCode?: number;
}

export interface IngestionOptions {
  mode?: 'full' | 'static' | 'dynamic' | 'cleanup';
  resetQuotaBeforeRun?: boolean;
}

/**
 * ==============================================================================
 * CENTRALIZED MULTI-PROVIDER ACTIVE INGESTION SERVICE
 * ==============================================================================
 * Architectural Invariants:
 * 1. Both IPO Alerts and IPO Guru are ACTIVE, co-equal data providers.
 * 2. NO global Primary/Fallback hierarchy exists; neither provider blocks the other.
 * 3. In every ingestion cycle, all configured and un-locked providers are executed.
 * 4. Field-level responsibilities:
 *    - IPO Alerts: Basic catalog, symbols, category, status, price bands, lot size,
 *      min investment, issue size, timeline dates, logos, RHP/DRHP links.
 *    - IPO Guru: GMP (amount, %, history), Subscriptions (QIB, NII, Retail, Total),
 *      Face Value, Fresh Issue, OFS, Registrar, and Listing Price.
 * 5. Non-destructive merger preserves existing valid Neon data and historical snapshots.
 * 6. Individual provider failure affects only that provider's fields; the other provider's
 *    data is still processed and persisted cleanly.
 * ==============================================================================
 */
export class FallbackProviderService {
  private readonly ipoAlerts: IpoAlertsProviderAdapter;
  private readonly ipoGuru: IpoGuruProviderAdapter;
  private readonly upstox: UpstoxIpoProviderAdapter;

  constructor() {
    this.ipoAlerts = new IpoAlertsProviderAdapter();
    this.ipoGuru = new IpoGuruProviderAdapter();
    this.upstox = new UpstoxIpoProviderAdapter();
  }

  /**
   * Check whether a provider is currently locked out or out of quota.
   */
  public isProviderLocked(providerId: string): boolean {
    return !usageTracker.hasQuota(providerId);
  }

  /**
   * Lock a provider for its rate limit / quota window.
   */
  public lockProvider(providerId: string, resetAt: Date, reason: string): void {
    usageTracker.lockProvider(providerId, resetAt, reason);
  }

  /**
   * Reset quota lockout manually.
   */
  public resetLockout(providerId?: string): void {
    usageTracker.resetLockout(providerId);
  }

  /**
   * Retrieve current status of all providers, usage counters, and active quota lockouts.
   */
  public getProviderStatusReport(): {
    activeProvider: string;
    date: string;
    providers: Record<string, ProviderUsageReport>;
  } {
    return usageTracker.getUsageReport('ipo_alerts, ipo_guru');
  }

  /**
   * Returns active external provider adapters.
   */
  public determineActiveProvider(): ExternalIpoProviderAdapter {
    return this.ipoAlerts;
  }

  /**
   * Execute a backend ingestion cycle with mode-based static/dynamic field separation.
   */
  public async executeIngestionCycle(options?: IngestionOptions): Promise<IngestionCycleResult> {
    const mode = options?.mode || 'full';

    if (options?.resetQuotaBeforeRun) {
      this.resetLockout();
    }

    if (mode === 'cleanup') {
      const cleanupResult = await cleanupExpiredIpoData();
      return {
        success: true,
        providerUsed: 'none',
        fallbackOccurred: false,
        recordsProcessed: cleanupResult.deletedCount,
        timestamp: new Date(),
        details: { mode: 'cleanup', deletedCount: cleanupResult.deletedCount },
      };
    }

    const fetchedAt = new Date();
    const succeededProviders: string[] = [];
    const failedProviders: string[] = [];
    const detailsMap: Record<string, unknown> = { mode };
    let totalRecordsProcessed = 0;

    // --------------------------------------------------------------------------
    // DYNAMIC MODE PRE-CHECK: Check if there are active OPEN IPOs
    // --------------------------------------------------------------------------
    if (mode === 'dynamic' && isDatabaseConfigured()) {
      let hasActiveOpenIpos = true;
      try {
        const openList = await db
          .select({ id: ipos.id })
          .from(ipos)
          .where(eq(ipos.status, 'OPEN'));
        hasActiveOpenIpos = openList.length > 0;
      } catch (err) {
        console.warn('[Ingestion] Open IPO count query warning:', err);
        hasActiveOpenIpos = true;
      }

      if (!hasActiveOpenIpos) {
        return {
          success: true,
          providerUsed: 'none',
          fallbackOccurred: false,
          recordsProcessed: 0,
          timestamp: fetchedAt,
          details: {
            mode: 'dynamic',
            skipped: true,
            reason: 'No active OPEN IPOs found in database. Dynamic API fetch skipped to preserve quota.',
          },
        };
      }
    }

    // --------------------------------------------------------------------------
    // 1. EXECUTE IPO ALERTS (Active Provider - Static / Full mode only)
    // --------------------------------------------------------------------------
    const shouldRunAlerts = mode === 'full' || mode === 'static';

    if (shouldRunAlerts && this.ipoAlerts.isConfigured() && usageTracker.hasQuota(this.ipoAlerts.providerId)) {
      try {
        const [iposList, gmpData, subscriptionData] = await Promise.all([
          this.ipoAlerts.fetchIpos(),
          this.ipoAlerts.fetchGmpData(),
          this.ipoAlerts.fetchSubscriptionData(),
        ]);

        if (iposList && iposList.length > 0) {
          const saveResult = await saveIngestionDataToNeon({
            providerId: this.ipoAlerts.providerId,
            providerName: this.ipoAlerts.providerName,
            ipos: iposList,
            gmpData,
            subscriptionData,
            fetchedAt,
          });

          if (saveResult.savedToDatabase) {
            succeededProviders.push(this.ipoAlerts.providerId);
            totalRecordsProcessed += iposList.length;
            detailsMap.ipoAlerts = {
              status: 'success',
              recordsProcessed: iposList.length,
            };
          }
        } else {
          failedProviders.push(this.ipoAlerts.providerId);
          detailsMap.ipoAlerts = { status: 'empty', reason: 'Returned 0 IPO records' };
        }
      } catch (err) {
        const isRateLimit =
          err instanceof ProviderQuotaExceededError ||
          (err instanceof Error && (err.message.includes('429') || err.message.includes('quota')));
        const statusCode =
          err instanceof ProviderQuotaExceededError
            ? err.statusCode
            : isRateLimit
            ? 429
            : 500;

        if (isRateLimit) {
          const resetAt =
            err instanceof ProviderQuotaExceededError
              ? err.resetAt
              : new Date(Date.now() + 60 * 60 * 1000);
          this.lockProvider(
            this.ipoAlerts.providerId,
            resetAt,
            err instanceof Error ? err.message : 'Quota exceeded'
          );
        }

        await recordIngestionFailureLog({
          providerId: this.ipoAlerts.providerId,
          providerName: this.ipoAlerts.providerName,
          error: err instanceof Error ? err.message : String(err),
          statusCode,
          rateLimited: isRateLimit,
          attemptedAt: fetchedAt,
        });

        failedProviders.push(this.ipoAlerts.providerId);
        detailsMap.ipoAlerts = {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    } else {
      const reason = !shouldRunAlerts
        ? 'Skipped in 30-min dynamic mode'
        : !this.ipoAlerts.isConfigured()
        ? 'API key not configured'
        : 'Quota lockout active';
      failedProviders.push(this.ipoAlerts.providerId);
      detailsMap.ipoAlerts = { status: 'skipped', reason };
    }

    // --------------------------------------------------------------------------
    // 2. EXECUTE IPO GURU (Active Provider - Static, Dynamic, or Full mode)
    // --------------------------------------------------------------------------
    if (this.ipoGuru.isConfigured() && usageTracker.hasQuota(this.ipoGuru.providerId)) {
      try {
        const fetchIposPromise = mode === 'dynamic' ? Promise.resolve([]) : this.ipoGuru.fetchIpos();
        const fetchGmpPromise = mode === 'static' ? Promise.resolve([]) : this.ipoGuru.fetchGmpData();
        const fetchSubPromise = mode === 'static' ? Promise.resolve([]) : this.ipoGuru.fetchSubscriptionData();

        const [iposList, gmpData, subscriptionData] = await Promise.all([
          fetchIposPromise,
          fetchGmpPromise,
          fetchSubPromise,
        ]);

        const hasPayload = (iposList && iposList.length > 0) || (gmpData && gmpData.length > 0) || (subscriptionData && subscriptionData.length > 0);

        if (hasPayload) {
          const saveResult = await saveIngestionDataToNeon({
            providerId: this.ipoGuru.providerId,
            providerName: this.ipoGuru.providerName,
            ipos: iposList,
            gmpData,
            subscriptionData,
            fetchedAt,
          });

          if (saveResult.savedToDatabase) {
            succeededProviders.push(this.ipoGuru.providerId);
            totalRecordsProcessed = Math.max(totalRecordsProcessed, iposList.length || gmpData.length || subscriptionData.length);
            detailsMap.ipoGuru = {
              status: 'success',
              recordsProcessed: iposList.length,
              gmpCount: gmpData.length,
              subsCount: subscriptionData.length,
            };
          }
        } else {
          failedProviders.push(this.ipoGuru.providerId);
          detailsMap.ipoGuru = { status: 'empty', reason: 'Returned 0 records' };
        }
      } catch (guruErr) {
        const isGuruRateLimit =
          guruErr instanceof ProviderQuotaExceededError ||
          (guruErr instanceof Error && (guruErr.message.includes('429') || guruErr.message.includes('quota')));
        const guruStatusCode =
          guruErr instanceof ProviderQuotaExceededError
            ? guruErr.statusCode
            : isGuruRateLimit
            ? 429
            : 500;

        if (isGuruRateLimit) {
          const resetAt =
            guruErr instanceof ProviderQuotaExceededError
              ? guruErr.resetAt
              : new Date(Date.now() + 60 * 1000);
          this.lockProvider(
            this.ipoGuru.providerId,
            resetAt,
            guruErr instanceof Error ? guruErr.message : 'Quota exceeded'
          );
        }

        await recordIngestionFailureLog({
          providerId: this.ipoGuru.providerId,
          providerName: this.ipoGuru.providerName,
          error: guruErr instanceof Error ? guruErr.message : String(guruErr),
          statusCode: guruStatusCode,
          rateLimited: isGuruRateLimit,
          attemptedAt: fetchedAt,
        });

        failedProviders.push(this.ipoGuru.providerId);
        detailsMap.ipoGuru = {
          status: 'error',
          error: guruErr instanceof Error ? guruErr.message : String(guruErr),
        };
      }
    } else {
      const reason = !this.ipoGuru.isConfigured()
        ? 'API key not configured'
        : 'Quota lockout active';
      failedProviders.push(this.ipoGuru.providerId);
      detailsMap.ipoGuru = { status: 'skipped', reason };
    }

    // --------------------------------------------------------------------------
    // 3. POST-INGESTION ACTION SCORE RECALCULATION & RESULT SYNTHESIS
    // --------------------------------------------------------------------------
    if (succeededProviders.length > 0) {
      recalculateAllIpoActionScores().catch((err) =>
        console.warn('[ActionEngine] Post-ingestion recalculation error:', err)
      );

      return {
        success: true,
        providerUsed: succeededProviders.join(', '),
        fallbackOccurred: false,
        recordsProcessed: totalRecordsProcessed,
        timestamp: fetchedAt,
        details: {
          succeededProviders,
          failedProviders,
          ...detailsMap,
        },
      };
    }

    return {
      success: false,
      providerUsed: 'none',
      fallbackOccurred: false,
      fallbackReason: 'All active external providers failed or are locked out. Preserving last valid Neon snapshot.',
      recordsProcessed: 0,
      timestamp: fetchedAt,
      details: {
        succeededProviders,
        failedProviders,
        ...detailsMap,
      },
    };
  }
}

// Global Singleton Instance
export const fallbackService = new FallbackProviderService();
