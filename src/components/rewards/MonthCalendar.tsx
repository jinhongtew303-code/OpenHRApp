import React from 'react';
import { CalendarCheck } from 'lucide-react';
import type { DayResult, MonthResult, PunctualityRewardConfig } from '../../utils/punctuality';

interface Props {
  month: MonthResult;
  days: DayResult[];
  config: PunctualityRewardConfig;
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** This month at a glance: green = on time, red = late/absent, plus the perfect-month meter. */
export const MonthCalendar: React.FC<Props> = ({ month, days, config }) => {
  const [y, m] = month.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const byDate = new Map(days.filter(d => d.date.startsWith(month.month)).map(d => [d.date, d]));
  const needed = config.minMonthlyDays;
  const pct = Math.min(100, Math.round((month.onTime / needed) * 100));
  const broken = month.late > 0 || month.absent > 0;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarCheck size={18} /></div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">全月准时挑战 Perfect Month</h3>
            <p className="text-[11px] text-slate-400">{month.month}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${broken ? 'bg-rose-50 text-rose-600' : month.onTime >= needed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {broken ? '本月挑战失败 Missed' : month.onTime >= needed ? '达标！Qualified 🎉' : '进行中 In progress'}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>准时 {month.onTime} / {needed} 天</span>
          <span>{broken ? `迟到 ${month.late} · 缺勤 ${month.absent}` : `${pct}%`}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${broken ? 'bg-rose-300' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {broken
            ? '这个月有迟到，下个月重新开始挑战！ Try again next month.'
            : `整个月没有迟到，且准时满 ${needed} 天，月底就可以挑选大奖 🏆`}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mt-4 text-center">
        {WEEK.map(w => <div key={w} className="text-[10px] font-bold text-slate-300">{w}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const date = `${month.month}-${String(i + 1).padStart(2, '0')}`;
          const d = byDate.get(date);
          const cls = d?.outcome === 'ON_TIME' ? 'bg-emerald-500 text-white'
            : d?.outcome === 'LATE' ? 'bg-rose-500 text-white'
            : d?.outcome === 'ABSENT' ? 'bg-slate-700 text-white'
            : 'bg-slate-50 text-slate-400';
          return (
            <div key={date} title={d?.checkIn ? `${date} ${d.checkIn}` : date}
              className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold ${cls}`}>
              {i + 1}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />准时</span>
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />迟到</span>
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-slate-700 inline-block" />缺勤</span>
      </div>
    </div>
  );
};
