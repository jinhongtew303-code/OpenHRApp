import React, { useState } from 'react';
import { X, Loader2, Moon, RotateCcw } from 'lucide-react';
import type { Shift } from '../../types';
import { RosterEntry, isValidTime } from '../../utils/roster';

interface Props {
  employeeName: string;
  dateLabel: string;
  entry: RosterEntry | null;
  shifts: Shift[];
  onSave: (value: { startTime?: string; endTime?: string; isOff: boolean }) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

/** Bottom sheet for one roster cell: pick a shift, a custom time, or a day off. */
export const RosterCellEditor: React.FC<Props> = ({ employeeName, dateLabel, entry, shifts, onSave, onClear, onClose }) => {
  const [start, setStart] = useState(entry?.startTime || '');
  const [end, setEnd] = useState(entry?.endTime || '');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const canSaveCustom = isValidTime(start) && (!end || isValidTime(end));

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-end sm:items-center justify-center animate-in fade-in" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">{dateLabel}</p>
            <h3 className="text-lg font-black text-slate-800">{employeeName}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-slate-100"><X size={20} /></button>
        </div>

        {shifts.length > 0 && (
          <>
            <p className="text-xs font-bold text-slate-500 mt-5 mb-2">选班次 Pick a shift</p>
            <div className="grid grid-cols-2 gap-2">
              {shifts.map(s => (
                <button key={s.id} type="button" disabled={busy}
                  onClick={() => run(() => onSave({ startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5), isOff: false }))}
                  className="text-left px-3 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 active:scale-[0.98] transition-all">
                  <span className="block text-sm font-bold text-indigo-700 truncate">{s.name}</span>
                  <span className="block text-xs font-semibold text-indigo-400">{s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-xs font-bold text-slate-500 mt-5 mb-2">或自己填时间 Or set a time</p>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="block text-[11px] font-semibold text-slate-400 mb-1">上班 Start</span>
            <input type="time" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold" />
          </label>
          <label className="flex-1">
            <span className="block text-[11px] font-semibold text-slate-400 mb-1">下班 End（可空）</span>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-base font-bold" />
          </label>
        </div>
        <button type="button" disabled={!canSaveCustom || busy}
          onClick={() => run(() => onSave({ startTime: start, endTime: end || undefined, isOff: false }))}
          className="mt-3 w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {busy && <Loader2 size={16} className="animate-spin" />} 保存 Save
        </button>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button type="button" disabled={busy} onClick={() => run(() => onSave({ isOff: true }))}
            className="py-3 rounded-2xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-1.5">
            <Moon size={15} /> 休息 Day off
          </button>
          <button type="button" disabled={busy || !entry} onClick={() => run(onClear)}
            className="py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40">
            <RotateCcw size={15} /> 清空 Clear
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">清空 = 这天按员工的固定班次算。Clear = use the person's usual shift.</p>
      </div>
    </div>
  );
};
