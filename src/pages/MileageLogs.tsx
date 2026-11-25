import React, { useState, useEffect, useMemo } from 'react';
import { Car, Download, RefreshCw, Users, X, Image as ImageIcon } from 'lucide-react';
import { hrService } from '../services/hrService';
import { MileageLog, Employee } from '../types';
import { exportMileageToXlsx } from '../utils/exportMileage';
import { useToast } from '../context/ToastContext';

interface Props { user?: any; }

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const fmtTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const MileageLogs: React.FC<Props> = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<MileageLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [since, setSince] = useState(daysAgo(30));
  const [until, setUntil] = useState(new Date().toISOString().split('T')[0]);
  const [empFilter, setEmpFilter] = useState('ALL');
  const [preview, setPreview] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, emps] = await Promise.all([
        hrService.listMileage({ since, until }),
        hrService.getEmployees(),
      ]);
      setRows(data);
      setEmployees(emps);
    } catch (e) {
      console.error('[MileageLogs] load failed:', e);
      showToast('加载里程记录失败', 'error');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [since, until]);

  const filtered = useMemo(
    () => (empFilter === 'ALL' ? rows : rows.filter(r => r.employeeId === empFilter)),
    [rows, empFilter]
  );
  const total = filtered.reduce((a, r) => a + (r.distance || 0), 0);

  const handleExport = () => {
    if (!filtered.length) { showToast('没有可导出的记录', 'warning'); return; }
    exportMileageToXlsx(filtered, employees, `mileage-${since}_to_${until}.xlsx`);
    showToast('已导出 Excel', 'success');
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-light rounded-xl text-primary"><Car size={20} /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">里程 Mileage</h1>
            <p className="text-xs text-slate-400">员工自驾车出外工作的里程记录</p>
          </div>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
          <Download size={16} /> 导出 Excel
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">从 From</span>
          <input type="date" value={since} onChange={e => setSince(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">到 To</span>
          <input type="date" value={until} onChange={e => setUntil(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
        </label>
        <label className="flex flex-col gap-1 min-w-[160px]">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">员工 Employee</span>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <option value="ALL">全部 All</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <button onClick={load} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">合计 Total</p>
          <p className="text-lg font-bold text-primary tabular-nums">{total} km</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-3 text-left">日期 Date</th>
                <th className="px-4 py-3 text-left">员工 Employee</th>
                <th className="px-4 py-3 text-right">出发 Start</th>
                <th className="px-4 py-3 text-right">返回 End</th>
                <th className="px-4 py-3 text-right">里程 km</th>
                <th className="px-4 py-3 text-center">照片 Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">加载中…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <Users size={28} className="mx-auto mb-2 text-slate-300" />没有里程记录
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.employeeName || r.employeeId}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.startReading ?? '—'}<span className="text-slate-300 text-xs block">{fmtTime(r.startAt)}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.endReading ?? '—'}<span className="text-slate-300 text-xs block">{fmtTime(r.endAt)}</span></td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{r.distance ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {r.startPhoto
                        ? <button onClick={() => setPreview(r.startPhoto!)} className="p-1 text-primary hover:bg-primary-light rounded" title="出发照片"><ImageIcon size={16} /></button>
                        : <span className="w-6" />}
                      {r.endPhoto
                        ? <button onClick={() => setPreview(r.endPhoto!)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="返回照片"><ImageIcon size={16} /></button>
                        : <span className="w-6" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo preview */}
      {preview && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-white p-2"><X size={24} /></button>
            <img src={preview} alt="odometer" className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MileageLogs;
