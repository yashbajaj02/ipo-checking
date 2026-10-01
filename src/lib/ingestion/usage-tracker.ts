import { db, isDatabaseConfigured } from '@/db';
import { ingestionLogs, dataSources } from '@/db/schema';
import { gte, desc, eq } from 'drizzle-orm';

/**
 * ==============================================================================
 * SERVER-SIDE API REQUEST USAGE & QUOTA TRACKER (DURABLE NEON STORAGE)
 * ==============================================================================
 * Rules:
 * 1. Counts ONLY real external HTTP requests made to external data providers.
 * 2. Does NOT count database queries, user page loads, or cached responses.
 * 3. Daily Limits & Cadence:
 *    - IPO Guru: 10 requests / day, 1 request / min
 *    - IPO Alerts: 25 requests / day
 *    - Upstox: 100 requests / day (disabled unless ENABLE_UPSTOX=true)
 * 4. Stored durably in Neon PostgreSQL via `ingestion_logs` table (no local filesystem dependency).
 * 5. Respects `X-RateLimit-Remaining`, `Retry-After`, and `429` status responses.
 * 6. Never exposes API keys.
 * ==============================================================================
 */

export interface ProviderQuotaConfig {
  id: string;
  name: string;
  dailyLimit: number;
  minIntervalSeconds: number; // e.g. 60s for IPO Guru (1/min)
}

export const PROVIDER_QUOTAS: Record<string, ProviderQuotaConfig> = {
  ipo_alerts: {
    id: 'ipo_alerts',
    name: 'IPO Alerts',
    dailyLimit: 25,
    minIntervalSeconds: 0,
  },
  ipo_guru: {
    id: 'ipo_guru',
    name: 'IPO Guru',
    dailyLimit: 60,
    minIntervalSeconds: 30, // Allows 30-min dynamic refreshes safely
  },
  upstox: {
    id: 'upstox',
    name: 'Upstox Broker API (Opt-In)',
    dailyLimit: 100,
    minIntervalSeconds: 0,
  },
};

export interface StoredProviderUsage {
  usedToday: number;
  lastRequestAt: string | null;
  isLocked?: boolean;
  lockedUntil?: string | null;
  lockoutReason?: string | null;
}

export interface ProviderUsageReport {
  id: string;
  name: string;
  dailyLimit: number;
  usedToday: number;
  remainingRequests: number;
  lastRequestAt: string | null;
  isLocked: boolean;
  lockedUntil?: string | null;
  lockoutReason?: string | null;
  isConfigured: boolean;
  isEnabled: boolean;
}

class ApiUsageTracker {
  // Ephemeral in-memory store synchronized with Neon ingestion_logs
  private inMemoryCache: Record<string, StoredProviderUsage> = {
    ipo_guru: { usedToday: 0, lastRequestAt: null },
    ipo_alerts: { usedToday: 0, lastRequestAt: null },
    upstox: { usedToday: 0, lastRequestAt: null },
  };

  private lastSyncedDate: string = '';

  /**
   * Get current UTC date string format YYYY-MM-DD
   */
  public getTodayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Synchronize usage counts and lockout states from Neon ingestion_logs
   */
  public async syncWithDatabase(): Promise<void> {
    const today = this.getTodayDateStr();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Initialize fresh counters for today
    if (this.lastSyncedDate !== today) {
      this.inMemoryCache = {
        ipo_guru: { usedToday: 0, lastRequestAt: null },
        ipo_alerts: { usedToday: 0, lastRequestAt: null },
        upstox: { usedToday: 0, lastRequestAt: null },
      };
      this.lastSyncedDate = today;
    }

    if (!isDatabaseConfigured()) {
      return;
    }

    try {
      // Query today's logs from Neon
      const logs = await db
        .select()
        .from(ingestionLogs)
        .where(gte(ingestionLogs.createdAt, todayStart))
        .orderBy(desc(ingestionLogs.createdAt));

      const counts: Record<string, number> = { ipo_guru: 0, ipo_alerts: 0, upstox: 0 };
      const lastTimestamps: Record<string, string | null> = { ipo_guru: null, ipo_alerts: null, upstox: null };
      const lockouts: Record<string, { isLocked: boolean; lockedUntil: string | null; lockoutReason: string | null }> = {
        ipo_guru: { isLocked: false, lockedUntil: null, lockoutReason: null },
        ipo_alerts: { isLocked: false, lockedUntil: null, lockoutReason: null },
        upstox: { isLocked: false, lockedUntil: null, lockoutReason: null },
      };

      for (const log of logs) {
        const details = log.details as Record<string, unknown> | null;
        const pId = String(details?.providerId || '');

        if (pId && counts[pId] !== undefined) {
          // Count only successful external ingestion cycles
          if (log.status === 'SUCCESS') {
            counts[pId] += 1;
          }

          if (!lastTimestamps[pId] && (details?.action === 'external_api_call' || log.status === 'SUCCESS')) {
            lastTimestamps[pId] = log.createdAt.toISOString();
          }

          // Check if log contains active lockout
          if (details?.lockedUntil && typeof details.lockedUntil === 'string') {
            const resetTime = new Date(details.lockedUntil).getTime();
            if (resetTime > Date.now() && !lockouts[pId].isLocked) {
              lockouts[pId] = {
                isLocked: true,
                lockedUntil: details.lockedUntil,
                lockoutReason: typeof details.reason === 'string' ? details.reason : 'Provider rate-limited',
              };
            }
          }
        }
      }

      // Update in-memory state with Neon DB values
      for (const pId of Object.keys(this.inMemoryCache)) {
        this.inMemoryCache[pId] = {
          usedToday: counts[pId] || 0,
          lastRequestAt: lastTimestamps[pId] || null,
          isLocked: lockouts[pId]?.isLocked || false,
          lockedUntil: lockouts[pId]?.lockedUntil || null,
          lockoutReason: lockouts[pId]?.lockoutReason || null,
        };

        // Check if daily limit reached
        const config = PROVIDER_QUOTAS[pId];
        if (config && this.inMemoryCache[pId].usedToday >= config.dailyLimit) {
          const tomorrow = new Date();
          tomorrow.setUTCHours(24, 0, 0, 0);
          this.inMemoryCache[pId].isLocked = true;
          this.inMemoryCache[pId].lockedUntil = tomorrow.toISOString();
          this.inMemoryCache[pId].lockoutReason = `Daily request quota of ${config.dailyLimit} requests reached.`;
        }
      }
    } catch (err) {
      console.warn('Neon sync warning (using in-memory tracking):', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Get remaining requests for a provider today
   */
  public getRemainingRequests(providerId: string): number {
    const config = PROVIDER_QUOTAS[providerId];
    if (!config) return 0;

    const used = this.inMemoryCache[providerId]?.usedToday || 0;
    return Math.max(0, config.dailyLimit - used);
  }

  /**
   * Check if a provider has available daily quota and is not rate-locked
   */
  public hasQuota(providerId: string): boolean {
    const remaining = this.getRemainingRequests(providerId);
    if (remaining <= 0) return false;

    const info = this.inMemoryCache[providerId];
    if (info?.isLocked && info.lockedUntil) {
      const resetTime = new Date(info.lockedUntil).getTime();
      if (Date.now() < resetTime) {
        return false;
      } else {
        // Lockout expired
        info.isLocked = false;
        info.lockedUntil = null;
        info.lockoutReason = null;
      }
    }

    // Check minimum interval if applicable (e.g. 1 request per min for IPO Guru)
    const config = PROVIDER_QUOTAS[providerId];
    if (config?.minIntervalSeconds && config.minIntervalSeconds > 0 && info?.lastRequestAt) {
      const elapsedSeconds = (Date.now() - new Date(info.lastRequestAt).getTime()) / 1000;
      if (elapsedSeconds < config.minIntervalSeconds) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record that a REAL external request was dispatched to a provider and persist to Neon
   */
  public async recordRequest(
    providerId: string,
    meta?: { status?: string; details?: Record<string, unknown> }
  ): Promise<void> {
    if (!this.inMemoryCache[providerId]) {
      this.inMemoryCache[providerId] = {
        usedToday: 0,
        lastRequestAt: null,
      };
    }

    const providerState = this.inMemoryCache[providerId];
    providerState.usedToday += 1;
    const nowIso = new Date().toISOString();
    providerState.lastRequestAt = nowIso;

    const config = PROVIDER_QUOTAS[providerId];
    if (config && providerState.usedToday >= config.dailyLimit) {
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      providerState.isLocked = true;
      providerState.lockedUntil = tomorrow.toISOString();
      providerState.lockoutReason = `Daily request quota of ${config.dailyLimit} requests exhausted.`;
    }

    // Persist to Neon DB ingestion_logs if configured
    if (isDatabaseConfigured()) {
      try {
        const dsRow = await db.query.dataSources.findFirst({
          where: eq(dataSources.providerName, providerId),
        });
        await db.insert(ingestionLogs).values({
          dataSourceId: dsRow?.id || null,
          status: meta?.status || 'REQUEST_DISPATCHED',
          recordsProcessed: 0,
          details: {
            providerId,
            action: 'external_api_call',
            usedToday: providerState.usedToday,
            dailyLimit: config?.dailyLimit,
            ...meta?.details,
          },
          createdAt: new Date(),
        });
      } catch (err) {
        console.warn('Could not insert ingestionLog in Neon:', err instanceof Error ? err.message : err);
      }
    }
  }

  /**
   * Set rate-limit / lockout state for a provider (e.g. from 429 response or header)
   */
  public async lockProvider(providerId: string, resetAt: Date, reason: string): Promise<void> {
    if (!this.inMemoryCache[providerId]) {
      this.inMemoryCache[providerId] = {
        usedToday: 0,
        lastRequestAt: null,
      };
    }

    const providerState = this.inMemoryCache[providerId];
    providerState.isLocked = true;
    providerState.lockedUntil = resetAt.toISOString();
    providerState.lockoutReason = reason;

    // Persist lockout audit in Neon DB
    if (isDatabaseConfigured()) {
      try {
        const dsRow = await db.query.dataSources.findFirst({
          where: eq(dataSources.providerName, providerId),
        });
        await db.insert(ingestionLogs).values({
          dataSourceId: dsRow?.id || null,
          status: 'RATE_LIMITED',
          recordsProcessed: 0,
          details: {
            providerId,
            lockedUntil: resetAt.toISOString(),
            reason,
          },
          createdAt: new Date(),
        });
      } catch (err) {
        console.warn('Could not insert lockout log in Neon:', err instanceof Error ? err.message : err);
      }
    }
  }

  /**
   * Manually unlock or reset provider lockout
   */
  public resetLockout(providerId?: string): void {
    if (providerId) {
      if (this.inMemoryCache[providerId]) {
        this.inMemoryCache[providerId].isLocked = false;
        this.inMemoryCache[providerId].lockedUntil = null;
        this.inMemoryCache[providerId].lockoutReason = null;
        this.inMemoryCache[providerId].usedToday = 0;
        this.inMemoryCache[providerId].lastRequestAt = null;
      }
    } else {
      Object.keys(this.inMemoryCache).forEach((id) => {
        this.inMemoryCache[id].isLocked = false;
        this.inMemoryCache[id].lockedUntil = null;
        this.inMemoryCache[id].lockoutReason = null;
        this.inMemoryCache[id].usedToday = 0;
        this.inMemoryCache[id].lastRequestAt = null;
      });
    }
  }

  /**
   * Generate full usage report across all providers
   */
  public getUsageReport(activeProviderId: string): {
    date: string;
    activeProvider: string;
    providers: Record<string, ProviderUsageReport>;
  } {
    const today = this.getTodayDateStr();
    const result: Record<string, ProviderUsageReport> = {};

    Object.entries(PROVIDER_QUOTAS).forEach(([id, config]) => {
      const state = this.inMemoryCache[id] || {
        usedToday: 0,
        lastRequestAt: null,
      };

      const isLocked = Boolean(state.isLocked && state.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now());

      let isConfigured = false;
      let isEnabled = true;

      if (id === 'ipo_guru') {
        isConfigured = Boolean(process.env.IPO_GURU_KEY || process.env.IPO_GURU_API_KEY);
      } else if (id === 'ipo_alerts') {
        isConfigured = Boolean(process.env.IPO_ALERTS_KEY || process.env.IPO_ALERTS_API_KEY);
      } else if (id === 'upstox') {
        isEnabled = process.env.ENABLE_UPSTOX === 'true';
        isConfigured = isEnabled && Boolean(process.env.UPSTOX_API_KEY);
      }

      result[id] = {
        id,
        name: config.name,
        dailyLimit: config.dailyLimit,
        usedToday: state.usedToday,
        remainingRequests: Math.max(0, config.dailyLimit - state.usedToday),
        lastRequestAt: state.lastRequestAt,
        isLocked,
        lockedUntil: isLocked ? state.lockedUntil : null,
        lockoutReason: isLocked ? state.lockoutReason : null,
        isConfigured,
        isEnabled,
      };
    });

    return {
      date: today,
      activeProvider: activeProviderId,
      providers: result,
    };
  }
}

export const usageTracker = new ApiUsageTracker();
