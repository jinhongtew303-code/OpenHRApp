import React, { useState } from 'react';
import { Settings2, Check, Undo2, Flame, Plus, X, Loader2, Users } from 'lucide-react';
import type { PunctualityProgress, PunctualityRewardConfig } from '../../utils/punctuality';
import { attendanceToday } from '../../utils/punctuality';
import type { RewardClaim } from '../../services/rewards.service';

interface Props {
  config: PunctualityRewardConfig;
  claims: RewardClaim[];
  team: Array<{ id: string; name: string; progress: PunctualityProgress }>;
  onSaveConfig: (config: PunctualityRewardConfig) => Promise<void>;
  onMarkGiven: (claimId: string, given: boolean) => Promise<void>;
}

const OptionList: React.FC<{ label: string; value: string[]; onChange: (v: string[]) => void }> = ({ label, value, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {value.map(v => (
          <span key={v} className="flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter(x => x !== v))} className="p-0.5 rounded-full hover:bg-slate-200"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="例如 老板请喝咖啡"
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
        />
        <button type="button" onClick={add} className="px-3 rounded-xl bg-slate-800 text-white"><Plus size={16} /></button>
      </div>
    </div>
  );
};

export const RewardsAdminPanel: React.FC<Props> = ({ config, claims, team, onSaveConfig, onMarkGiven }) => {
  const [form, setForm] = useState<PunctualityRewardConfig>(() => ({
    ...config,
    startDate: config.startDate || attendanceToday(),
  }));
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(!config.enabled);
  const pending = claims.filter(c => c.status === 'PENDING');
  const given = claims.filter(c => c.status === 'GIVEN').slice(0, 20);

  const save = async (next: PunctualityRewardConfig) => {
    setSaving(true);
    try { await onSaveConfig(next); setForm(next); } finally { setSaving(false); }
  };

  const mark = async (id: string, value: boolean) => {
    setBusyId(id);
    try { await onMarkGiven(id, value); } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Pending rewards to hand out */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6">
        <h3 className="font-bold text-slate-800">🎁 待发奖励 Rewards to give ({pending.length})</h3>
        {pending.length === 0 && <p className="text-sm text-slate-400 mt-2">暂时没有 Nothing to hand out right now.</p>}
        <div className="mt-3 space-y-2">
          {pending.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-800 truncate">{c.employeeName} · {c.reward}</p>
                <p className="text-[11px] text-slate-500">{c.kind === 'MONTHLY' ? `全月准时 ${c.period}` : `连续准时 (${c.period})`}</p>
              </div>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => mark(c.id, true)}
                className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              >
                {busyId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 已给 Given
              </button>
            </div>
          ))}
        </div>
        {given.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs font-semibold text-slate-400 cursor-pointer">已发放 Given ({given.length})</summary>
            <div className="mt-2 space-y-1">
              {given.map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs text-slate-500 py-1">
                  <span>{c.employeeName} · {c.reward} · {c.period}</span>
                  <button type="button" onClick={() => mark(c.id, false)} className="flex items-center gap-1 text-slate-400 hover:text-slate-600"><Undo2 size={12} />Undo</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Team leaderboard */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} /> 团队排行 Team streaks</h3>
        <div className="mt-3 divide-y divide-slate-50">
          {team.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="w-6 text-center text-sm font-black text-slate-300">{i === 0 && t.progress.currentStreak > 0 ? '👑' : i + 1}</span>
              <span className="flex-1 font-semibold text-sm text-slate-700 truncate">{t.name}</span>
              <span className="text-[11px] text-slate-400">本月 {t.progress.currentMonth.onTime}✅ {t.progress.currentMonth.late > 0 ? `${t.progress.currentMonth.late}⏰` : ''}</span>
              <span className="flex items-center gap-1 font-black text-orange-500 text-sm w-12 justify-end"><Flame size={14} />{t.progress.currentStreak}</span>
            </div>
          ))}
          {team.length === 0 && <p className="text-sm text-slate-400">No employees yet.</p>}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6">
        <button type="button" onClick={() => setShowSettings(s => !s)} className="w-full flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings2 size={18} /> 奖励设置 Reward settings</h3>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            {config.enabled ? '已开启 On' : '未开启 Off'}
          </span>
        </button>

        {showSettings && (
          <div className="mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-500">每几天准时送小礼物 Days per gift</span>
                <input type="number" min={1} value={form.streakTarget}
                  onChange={e => setForm({ ...form, streakTarget: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500">全月至少准时几天 Days for perfect month</span>
                <input type="number" min={1} value={form.minMonthlyDays}
                  onChange={e => setForm({ ...form, minMonthlyDays: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-bold text-slate-500">从哪天开始算 Count from</span>
                <input type="date" value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </label>
            </div>
            <OptionList label="🎁 小礼物选项 Streak gift options" value={form.streakRewards} onChange={v => setForm({ ...form, streakRewards: v })} />
            <OptionList label="🏆 月度大奖选项 Monthly reward options" value={form.monthlyRewards} onChange={v => setForm({ ...form, monthlyRewards: v })} />
            <p className="text-[11px] text-slate-400">
              迟到是按员工的班次（或公司上班时间 + 宽限分钟）判断的。只算准时/迟到的打卡；休息日不影响连续记录。
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={saving || form.streakRewards.length === 0 || form.monthlyRewards.length === 0}
                onClick={() => save({ ...form, enabled: true })}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />} {config.enabled ? '保存 Save' : '开启奖励 Turn on rewards'}
              </button>
              {config.enabled && (
                <button type="button" disabled={saving} onClick={() => save({ ...form, enabled: false })}
                  className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">关闭 Turn off</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
