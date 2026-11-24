import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Gift, PartyPopper } from 'lucide-react';
import { hrService } from '../services/hrService';
import { useToast } from '../context/ToastContext';
import type { RewardClaim } from '../services/rewards.service';
import {
  PunctualityProgress, PunctualityRewardConfig, claimableRewards,
} from '../utils/punctuality';
import { StreakHero } from '../components/rewards/StreakHero';
import { MonthCalendar } from '../components/rewards/MonthCalendar';
import { ClaimRewardCard } from '../components/rewards/ClaimRewardCard';
import { RewardsAdminPanel } from '../components/rewards/RewardsAdminPanel';

interface Props {
  user: any;
  /** The real signed-in user (differs from `user` while the boss views as an employee). */
  realUser?: any;
}

const Rewards: React.FC<Props> = ({ user, realUser }) => {
  const { showToast } = useToast();
  const actor = realUser ?? user;
  const isBoss = (actor.role === 'ADMIN' || actor.role === 'HR') && actor.id === user.id;
  const isViewingAs = actor.id !== user.id;

  const [config, setConfig] = useState<PunctualityRewardConfig | null>(null);
  const [progress, setProgress] = useState<PunctualityProgress | null>(null);
  const [myClaims, setMyClaims] = useState<RewardClaim[]>([]);
  const [allClaims, setAllClaims] = useState<RewardClaim[]>([]);
  const [team, setTeam] = useState<Array<{ id: string; name: string; progress: PunctualityProgress }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const cfg = await hrService.getRewardConfig();
      setConfig(cfg);
      const [prog, claims] = await Promise.all([
        hrService.getPunctualityProgress(user.id, cfg),
        hrService.getRewardClaims(isBoss ? undefined : user.id),
      ]);
      setProgress(prog);
      setMyClaims(claims.filter(c => c.employeeId === user.id));
      if (isBoss) {
        setAllClaims(claims);
        setTeam(await hrService.getTeamPunctuality(cfg));
      }
    } catch (e: any) {
      console.error('[Rewards] load failed', e);
      setError('奖励资料加载失败，请稍后再试。Could not load rewards — please try again.');
    } finally {
      setLoading(false);
    }
  }, [user.id, isBoss]);

  useEffect(() => { load(); }, [load]);

  const claimable = useMemo(() => {
    if (!config || !progress) return [];
    const keys = new Set(myClaims.map(c => `${c.kind}:${c.period}`));
    return claimableRewards(progress, config, keys);
  }, [config, progress, myClaims]);

  const handleClaim = async (kind: 'STREAK' | 'MONTHLY', period: string, reward: string) => {
    if (isViewingAs) { showToast('查看模式下不能领取。Viewing as an employee — claims are disabled.', 'warning'); return; }
    try {
      await hrService.claimReward({ employeeId: user.id, employeeName: user.name, kind, period, reward });
      showToast(`🎉 领取成功！${reward} — 老板已收到通知`, 'success');
      await load();
    } catch (e: any) {
      showToast(e?.message === 'This reward was already claimed.' ? '这个奖励已经领取过了。' : '领取失败，请再试一次。Claim failed, please try again.', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" size={36} /></div>;

  if (error || !config || !progress) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm">{error}</p>
        <button type="button" onClick={() => { setLoading(true); load(); }} className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold">重试 Retry</button>
      </div>
    );
  }

  const pendingMine = myClaims.filter(c => c.status === 'PENDING');
  const history = myClaims.slice(0, 12);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><PartyPopper className="text-rose-500" /> 准时奖励 Rewards</h1>
        <p className="text-sm text-slate-500 mt-1">每天准时打卡，累积连续天数，领取小礼物和月度大奖！</p>
      </div>

      {!config.enabled && !isBoss && (
        <div className="rounded-[2rem] bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
          <Gift className="mx-auto text-slate-300" size={40} />
          <p className="mt-3 font-bold text-slate-600">奖励活动即将开始 Coming soon</p>
          <p className="text-sm text-slate-400 mt-1">老板还没开启准时奖励。The boss hasn't turned rewards on yet.</p>
        </div>
      )}

      {config.enabled && (
        <>
          {claimable.length > 0 && (
            <div className="space-y-3">
              {claimable.map(r => (
                <ClaimRewardCard key={`${r.kind}:${r.period}`} reward={r}
                  onClaim={choice => handleClaim(r.kind, r.period, choice)} />
              ))}
            </div>
          )}

          <StreakHero progress={progress} config={config} />
          <MonthCalendar month={progress.currentMonth} days={progress.days} config={config} />

          {/* What can be won */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-[2rem] bg-rose-50 p-5">
              <p className="text-xs font-bold text-rose-500">🎁 每连续准时 {config.streakTarget} 天</p>
              <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">{config.streakRewards.map(r => <li key={r}>• {r}</li>)}</ul>
            </div>
            <div className="rounded-[2rem] bg-amber-50 p-5">
              <p className="text-xs font-bold text-amber-600">🏆 全月准时（满 {config.minMonthlyDays} 天，无迟到）</p>
              <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">{config.monthlyRewards.map(r => <li key={r}>• {r}</li>)}</ul>
            </div>
          </div>

          {history.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 text-sm">我的奖励 My rewards</h3>
              <div className="mt-2 divide-y divide-slate-50">
                {history.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold text-slate-700">{c.reward}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${c.status === 'GIVEN' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {c.status === 'GIVEN' ? '已收到 Received' : '等老板发 Waiting'}
                    </span>
                  </div>
                ))}
              </div>
              {pendingMine.length > 0 && <p className="text-[11px] text-slate-400 mt-2">老板已收到通知，会尽快给你 🙌</p>}
            </div>
          )}
        </>
      )}

      {isBoss && (
        <RewardsAdminPanel
          config={config}
          claims={allClaims}
          team={team}
          onSaveConfig={async next => {
            try {
              await hrService.setRewardConfig(next);
              showToast(next.enabled ? '奖励设置已保存 Saved' : '奖励已关闭 Rewards turned off', 'success');
              await load();
            } catch {
              showToast('保存失败 Could not save settings', 'error');
            }
          }}
          onMarkGiven={async (id, given) => {
            try {
              await hrService.markRewardGiven(id, given);
              await load();
            } catch {
              showToast('更新失败 Could not update', 'error');
            }
          }}
        />
      )}
    </div>
  );
};

export default Rewards;
