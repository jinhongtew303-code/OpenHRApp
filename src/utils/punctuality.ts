// Punctuality rewards — pure logic (no I/O), unit-tested in src/test/punctuality.test.ts.
//
// Rules, kept deliberately simple so staff can understand them:
// - A "day" is one calendar date. The day's FIRST check-in decides it:
//   status LATE → late day, anything else → on-time day. A day with only an
//   ABSENT record is a missed day. LEAVE days and days with no record are
//   neutral (rest days, rotating off days, leave) and never break a streak.
// - Streak = consecutive on-time days. A late or absent day resets it to 0.
// - Every time the streak reaches a multiple of `streakTarget` (default 10),
//   the employee earns one small gift, identified by the date it was reached.
// - A month is "perfect" when it has no late or absent day and at least
//   `minMonthlyDays` on-time days. A finished perfect month earns the big
//   reward, which the employee picks from `monthlyRewards`.
// - Only days on or after `startDate` count, so turning rewards on is never
//   retroactive.

import type { Attendance } from '../types';

export interface PunctualityRewardConfig {
  enabled: boolean;
  startDate: string;        // YYYY-MM-DD — days before this never count
  streakTarget: number;     // on-time days per small gift
  streakRewards: string[];  // options for the small gift
  minMonthlyDays: number;   // on-time days needed for a perfect month
  monthlyRewards: string[]; // options for the monthly reward
}

export const DEFAULT_REWARD_CONFIG: PunctualityRewardConfig = {
  enabled: false,
  startDate: '',
  streakTarget: 10,
  streakRewards: ['RM10 小红包 Ang Pao', '奶茶一杯 Bubble Tea'],
  minMonthlyDays: 20,
  monthlyRewards: ['老板请吃 KFC', '老板请吃饭 Dinner with Boss', 'RM50 额外奖金 Bonus'],
};

export type DayOutcome = 'ON_TIME' | 'LATE' | 'ABSENT' | 'NEUTRAL';

export interface DayResult {
  date: string;
  outcome: DayOutcome;
  checkIn?: string;
}

export interface StreakMilestone {
  date: string;   // date the multiple was reached — the claim period key
  count: number;  // streak length at that moment (10, 20, ...)
}

export interface MonthResult {
  month: string;  // YYYY-MM
  onTime: number;
  late: number;
  absent: number;
  perfect: boolean;   // rule met (only claimable once the month is over)
  finished: boolean;  // month is in the past
}

export interface PunctualityProgress {
  days: DayResult[];              // chronological, counted days only
  currentStreak: number;
  bestStreak: number;
  toNextGift: number;             // on-time days still needed for the next gift
  milestones: StreakMilestone[];  // every gift earned since startDate
  months: MonthResult[];          // chronological
  currentMonth: MonthResult;
  today?: DayResult;
}

export const monthOf = (date: string) => date.slice(0, 7);

/** Collapse raw attendance rows (possibly several per day) into one result per date. */
export function toDayResults(records: Attendance[], startDate = ''): DayResult[] {
  const byDate = new Map<string, Attendance[]>();
  for (const r of records) {
    if (!r.date || (startDate && r.date < startDate)) continue;
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }

  const days: DayResult[] = [];
  for (const [date, rows] of byDate) {
    const punches = rows
      .filter(r => r.checkIn && r.status !== 'ABSENT' && r.status !== 'LEAVE')
      .sort((a, b) => (a.checkIn ?? '').localeCompare(b.checkIn ?? ''));
    if (punches.length > 0) {
      const first = punches[0];
      days.push({ date, outcome: first.status === 'LATE' ? 'LATE' : 'ON_TIME', checkIn: first.checkIn });
    } else if (rows.some(r => r.status === 'ABSENT')) {
      days.push({ date, outcome: 'ABSENT' });
    } else {
      days.push({ date, outcome: 'NEUTRAL' });
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

const emptyMonth = (month: string, finished: boolean): MonthResult =>
  ({ month, onTime: 0, late: 0, absent: 0, perfect: false, finished });

export function computeProgress(
  records: Attendance[],
  config: Pick<PunctualityRewardConfig, 'startDate' | 'streakTarget' | 'minMonthlyDays'>,
  todayISO: string,
): PunctualityProgress {
  const target = Math.max(1, config.streakTarget || 10);
  const minDays = Math.max(1, config.minMonthlyDays || 1);
  const days = toDayResults(records, config.startDate).filter(d => d.date <= todayISO);
  const thisMonth = monthOf(todayISO);

  let streak = 0;
  let best = 0;
  const milestones: StreakMilestone[] = [];
  const monthMap = new Map<string, MonthResult>();

  for (const d of days) {
    const m = monthOf(d.date);
    const mr = monthMap.get(m) ?? emptyMonth(m, m < thisMonth);
    monthMap.set(m, mr);

    if (d.outcome === 'ON_TIME') {
      streak += 1;
      mr.onTime += 1;
      if (streak % target === 0) milestones.push({ date: d.date, count: streak });
    } else if (d.outcome === 'LATE') {
      streak = 0;
      mr.late += 1;
    } else if (d.outcome === 'ABSENT') {
      streak = 0;
      mr.absent += 1;
    }
    best = Math.max(best, streak);
  }

  for (const mr of monthMap.values()) {
    mr.perfect = mr.late === 0 && mr.absent === 0 && mr.onTime >= minDays;
  }

  const months = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));
  const currentMonth = monthMap.get(thisMonth) ?? emptyMonth(thisMonth, false);

  return {
    days,
    currentStreak: streak,
    bestStreak: best,
    toNextGift: target - (streak % target),
    milestones,
    months,
    currentMonth,
    today: days.find(d => d.date === todayISO),
  };
}

export type RewardKind = 'STREAK' | 'MONTHLY';

export interface ClaimableReward {
  kind: RewardKind;
  period: string; // STREAK → milestone date, MONTHLY → YYYY-MM
  title: string;
  options: string[];
}

/** Rewards earned but not yet claimed. `claimedKeys` holds `${kind}:${period}`. */
export function claimableRewards(
  progress: PunctualityProgress,
  config: PunctualityRewardConfig,
  claimedKeys: Set<string>,
): ClaimableReward[] {
  const out: ClaimableReward[] = [];
  for (const m of progress.milestones) {
    if (claimedKeys.has(`STREAK:${m.date}`)) continue;
    out.push({
      kind: 'STREAK',
      period: m.date,
      title: `连续 ${m.count} 天准时 · ${m.count}-day streak (${m.date})`,
      options: config.streakRewards,
    });
  }
  for (const m of progress.months) {
    if (!m.finished || !m.perfect || claimedKeys.has(`MONTHLY:${m.month}`)) continue;
    out.push({
      kind: 'MONTHLY',
      period: m.month,
      title: `${m.month} 全月准时 · Perfect month`,
      options: config.monthlyRewards,
    });
  }
  return out;
}

/** Today's date key, written the same way check-ins write `date` (see useAttendance.submitPunch). */
export const attendanceToday = (d = new Date()) => d.toISOString().split('T')[0];
