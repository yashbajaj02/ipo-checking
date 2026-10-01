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
 * - At 02:00 UTC window (01:55 - 02:20 UTC) -> 'full' ingestion mode
 * - At 14:00 UTC window (13:55 - 14:20 UTC) -> 'full' ingestion mode
 * - Every other 30-minute execution -> 'dynamic' ingestion mode
 * - Legacy cron pattern overrides and cleanup are preserved
 */
export function determineScheduledMode(event: ScheduledEvent): ScheduledEvaluation {
  const cron = event.cron;
  const timeNum =
    typeof event.scheduledTime === 'number' && !isNaN(event.scheduledTime)
      ? event.scheduledTime < 1e11
        ? event.scheduledTime * 1000
        : event.scheduledTime
      : Date.now();
  const scheduledDate = new Date(timeNum);
  const utcHours = scheduledDate.getUTCHours();
  const utcMinutes = scheduledDate.getUTCMinutes();

  let mode: ScheduledMode = 'dynamic';

  if (cron === 'test' || cron === 'cleanup') {
    mode = 'cleanup';
  } else if (
    cron === '0 2 * * *' ||
    cron === '0 14 * * *' ||
    cron === '0 2,14 * * *' ||
    cron === 'full' ||
    cron === 'static'
  ) {
    mode = 'full';
  } else {
    // Total minutes since UTC midnight: [0, 1439]
    const totalMinutes = utcHours * 60 + utcMinutes;

    // 02:00 UTC window (target: 120m). Tolerates drift from 01:55 to 02:20 UTC (115m - 140m).
    // The next scheduled run is at 02:30 UTC (150m), which is dynamic.
    const is0200Window = totalMinutes >= 115 && totalMinutes <= 140;

    // 14:00 UTC window (target: 840m). Tolerates drift from 13:55 to 14:20 UTC (835m - 860m).
    // The next scheduled run is at 14:30 UTC (870m), which is dynamic.
    const is1400Window = totalMinutes >= 835 && totalMinutes <= 860;

    if (is0200Window || is1400Window) {
      mode = 'full';
    } else {
      mode = 'dynamic';
    }
  }

  const utcTimeFormatted = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`;
  return {
    mode,
    utcHours,
    utcMinutes,
    utcTimeFormatted,
  };
}

