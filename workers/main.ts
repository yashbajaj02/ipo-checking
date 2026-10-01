// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import openNextHandler from '../.open-next/worker.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export * from '../.open-next/worker.js';

export * from './schedule';
import { determineScheduledMode, ScheduledEvent, ScheduledMode } from './schedule';

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface WorkerEnv {
  CRON_SECRET?: string;
  DATABASE_URL?: string;
  IPO_ALERTS_KEY?: string;
  IPO_GURU_KEY?: string;
  UPSTOX_ANALYTICS_TOKEN?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GEMINI_API_KEY?: string;
  PAN_ENCRYPTION_KEY?: string;
  [key: string]: unknown;
}

/**
 * Handle Cloudflare Scheduled (Cron) Events.
 *
 * Supported crons & schedule evaluation:
 * - Single cron trigger: "*\/30 * * * *"
 * - Evaluated against scheduled UTC time:
 *   - At 02:00 UTC -> full static + dynamic sync
 *   - At 14:00 UTC -> full static + dynamic sync
 *   - All other 30-minute intervals -> dynamic pricing/GMP sync
 * - Also supports legacy/test cron representations ("0 2 * * *", "0 14 * * *", "cleanup", "test")
 *
 * Dispatches an in-process request directly to the Next.js internal /api/ingest/trigger route,
 * preserving CRON_SECRET authentication and all provider fallback/retention logic
 * without requiring any external network HTTP calls.
 */
export async function handleScheduledEvent(
  event: ScheduledEvent,
  env: WorkerEnv,
  ctx: ExecutionContext
): Promise<Response> {
  const { mode, utcTimeFormatted } = determineScheduledMode(event);
  const cron = event.cron;

  console.log(`[Worker Scheduled] Received cron trigger "${cron}" scheduled for ${utcTimeFormatted}, mapped execution mode to: "${mode}"`);

  const cronSecret = env.CRON_SECRET || (typeof process !== 'undefined' ? process.env?.CRON_SECRET : '') || '';

  const internalUrl = 'http://localhost/api/ingest/trigger';
  const request = new Request(internalUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cronSecret}`,
      'x-cron-source': 'cloudflare-worker-scheduled',
      'x-cron-trigger': cron,
    },
    body: JSON.stringify({ mode, source: 'cloudflare-scheduled' }),
  });

  return (openNextHandler as { fetch: (req: Request, env: unknown, ctx: ExecutionContext) => Promise<Response> }).fetch(
    request,
    env,
    ctx
  );
}

const workerHandler = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    return (openNextHandler as { fetch: (req: Request, env: unknown, ctx: ExecutionContext) => Promise<Response> }).fetch(
      request,
      env,
      ctx
    );
  },

  async scheduled(event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      handleScheduledEvent(event, env, ctx).catch((err) => {
        console.error('[Worker Scheduled Error]:', err);
      })
    );
  },
};

export default workerHandler;
