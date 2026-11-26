
import React from 'react';
import { Wallet } from 'lucide-react';
import { Employee, LeaveRequest, LeavePolicy, CustomLeaveType } from '../../types';

interface Props {
  employees: Employee[];
  requests: LeaveRequest[];
  policy: LeavePolicy | null;
  leaveTypes: CustomLeaveType[];
}

/**
 * Admin-only overview: how many days of each balance-type leave every employee
 * has left. Remaining = quota (per-employee override, else org default) minus
 * the days already approved for that type — the same maths as getLeaveBalance,
 * computed here for the whole team at once so the boss sees it in one glance.
 */
export const TeamLeaveBalances: React.FC<Props> = ({ employees, requests, policy, leaveTypes }) => {
  const defaults = policy?.defaults ?? {};
  const overrides = policy?.overrides ?? {};
  const typeKeys = Object.keys(defaults);

  // Approved days used, keyed by `${employeeId}|${type}`.
  const used = new Map<string, number>();
  requests.filter(r => r.status === 'APPROVED').forEach(r => {
    const k = `${r.employeeId}|${r.type}`;
    used.set(k, (used.get(k) || 0) + (r.totalDays || 0));
  });

  const labelFor = (key: string) =>
    (leaveTypes.find(t => t.id === key)?.name || key).replace(/ Leave$/i, '');

  const staff = employees
    .filter(e => e.status === 'ACTIVE')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (typeKeys.length === 0 || staff.length === 0) return null;

  const remaining = (empId: string, type: string) => {
    const quota = (overrides[empId]?.[type] ?? defaults[type] ?? 0) as number;
    return quota - (used.get(`${empId}|${type}`) || 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary-light rounded-lg text-primary"><Wallet size={16} /></div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Leave Balances</h3>
          <p className="text-xs font-bold text-slate-400 mt-0.5">Days remaining per employee this year</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[360px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
              {typeKeys.map(k => (
                <th key={k} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  {labelFor(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map(e => (
              <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{e.name}</td>
                {typeKeys.map(k => {
                  const days = remaining(e.id, k);
                  return (
                    <td key={k} className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold tabular-nums ${days <= 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {days}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamLeaveBalances;
