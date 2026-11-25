import React, { useState } from 'react';
import { LogIn, LogOut, Coffee, CheckCircle2, Clock, TimerReset } from 'lucide-react';
import { Attendance, AppConfig } from '../../types';
import { hrService } from '../../services/hrService';
import { calculateOvertimeMinutes, formatMinutes } from '../../utils/attendanceUtils';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

interface Props {
  shift?: Attendance;          // today's attendance record, if any
  appConfig: AppConfig | null;
  onChanged: () => void;       // refetch dashboard after a break action
}

const TimelineRow: React.FC<{ label: string; time?: string; done: boolean; icon: React.ReactNode }> = ({ label, time, done, icon }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2.5">
      <div className={`p-1.5 rounded-lg ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>{icon}</div>
      <span className={`text-sm font-medium ${done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    </div>
    <span className={`text-sm font-semibold tabular-nums ${done ? 'text-slate-900' : 'text-slate-300'}`}>{time && time !== '-' ? time : '—'}</span>
  </div>
);

export const WorkdayTodayCard: React.FC<Props> = ({ shift, appConfig, onChanged }) => {
  const { showToast } = useToast();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  const checkedIn = !!shift?.checkIn && shift.checkIn !== '-';
  const checkedOut = !!shift?.checkOut && shift.checkOut !== '-';
  const onBreak = !!shift?.breakStart && !shift?.breakEnd;
  const overtime = formatMinutes(calculateOvertimeMinutes(shift?.checkOut, appConfig?.officeEndTime));

  const doStart = async () => {
    if (!shift?.id) return;
    setBusy(true);
    try { await hrService.startBreak(shift.id); showToast(t('break.okStart'), 'success'); onChanged(); }
    catch (e) { console.error('[WorkdayTodayCard] startBreak failed:', e); showToast(t('common.retryFail'), 'error'); }
    finally { setBusy(false); }
  };
  const doEnd = async () => {
    if (!shift?.id) return;
    setBusy(true);
    try { await hrService.endBreak(shift.id); showToast(t('break.okEnd'), 'success'); onChanged(); }
    catch (e) { console.error('[WorkdayTodayCard] endBreak failed:', e); showToast(t('common.retryFail'), 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white p-5 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-light rounded-lg text-primary"><Clock size={14} /></div>
          <h3 className="font-semibold text-sm text-slate-900">{t('work.today')}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-amber-600">
          <TimerReset size={14} />
          <span className="text-xs font-semibold">{t('work.overtime')} {overtime}</span>
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        <TimelineRow label={t('work.checkIn')}  time={shift?.checkIn}   done={checkedIn}  icon={<LogIn size={14} />} />
        <TimelineRow label={t('work.break')}    time={shift?.breakStart} done={!!shift?.breakStart} icon={<Coffee size={14} />} />
        <TimelineRow label={t('work.back')}     time={shift?.breakEnd}   done={!!shift?.breakEnd}   icon={<CheckCircle2 size={14} />} />
        <TimelineRow label={t('work.checkOut')} time={shift?.checkOut}  done={checkedOut} icon={<LogOut size={14} />} />
      </div>

      {/* Lunch break controls — only meaningful while checked in and not yet out. */}
      {checkedIn && !checkedOut && (
        <div className="mt-4">
          {!shift?.breakStart && (
            <button onClick={doStart} disabled={busy}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              <Coffee size={16} /> {t('work.startBreak')}
            </button>
          )}
          {onBreak && (
            <button onClick={doEnd} disabled={busy}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              <CheckCircle2 size={16} /> {t('work.endBreak')}
            </button>
          )}
        </div>
      )}

      {!checkedIn && (
        <p className="mt-3 text-xs text-slate-400 text-center">{t('work.notCheckedIn')}</p>
      )}
    </div>
  );
};
