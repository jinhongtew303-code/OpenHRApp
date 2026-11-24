import React, { useEffect, useState } from 'react';
import { CalendarRange, ChevronRight } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { addDays } from '../../utils/roster';
import type { DayShift } from '../../utils/roster';

interface Props {
  userId: string;
  shiftId?: string;
  onOpen: () => void;
}

const label = (d: DayShift | null) =>
  !d ? '—' : d.isOff ? '休息 Off' : d.shift ? `${d.shift.startTime.slice(0, 5)} 上班` : '按公司时间';

/** Home card: today's and tomorrow's start time from the roster (or usual shift). */
export const TodayScheduleCard: React.FC<Props> = ({ userId, shiftId, onOpen }) => {
  const [days, setDays] = useState<[DayShift, DayShift] | null>(null);

  useEffect(() => {
    let alive = true;
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      hrService.resolveShiftForDay(userId, shiftId, today),
      hrService.resolveShiftForDay(userId, shiftId, addDays(today, 1)),
    ]).then(r => { if (alive) setDays(r as [DayShift, DayShift]); })
      .catch(e => console.warn('[TodayScheduleCard] load failed', e));
    return () => { alive = false; };
  }, [userId, shiftId]);

  if (!days) return null;
  const [today, tomorrow] = days;

  return (
    <button type="button" onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-all">
      <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-500"><CalendarRange size={20} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">今天 Today</p>
        <p className="font-black text-slate-800 text-lg leading-tight">{label(today)}</p>
        <p className="text-xs text-slate-400 mt-0.5">明天 Tomorrow: {label(tomorrow)}</p>
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  );
};
