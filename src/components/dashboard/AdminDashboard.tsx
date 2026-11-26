
import React, { useEffect } from 'react';
import {
  Users, MapPin, Car, AlertTriangle, List, CalendarDays,
  BarChart3, Building2, Circle, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react';
import { DashboardData } from '../../hooks/dashboard/useDashboard';
import { Attendance } from '../../types';
import { AdFrame } from '../ads/AdBanner';
import { TeamMap, TeamMapPoint } from './TeamMap';

interface Props {
  data: DashboardData;
  isLoading: boolean;
  onNavigate: (path: string, params?: any) => void;
  onRefresh?: () => void;
}

// "HH:mm" (or "HH:mm:ss") → minutes since midnight. Null if unparseable.
const toMinutes = (hhmm?: string): number | null => {
  if (!hhmm) return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
};

// Remove the internal [FACTORY]/[OUTSIDE]/[NO_LOCATION] tags for display.
const cleanRemarks = (r?: string) =>
  (r || '').replace(/\[(OFFICE|FACTORY|OUTSIDE|NO_LOCATION)\]/g, '').trim();

export const AdminDashboard: React.FC<Props> = ({ data, isLoading, onNavigate, onRefresh }) => {
  // Refresh the board every 30 minutes so new check-ins / locations appear
  // without the boss reopening the app.
  useEffect(() => {
    if (!onRefresh) return;
    const id = setInterval(onRefresh, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [onRefresh]);

  const cfg = data.appConfig;
  const emps = data.allEmployees || [];
  const today = data.todayAttendance || [];
  const mileage = data.todayMileage || [];

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const nameOf = (id: string, fallback?: string) =>
    emps.find(e => e.id === id)?.name || fallback || 'Unknown';

  const dutyLabel = (d?: string) =>
    d === 'FACTORY' ? (cfg?.dutyLabel2 || 'Factory')
      : d === 'OUTSIDE' ? (cfg?.dutyLabel3 || 'Outside')
        : (cfg?.dutyLabel1 || 'Office');

  // Late = record flagged LATE, or check-in later than office start + grace.
  const lateCutoff = (() => {
    const start = toMinutes(cfg?.officeStartTime);
    return start == null ? null : start + (cfg?.lateGracePeriod || 0);
  })();
  const punchIsLate = (a: Attendance) => {
    if (a.status === 'LATE') return true;
    if (lateCutoff == null) return false;
    const ci = toMinutes(a.checkIn);
    return ci != null && ci > lateCutoff;
  };

  // One row per employee who punched today (an employee can have several punches).
  const byEmp = new Map<string, Attendance[]>();
  today.forEach(a => {
    if (!a.checkIn && !a.checkOut) return;
    const arr = byEmp.get(a.employeeId) || [];
    arr.push(a);
    byEmp.set(a.employeeId, arr);
  });

  const rows = Array.from(byEmp.entries()).map(([empId, punches]) => {
    punches.sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));
    const openPunch = punches.find(p => p.checkIn && !p.checkOut);
    const ref = openPunch || punches[punches.length - 1];
    const lastOut = [...punches].reverse().find(p => p.checkOut)?.checkOut;
    return {
      empId,
      name: nameOf(empId, ref.employeeName),
      working: !!openPunch,
      firstIn: punches[0]?.checkIn,
      lastOut,
      late: punches.some(punchIsLate),
      duty: ref.dutyType,
      place: cleanRemarks(ref.remarks),
      location: ref.location,
    };
  }).sort((a, b) =>
    Number(b.working) - Number(a.working) || (a.firstIn || '').localeCompare(b.firstIn || ''));

  const workingCount = rows.filter(r => r.working).length;
  const lateCount = rows.filter(r => r.late).length;
  const mileTotal = mileage.reduce((s, m) => s + (m.distance || 0), 0);

  // Map pins: each employee's location-tagged check-ins today → latest pin +
  // today's route. Location is only captured at check-in.
  const mapByEmp = new Map<string, Attendance[]>();
  today.forEach(a => {
    if (!a.checkIn || !a.location || (a.location.lat === 0 && a.location.lng === 0)) return;
    const arr = mapByEmp.get(a.employeeId) || [];
    arr.push(a);
    mapByEmp.set(a.employeeId, arr);
  });
  const mapPoints: TeamMapPoint[] = Array.from(mapByEmp.entries()).map(([empId, ps]) => {
    ps.sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));
    const route = ps.map(p => ({ lat: p.location!.lat, lng: p.location!.lng, time: p.checkIn }));
    const last = route[route.length - 1];
    const r = rows.find(x => x.empId === empId);
    return {
      empId,
      name: nameOf(empId, ps[ps.length - 1].employeeName),
      lat: last.lat,
      lng: last.lng,
      time: last.time,
      working: r?.working,
      late: r?.late,
      route,
    };
  });

  // Active employees (excluding the boss themselves) who have no punch today.
  const notIn = emps.filter(e =>
    e.status === 'ACTIVE' && e.id !== data.freshUser.id && !byEmp.has(e.id));

  const stats = [
    { label: 'Working now', value: workingCount, icon: Circle, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Checked in', value: rows.length, icon: CheckCircle2, tone: 'text-primary bg-primary-light' },
    { label: 'Late', value: lateCount, icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Mileage (km)', value: mileTotal, icon: Car, tone: 'text-indigo-600 bg-indigo-50' },
  ];

  const quick = [
    { id: 'attendance-audit', label: 'Audit', icon: List },
    { id: 'leave', label: 'Leave', icon: CalendarDays },
    { id: 'mileage', label: 'Mileage', icon: Car },
    { id: 'employees', label: 'Team', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Header — no check-in buttons for the boss */}
      <header>
        {cfg?.companyName && (
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={12} className="text-primary" />
            <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em]">{cfg.companyName}</p>
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
          {data.freshUser.name}
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">{todayLabel}</p>
      </header>

      {/* Live stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.tone}`}>
              <s.icon size={16} />
            </div>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-none">{s.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-5 gap-2 p-1 bg-slate-100 rounded-xl">
        {quick.map(q => (
          <button
            key={q.id}
            onClick={() => onNavigate(q.id)}
            className="py-3 px-1 rounded-lg font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary hover:bg-white"
          >
            <q.icon size={16} /> <span className="truncate">{q.label}</span>
          </button>
        ))}
      </div>

      {/* Team map — where each person last checked in today */}
      {!isLoading && <TeamMap points={mapPoints} />}

      {/* Who's in today */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-light rounded-lg text-primary"><Users size={14} /></div>
            <h3 className="font-semibold text-sm text-slate-900">Who's in today</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {rows.length} / {emps.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-5 text-center text-xs text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No one has checked in yet today.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map(r => (
              <div key={r.empId} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.working ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                    {r.late && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full uppercase">
                        <Clock size={9} /> Late
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {dutyLabel(r.duty)}{r.place ? ` · ${r.place}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-bold text-slate-600 tabular-nums">
                    {r.working ? `In ${r.firstIn || '—'}` : `${r.firstIn || '—'} – ${r.lastOut || '—'}`}
                  </p>
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${r.working ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {r.working ? 'Working' : 'Done'}
                  </p>
                </div>
                {r.location && (r.location.lat !== 0 || r.location.lng !== 0) && (
                  <a
                    href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-light transition-colors"
                    title="Open location in Google Maps"
                  >
                    <MapPin size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && notIn.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Not checked in ({notIn.length})
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {notIn.map(e => e.name).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Mileage claimed today */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => onNavigate('mileage')}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Car size={14} /></div>
            <h3 className="font-semibold text-sm text-slate-900">Mileage today</h3>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px] font-bold tabular-nums">{mileTotal} km</span>
            <ArrowRight size={14} />
          </div>
        </button>

        {mileage.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No mileage claims today.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {mileage.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {nameOf(m.employeeId, m.employeeName)}
                </span>
                {m.endReading != null && m.distance != null ? (
                  <span className="text-[11px] font-bold text-indigo-600 tabular-nums">{m.distance} km</span>
                ) : (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                    In progress
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoading && <AdFrame placement="team_dashboards" />}
    </div>
  );
};

export default AdminDashboard;
