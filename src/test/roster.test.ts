import { describe, it, expect } from 'vitest';
import { mondayOf, weekDates, addDays, applyRoster, entryLabel, isValidTime } from '../utils/roster';
import type { Shift } from '../types';

const base: Shift = {
  id: 's1', name: 'Normal', startTime: '09:00', endTime: '18:00', lateGracePeriod: 5,
  earlyOutGracePeriod: 15, earliestCheckIn: '06:00', autoSessionCloseTime: '23:59', workingDays: [], isDefault: true,
};

describe('dates', () => {
  it('finds the Monday of a week', () => {
    expect(mondayOf('2026-11-24')).toBe('2026-11-23'); // Tuesday
    expect(mondayOf('2026-11-29')).toBe('2026-11-23'); // Sunday
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
  });
  it('lists a week and crosses month ends', () => {
    expect(weekDates('2026-11-30')).toEqual(['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('applyRoster', () => {
  it('keeps the base shift when there is no entry', () => {
    expect(applyRoster(base, null)).toEqual({ shift: base, entry: null, isOff: false });
  });
  it('uses the rostered times but keeps the grace period', () => {
    const r = applyRoster(base, { employeeId: 'e', date: '2026-11-24', startTime: '12:00', endTime: '21:00', isOff: false });
    expect(r.shift).toMatchObject({ startTime: '12:00', endTime: '21:00', lateGracePeriod: 5 });
    expect(r.isOff).toBe(false);
  });
  it('falls back to company hours when there is no shift', () => {
    const r = applyRoster(null, { employeeId: 'e', date: '2026-11-24', startTime: '10:30', isOff: false },
      { officeStartTime: '09:00', officeEndTime: '18:00', lateGracePeriod: 3 });
    expect(r.shift).toMatchObject({ startTime: '10:30', endTime: '18:00', lateGracePeriod: 3 });
  });
  it('marks a day off', () => {
    expect(applyRoster(base, { employeeId: 'e', date: '2026-11-24', isOff: true }).isOff).toBe(true);
  });
});

describe('labels and validation', () => {
  it('labels cells', () => {
    expect(entryLabel({ employeeId: 'e', date: 'd', isOff: true })).toBe('休');
    expect(entryLabel({ employeeId: 'e', date: 'd', startTime: '10:00', isOff: false })).toBe('10:00');
    expect(entryLabel({ employeeId: 'e', date: 'd', startTime: '10:00', endTime: '19:00', isOff: false })).toBe('10:00-19:00');
  });
  it('validates times', () => {
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('9:30')).toBe(false);
  });
});
