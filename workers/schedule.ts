export interface ScheduledEvent {
  cron: string;
  type: string;
  scheduledTime: number;
}

export type ScheduledMode = 'full' | 'static' | 'dynamic' | 'cleanup';

export interface ScheduledEvaluation {
  mode: ScheduledMode;
  utcHours: number;
  utcMinutes: number;
  utcTimeFormatted: string;
}

/**
 * Maps a Cloudflare Scheduled Event to an ingestion mode.
 *
 * Rules:
 * - At 02:00 UTC -> 'full' ingestion mode
 * - At 14:00 UTC -> 'full' ingestion mode
 * - Every other 30-minute execution -> 'dynamic' ingestion mode
 * - Legacy cron pattern overrides and cleanup are preserved
 */
export function determineScheduledMode(event: ScheduledEvent): ScheduledEvaluation {
  const cron = event.cron;
  const scheduledDate = typeof event.scheduledTime === 'number' ? new Date(event.scheduledTime) : new Date();
  const utcHours = scheduledDate.getUTCHours();
  const utcMinutes = scheduledDate.getUTCMinutes();

  let mode: ScheduledMode = 'dynamic';

  if (cron === 'test' || cron === 'cleanup') {
    mode = 'cleanup';
  } else if (
    cron === '0 2 * * *' ||
    cron === '0 14 * * *' ||
    cron === '0 2,14 * * *' ||
    ((utcHours === 2 || utcHours === 14) && utcMinutes === 0)
  ) {
    mode = 'full';
  } else {
    mode = 'dynamic';
  }

  const utcTimeFormatted = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`;
  return {
    mode,
    utcHours,
    utcMinutes,
    utcTimeFormatted,
  };
}
