import { describe, it, expect } from 'vitest';
import { computeProgress, claimableRewards, toDayResults, DEFAULT_REWARD_CONFIG } from '../utils/punctuality';
import type { Attendance } from '../types';

const rec = (date: string, status: Attendance['status'], checkIn = '09:00'): Attendance =>
  ({ id: date + checkIn, employeeId: 'e1', employeeName: 'A', date, checkIn, status } as Attendance);

const days = (from: number, to: number, month = '2026-10', status: Attendance['status'] = 'PRESENT') =>
  Array.from({ length: to - from + 1 }, (_, i) => rec(`${month}-${String(from + i).padStart(2, '0')}`, status));

const cfg = { ...DEFAULT_REWARD_CONFIG, enabled: true, startDate: '2026-10-01', streakTarget: 10, minMonthlyDays: 20 };

describe('toDayResults', () => {
  it('uses the first check-in of the day', () => {
    const d = toDayResults([rec('2026-10-01', 'PRESENT', '14:00'), rec('2026-10-01', 'LATE', '09:20')]);
    expect(d).toEqual([{ date: '2026-10-01', outcome: 'LATE', checkIn: '09:20' }]);
  });

  it('ignores days before the start date', () => {
    expect(toDayResults([rec('2026-09-30', 'LATE')], '2026-10-01')).toEqual([]);
  });

  it('treats ABSENT-only days as absent and LEAVE as neutral', () => {
    const d = toDayResults([{ ...rec('2026-10-01', 'ABSENT'), checkIn: '' }, { ...rec('2026-10-02', 'LEAVE'), checkIn: '' }]);
    expect(d.map(x => x.outcome)).toEqual(['ABSENT', 'NEUTRAL']);
  });
});

describe('computeProgress', () => {
  it('counts a streak and resets it on a late day', () => {
    const p = computeProgress([...days(1, 5), rec('2026-10-06', 'LATE'), ...days(7, 9)], cfg, '2026-10-09');
    expect(p.currentStreak).toBe(3);
    expect(p.bestStreak).toBe(5);
    expect(p.toNextGift).toBe(7);
  });

  it('does not break the streak on days without a record (rest days)', () => {
    const p = computeProgress([...days(1, 3), ...days(10, 12)], cfg, '2026-10-12');
    expect(p.currentStreak).toBe(6);
  });

  it('earns a gift at every multiple of the target', () => {
    const p = computeProgress(days(1, 25), cfg, '2026-10-25');
    expect(p.milestones).toEqual([{ date: '2026-10-10', count: 10 }, { date: '2026-10-20', count: 20 }]);
    expect(p.toNextGift).toBe(5);
  });

  it('marks a finished month perfect only with enough days and no late day', () => {
    const good = computeProgress(days(1, 22), cfg, '2026-11-02');
    expect(good.months[0]).toMatchObject({ month: '2026-10', onTime: 22, perfect: true, finished: true });

    const late = computeProgress([...days(1, 22), rec('2026-10-23', 'LATE')], cfg, '2026-11-02');
    expect(late.months[0].perfect).toBe(false);

    const short = computeProgress(days(1, 15), cfg, '2026-11-02');
    expect(short.months[0].perfect).toBe(false);
  });

  it('ignores future-dated records', () => {
    const p = computeProgress(days(1, 5), cfg, '2026-10-03');
    expect(p.currentStreak).toBe(3);
  });
});

describe('claimableRewards', () => {
  it('lists unclaimed streak gifts and finished perfect months', () => {
    const p = computeProgress(days(1, 22), cfg, '2026-11-02');
    const all = claimableRewards(p, cfg, new Set());
    expect(all.map(r => `${r.kind}:${r.period}`)).toEqual(['STREAK:2026-10-10', 'STREAK:2026-10-20', 'MONTHLY:2026-10']);

    const left = claimableRewards(p, cfg, new Set(['STREAK:2026-10-10', 'MONTHLY:2026-10']));
    expect(left.map(r => r.period)).toEqual(['2026-10-20']);
  });

  it('does not offer the current month yet', () => {
    const p = computeProgress(days(1, 22), cfg, '2026-10-28');
    expect(claimableRewards(p, cfg, new Set()).some(r => r.kind === 'MONTHLY')).toBe(false);
  });
});
