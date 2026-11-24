// Punctuality rewards — settings, progress and claims.
// Progress is computed from attendance by src/utils/punctuality.ts; this
// service only loads the inputs and records claims (table reward_claims,
// migration 0057).

import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import { organizationService } from './organization.service';
import { attendanceService } from './attendance.service';
import { employeeService } from './employee.service';
import { notificationService } from './notification.service';
import {
  DEFAULT_REWARD_CONFIG, PunctualityRewardConfig, PunctualityProgress,
  RewardKind, computeProgress, attendanceToday,
} from '../utils/punctuality';

const SETTING_KEY = 'punctuality_rewards';

export interface RewardClaim {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  kind: RewardKind;
  period: string;
  reward: string;
  status: 'PENDING' | 'GIVEN';
  createdAt: string;
  givenAt?: string;
}

const mapClaim = (r: any): RewardClaim => ({
  id: r.id,
  organizationId: r.organization_id,
  employeeId: String(r.employee_id),
  employeeName: r.employee_name || '',
  kind: r.kind,
  period: r.period,
  reward: r.reward,
  status: r.status,
  createdAt: r.created_at,
  givenAt: r.given_at || undefined,
});

const normalizeConfig = (raw: any): PunctualityRewardConfig => {
  const c = { ...DEFAULT_REWARD_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
  const list = (v: any, fallback: string[]) =>
    Array.isArray(v) ? v.map(String).map(s => s.trim()).filter(Boolean) : fallback;
  return {
    enabled: !!c.enabled,
    startDate: String(c.startDate || ''),
    streakTarget: Math.max(1, Number(c.streakTarget) || DEFAULT_REWARD_CONFIG.streakTarget),
    streakRewards: list(c.streakRewards, DEFAULT_REWARD_CONFIG.streakRewards),
    minMonthlyDays: Math.max(1, Number(c.minMonthlyDays) || DEFAULT_REWARD_CONFIG.minMonthlyDays),
    monthlyRewards: list(c.monthlyRewards, DEFAULT_REWARD_CONFIG.monthlyRewards),
  };
};

/** Never load more than a year of history for progress. */
const historySince = (config: PunctualityRewardConfig) => {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const floor = attendanceToday(yearAgo);
  return config.startDate && config.startDate > floor ? config.startDate : floor;
};

export const rewardsService = {
  async getRewardConfig(): Promise<PunctualityRewardConfig> {
    return normalizeConfig(await organizationService.getSetting(SETTING_KEY, DEFAULT_REWARD_CONFIG));
  },

  async setRewardConfig(config: PunctualityRewardConfig): Promise<void> {
    await organizationService.setSetting(SETTING_KEY, normalizeConfig(config));
    apiClient.notify();
  },

  async getProgress(employeeId: string, config?: PunctualityRewardConfig): Promise<PunctualityProgress> {
    const cfg = config ?? await rewardsService.getRewardConfig();
    const records = await attendanceService.getAttendance({
      since: historySince(cfg), employeeId, skipSelfieUrls: true,
    });
    return computeProgress(records, cfg, attendanceToday());
  },

  /** Progress for every active employee in the organization (boss view). */
  async getTeamProgress(config: PunctualityRewardConfig): Promise<Array<{ id: string; name: string; progress: PunctualityProgress }>> {
    const orgId = apiClient.getOrganizationId();
    const [employees, records] = await Promise.all([
      employeeService.getEmployees(),
      attendanceService.getAttendance({ since: historySince(config), skipSelfieUrls: true, maxRows: 10000 }),
    ]);
    const today = attendanceToday();
    return employees
      .filter(e => e.status !== 'INACTIVE' && (!orgId || !e.organizationId || e.organizationId === orgId))
      .map(e => ({
        id: e.id,
        name: e.name,
        progress: computeProgress(records.filter(r => r.employeeId === e.id), config, today),
      }))
      .sort((a, b) => b.progress.currentStreak - a.progress.currentStreak || a.name.localeCompare(b.name));
  },

  async getClaims(employeeId?: string): Promise<RewardClaim[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = apiClient.getOrganizationId();
    let query = supabase.from('reward_claims').select('*').order('created_at', { ascending: false }).limit(500);
    if (orgId) query = query.eq('organization_id', orgId);
    if (employeeId) query = query.eq('employee_id', employeeId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapClaim);
  },

  async claimReward(input: { employeeId: string; employeeName: string; kind: RewardKind; period: string; reward: string }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    const { error } = await supabase.from('reward_claims').insert({
      organization_id: orgId,
      employee_id: input.employeeId,
      employee_name: input.employeeName,
      kind: input.kind,
      period: input.period,
      reward: input.reward,
      status: 'PENDING',
    });
    if (error) {
      if ((error as any).code === '23505') throw new Error('This reward was already claimed.');
      throw error;
    }

    // Let the boss know. A failed notification must not fail the claim.
    try {
      const bosses = (await employeeService.getEmployees())
        .filter(e => (e.role === 'ADMIN' || e.role === 'HR') && e.status !== 'INACTIVE');
      await notificationService.createBulkNotifications(bosses.map(b => ({
        userId: b.id,
        type: 'SYSTEM' as const,
        title: `🎁 ${input.employeeName} 领取了奖励`,
        message: `${input.reward} (${input.kind === 'MONTHLY' ? `全月准时 ${input.period}` : `连续准时 ${input.period}`})`,
        referenceType: 'reward_claim',
        actionUrl: 'rewards',
      })));
    } catch (e) {
      console.warn('[RewardsService] Could not notify admins of claim', e);
    }
    apiClient.notify();
  },

  async markGiven(claimId: string, given = true): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { data: auth } = await supabase.auth.getSession();
    const { error } = await supabase.from('reward_claims').update({
      status: given ? 'GIVEN' : 'PENDING',
      given_at: given ? new Date().toISOString() : null,
      given_by: given ? auth.session?.user.id ?? null : null,
    }).eq('id', claimId);
    if (error) throw error;
    apiClient.notify();
  },
};
