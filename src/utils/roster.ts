// Weekly roster — pure helpers (unit-tested in src/test/roster.test.ts).
import type { AppConfig, Shift } from '../types';

export interface RosterEntry {
  id?: string;
  employeeId: string;
  date: string;        // YYYY-MM-DD
  startTime?: string;  // HH:MM (absent when isOff)
  endTime?: string;    // HH:MM
  isOff: boolean;
}

/** What applies to one person on one day. */
export interface DayShift {
  shift: Shift | null;   // effective times (roster applied on top of the base shift)
  entry: RosterEntry | null;
  isOff: boolean;        // rostered day off → never marked late
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export const isValidTime = (t: string | undefined | null): t is string =>
  !!t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  const d = parse(date);
  const shift = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - shift);
  return iso(d);
}

export function addDays(date: string, days: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + days);
  return iso(d);
}

/** The 7 dates Mon→Sun starting at `monday`. */
export const weekDates = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/**
 * Apply a roster entry on top of the base shift (assigned/default) or, when
 * there is no shift at all, on top of the company office hours.
 */
export function applyRoster(base: Shift | null, entry: RosterEntry | null, config?: Partial<AppConfig> | null): DayShift {
  if (!entry) return { shift: base, entry: null, isOff: false };
  if (entry.isOff) return { shift: base, entry, isOff: true };

  const template: Shift = base ?? {
    id: 'roster',
    name: 'Roster',
    startTime: config?.officeStartTime || '09:00',
    endTime: config?.officeEndTime || '18:00',
    lateGracePeriod: config?.lateGracePeriod ?? 0,
    earlyOutGracePeriod: config?.earlyOutGracePeriod ?? 0,
    earliestCheckIn: config?.earliestCheckIn || '',
    autoSessionCloseTime: config?.autoSessionCloseTime || '',
    workingDays: [],
    isDefault: false,
  };
  return {
    entry,
    isOff: false,
    shift: {
      ...template,
      name: `排班 ${entry.startTime}`,
      startTime: isValidTime(entry.startTime) ? entry.startTime : template.startTime,
      endTime: isValidTime(entry.endTime) ? entry.endTime : template.endTime,
    },
  };
}

/** Short label for a roster cell. */
export const entryLabel = (e: RosterEntry | null | undefined) =>
  !e ? '' : e.isOff ? '休' : e.endTime ? `${e.startTime}-${e.endTime}` : (e.startTime || '');
