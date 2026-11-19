import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ChevronDown, Search, X } from 'lucide-react';
import { User, Employee } from '../../types';
import { hrService } from '../../services/hrService';

/**
 * Boss-only "View as employee" controls.
 *
 * Lets an ADMIN/HR pick any employee in their organization and see the app
 * exactly as that employee sees it. This is purely a front-end view switch:
 * the real boss stays authenticated (AuthContext untouched), and every page
 * is simply handed the chosen employee as its "current user". A banner makes
 * the impersonation obvious and offers a one-tap exit.
 */

interface ViewAsControlsProps {
  realUser: User;              // the actually-logged-in boss
  viewingAs: User | null;      // the employee currently being viewed, or null
  onEnter: (emp: User) => void;
  onExit: () => void;
  /** "picker" = the header button+dropdown; "banner" = the full-width impersonation bar. */
  mode: 'picker' | 'banner';
}

const isBoss = (role: string) => role === 'ADMIN' || role === 'HR';

const ViewAsControls: React.FC<ViewAsControlsProps> = ({ realUser, viewingAs, onEnter, onExit, mode }) => {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const list = await hrService.getEmployees();
      // Don't offer the boss themselves; only real staff accounts.
      setEmployees(list.filter((e) => e.id !== realUser.id));
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && employees.length === 0) void loadEmployees();
  };

  // Only a real boss may use these controls at all.
  if (!isBoss(realUser.role)) return null;

  const impersonating = !!viewingAs && viewingAs.id !== realUser.id;

  // ── Banner mode: full-width bar, only while impersonating ────────────────
  if (mode === 'banner') {
    if (!impersonating) return null;
    return (
      <div className="sticky top-20 z-30 flex items-center justify-between gap-3 bg-amber-500 text-white px-4 sm:px-6 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={18} className="flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            正在以 <strong>{viewingAs?.name}</strong> 的身份查看
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors flex-shrink-0"
        >
          <EyeOff size={16} />
          退出
        </button>
      </div>
    );
  }

  // ── Picker mode: header button + dropdown, hidden while impersonating ────
  if (impersonating) return null;

  const filtered = employees.filter((e) =>
    (e.name + ' ' + (e.email ?? '') + ' ' + (e.employeeId ?? '')).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-100 transition-all text-sm font-medium"
        title="以员工身份查看"
      >
        <Eye size={18} />
        <span className="hidden sm:inline">查看员工</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">以员工身份查看</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="p-2">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 rounded-xl">
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索员工…"
                className="bg-transparent text-sm w-full outline-none text-slate-700"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto pb-2">
            {loading && <div className="px-4 py-6 text-center text-sm text-slate-400">载入中…</div>}
            {!loading && filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">没有员工</div>
            )}
            {!loading &&
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    onEnter(emp);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <img
                    src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}`}
                    alt={emp.name}
                    className="w-9 h-9 rounded-full bg-slate-100 object-cover flex-shrink-0"
                    width={36}
                    height={36}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{emp.name}</div>
                    <div className="text-xs text-slate-400 truncate">{emp.designation || emp.role}</div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAsControls;
