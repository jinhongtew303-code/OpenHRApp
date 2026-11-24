import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { hrService } from '../services/hrService';
import { useToast } from '../context/ToastContext';
import type { Employee, Shift } from '../types';
import { RosterEntry, addDays, entryLabel, mondayOf, weekDates } from '../utils/roster';
import { RosterCellEditor } from '../components/roster/RosterCellEditor';

interface Props {
  user: any;
  /** The real signed-in user (differs while the boss views as an employee). */
  realUser?: any;
}

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const EDIT_ROLES = ['ADMIN', 'HR', 'MANAGER'];
const today = () => new Date().toISOString().split('T')[0];
const short = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

const Roster: React.FC<Props> = ({ user, realUser }) => {
  const { showToast } = useToast();
  const actor = realUser ?? user;
  const canEdit = EDIT_ROLES.includes(actor.role) && actor.id === user.id;

  const [monday, setMonday] = useState(() => mondayOf(today()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [entries, setEntries] = useState<Map<string, RosterEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [editing, setEditing] = useState<{ emp: Employee; date: string } | null>(null);

  const days = useMemo(() => weekDates(monday), [monday]);
  const key = (emp: string, date: string) => `${emp}|${date}`;

  const load = useCallback(async () => {
    try {
      const [emps, sh, rows] = await Promise.all([
        hrService.getEmployees(),
        hrService.getShifts().catch(() => [] as Shift[]),
        hrService.getRoster(days[0], days[6]),
      ]);
      const active = emps
        .filter(e => e.status !== 'INACTIVE' && e.role !== 'SUPER_ADMIN')
        .sort((a, b) => (a.role === 'EMPLOYEE' ? 0 : 1) - (b.role === 'EMPLOYEE' ? 0 : 1) || a.name.localeCompare(b.name));
      setEmployees(canEdit ? active : active.filter(e => e.id === user.id).concat(active.filter(e => e.id !== user.id)));
      setShifts(sh);
      setEntries(new Map(rows.map(r => [key(r.employeeId, r.date), r])));
    } catch (e) {
      console.error('[Roster] load failed', e);
      showToast('排班表加载失败 Could not load the roster', 'error');
    } finally {
      setLoading(false);
    }
  }, [days, canEdit, user.id, showToast]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const copyLastWeek = async () => {
    if (!window.confirm('把上周的排班复制到这周？这周已有的格子会被覆盖。\nCopy last week into this week?')) return;
    setCopying(true);
    try {
      const n = await hrService.copyRosterWeek(addDays(monday, -7), monday);
      showToast(n ? `已复制 ${n} 格 Copied` : '上周没有排班 Last week is empty', n ? 'success' : 'info');
      await load();
    } catch {
      showToast('复制失败 Copy failed', 'error');
    } finally {
      setCopying(false);
    }
  };

  const t = today();

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><CalendarRange className="text-indigo-500" /> 排班表 Roster</h1>
          <p className="text-sm text-slate-500 mt-1">
            {canEdit ? '点格子设定当天几点上班。准时/迟到会照这个时间算。' : '这周每天几点上班。准时/迟到照这个时间算。'}
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={copyLastWeek} disabled={copying}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            {copying ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} 复制上周 Copy last week
          </button>
        )}
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
        <button type="button" aria-label="Previous week" onClick={() => setMonday(addDays(monday, -7))} className="p-2.5 rounded-xl hover:bg-slate-50"><ChevronLeft size={20} /></button>
        <button type="button" onClick={() => setMonday(mondayOf(t))} className="text-sm font-bold text-slate-700">
          {short(days[0])} – {short(days[6])}
          {monday === mondayOf(t) ? <span className="ml-2 text-[11px] text-indigo-500">本周 This week</span> : <span className="ml-2 text-[11px] text-slate-400">回本周 Today</span>}
        </button>
        <button type="button" aria-label="Next week" onClick={() => setMonday(addDays(monday, 7))} className="p-2.5 rounded-xl hover:bg-slate-50"><ChevronRight size={20} /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left text-[11px] font-bold text-slate-400 px-3 py-3 w-24">员工</th>
                {days.map((d, i) => (
                  <th key={d} className={`text-center px-1 py-3 ${d === t ? 'bg-indigo-50' : ''}`}>
                    <span className={`block text-xs font-black ${d === t ? 'text-indigo-600' : 'text-slate-600'}`}>{WEEKDAY[i]}</span>
                    <span className="block text-[10px] font-semibold text-slate-400">{short(d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-t border-slate-50">
                  <td className={`sticky left-0 z-10 bg-white px-3 py-2 text-xs font-bold truncate max-w-[6rem] ${emp.id === user.id ? 'text-indigo-600' : 'text-slate-700'}`} title={emp.name}>
                    {emp.name}
                  </td>
                  {days.map(d => {
                    const e = entries.get(key(emp.id, d)) ?? null;
                    const cls = !e ? 'border border-dashed border-slate-200 text-slate-300'
                      : e.isOff ? 'bg-slate-100 text-slate-500'
                      : 'bg-indigo-500 text-white';
                    return (
                      <td key={d} className={`px-1 py-1.5 text-center ${d === t ? 'bg-indigo-50/60' : ''}`}>
                        <button type="button" disabled={!canEdit} onClick={() => setEditing({ emp, date: d })}
                          className={`w-full min-h-[44px] rounded-xl text-[11px] font-black leading-tight px-0.5 whitespace-pre-line ${cls} ${canEdit ? 'active:scale-95 transition-all' : 'cursor-default'}`}>
                          {e ? entryLabel(e).replace('-', '\n') : (canEdit ? '+' : '·')}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={8} className="text-center text-sm text-slate-400 py-10">还没有员工 No employees yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-indigo-500 inline-block" />排了时间</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-slate-200 inline-block" />休息</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded border border-dashed border-slate-300 inline-block" />空白 = 按固定班次</span>
      </div>

      {editing && (
        <RosterCellEditor
          employeeName={editing.emp.name}
          dateLabel={`星期${WEEKDAY[days.indexOf(editing.date)]} · ${editing.date}`}
          entry={entries.get(key(editing.emp.id, editing.date)) ?? null}
          shifts={shifts}
          onClose={() => setEditing(null)}
          onSave={async v => {
            try {
              await hrService.saveRosterEntry({ employeeId: editing.emp.id, date: editing.date, ...v });
              setEditing(null);
              await load();
            } catch {
              showToast('保存失败 Could not save', 'error');
            }
          }}
          onClear={async () => {
            try {
              await hrService.clearRosterEntry(editing.emp.id, editing.date);
              setEditing(null);
              await load();
            } catch {
              showToast('清空失败 Could not clear', 'error');
            }
          }}
        />
      )}
    </div>
  );
};

export default Roster;
