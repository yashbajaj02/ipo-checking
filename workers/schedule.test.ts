import test from 'node:test';
import assert from 'node:assert/strict';
import { determineScheduledMode, ScheduledEvent } from './schedule';

test('Scheduler: exact 02:00 UTC triggers full mode', () => {
  const event: ScheduledEvent = {
    cron: '*/30 * * * *',
    type: 'cron',
    scheduledTime: new Date('2026-10-01T02:00:00.000Z').getTime(),
  };

  const result = determineScheduledMode(event);
  assert.strictEqual(result.mode, 'full');
  assert.strictEqual(result.utcHours, 2);
  assert.strictEqual(result.utcMinutes, 0);
  assert.strictEqual(result.utcTimeFormatted, '02:00 UTC');
});

test('Scheduler: exact 14:00 UTC triggers full mode', () => {
  const event: ScheduledEvent = {
    cron: '*/30 * * * *',
    type: 'cron',
    scheduledTime: new Date('2026-10-01T14:00:00.000Z').getTime(),
  };

  const result = determineScheduledMode(event);
  assert.strictEqual(result.mode, 'full');
  assert.strictEqual(result.utcHours, 14);
  assert.strictEqual(result.utcMinutes, 0);
  assert.strictEqual(result.utcTimeFormatted, '14:00 UTC');
});

test('Scheduler: small execution-time drift around 02:00 UTC window triggers full mode', () => {
  const driftTestTimes = [
    '2026-10-01T01:58:00.000Z', // 2 minutes early
    '2026-10-01T01:59:30.000Z', // 30 seconds early
    '2026-10-01T02:00:30.000Z', // 30 seconds late
    '2026-10-01T02:01:15.000Z', // 75 seconds late
    '2026-10-01T02:05:00.000Z', // 5 minutes late
    '2026-10-01T02:10:00.000Z', // 10 minutes late
    '2026-10-01T02:15:00.000Z', // 15 minutes late
    '2026-10-01T02:20:00.000Z', // 20 minutes late (window upper bound)
  ];

  for (const timeStr of driftTestTimes) {
    const event: ScheduledEvent = {
      cron: '*/30 * * * *',
      type: 'cron',
      scheduledTime: new Date(timeStr).getTime(),
    };
    const result = determineScheduledMode(event);
    assert.strictEqual(result.mode, 'full', `Expected 'full' for timestamp ${timeStr}`);
  }
});

test('Scheduler: small execution-time drift around 14:00 UTC window triggers full mode', () => {
  const driftTestTimes = [
    '2026-10-01T13:58:00.000Z', // 2 minutes early
    '2026-10-01T13:59:45.000Z', // 15 seconds early
    '2026-10-01T14:00:45.000Z', // 45 seconds late
    '2026-10-01T14:01:15.000Z', // 75 seconds late (observed in logs)
    '2026-10-01T14:05:00.000Z', // 5 minutes late
    '2026-10-01T14:10:00.000Z', // 10 minutes late
    '2026-10-01T14:15:00.000Z', // 15 minutes late
    '2026-10-01T14:20:00.000Z', // 20 minutes late (window upper bound)
  ];

  for (const timeStr of driftTestTimes) {
    const event: ScheduledEvent = {
      cron: '*/30 * * * *',
      type: 'cron',
      scheduledTime: new Date(timeStr).getTime(),
    };
    const result = determineScheduledMode(event);
    assert.strictEqual(result.mode, 'full', `Expected 'full' for timestamp ${timeStr}`);
  }
});

test('Scheduler: normal 30-minute dynamic executions preserve dynamic mode', () => {
  const dynamicTimes = [
    '2026-10-01T00:00:00.000Z',
    '2026-10-01T00:30:00.000Z',
    '2026-10-01T01:00:00.000Z',
    '2026-10-01T01:30:00.000Z',
    '2026-10-01T02:30:00.000Z', // Next 30-min run after 02:00 full sync must be dynamic
    '2026-10-01T03:00:00.000Z',
    '2026-10-01T08:00:00.000Z',
    '2026-10-01T13:30:00.000Z',
    '2026-10-01T14:30:00.000Z', // Next 30-min run after 14:00 full sync must be dynamic
    '2026-10-01T15:00:00.000Z',
    '2026-10-01T23:30:00.000Z',
  ];

  for (const timeStr of dynamicTimes) {
    const event: ScheduledEvent = {
      cron: '*/30 * * * *',
      type: 'cron',
      scheduledTime: new Date(timeStr).getTime(),
    };
    const result = determineScheduledMode(event);
    assert.strictEqual(result.mode, 'dynamic', `Expected 'dynamic' for timestamp ${timeStr}`);
  }
});

test('Scheduler: legacy and test cron overrides are preserved', () => {
  assert.strictEqual(
    determineScheduledMode({ cron: 'test', type: 'cron', scheduledTime: Date.now() }).mode,
    'cleanup'
  );
  assert.strictEqual(
    determineScheduledMode({ cron: 'cleanup', type: 'cron', scheduledTime: Date.now() }).mode,
    'cleanup'
  );
  assert.strictEqual(
    determineScheduledMode({ cron: '0 2 * * *', type: 'cron', scheduledTime: Date.now() }).mode,
    'full'
  );
  assert.strictEqual(
    determineScheduledMode({ cron: '0 14 * * *', type: 'cron', scheduledTime: Date.now() }).mode,
    'full'
  );
});
