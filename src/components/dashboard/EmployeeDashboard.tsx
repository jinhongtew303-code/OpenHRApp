
import React from 'react';
import { Network, User, Plus, ArrowRight, MapPin } from 'lucide-react';
import { DashboardData } from '../../hooks/dashboard/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStats } from './DashboardStats';
import { WorkdayTodayCard } from './WorkdayTodayCard';
import { LocationTodayCard } from './LocationTodayCard';
import { MileageCard } from './MileageCard';
import { AdFrame } from '../ads/AdBanner';

interface Props {
  data: DashboardData;
  isLoading: boolean;
  onNavigate: (path: string, params?: any) => void;
  onRefresh?: () => void;
}

export const EmployeeDashboard: React.FC<Props> = ({ data, isLoading, onNavigate, onRefresh }) => {
  // The open session for the break card. `activeShift` (from the frozen
  // reconcile path) has the correct id but raw ISO times and no break fields;
  // the matching row in `myTodayAttendance` has HH:MM times + break_start/end,
  // so prefer it for display while keeping the same id for the break action.
  const todayShift = data.activeShift
    ? (data.myTodayAttendance.find(a => String(a.id) === String(data.activeShift!.id)) ?? data.activeShift)
    : undefined;
  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700">
      <DashboardHeader
        user={data.freshUser}
        activeShift={data.activeShift}
        appConfig={data.appConfig}
        isLoading={isLoading}
        onNavigate={onNavigate}
      />

      {!isLoading && (
        <WorkdayTodayCard shift={todayShift} appConfig={data.appConfig} onChanged={() => onRefresh?.()} />
      )}

      {!isLoading && data.activeShift && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
          <MapPin size={14} className="flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold leading-snug">
            Location sharing is on while you're checked in: your position is sent every 30 minutes while this app is open. Keep the app open during work. It stops when you check out.
          </p>
        </div>
      )}

      {!isLoading && (
        <LocationTodayCard punches={data.myTodayAttendance} />
      )}

      {!isLoading && (
        <MileageCard employeeId={data.freshUser.id} employeeName={data.freshUser.name} />
      )}

      <DashboardStats
        leaveUsed={data.leaveUsed}
        upcomingHoliday={data.upcomingHoliday}
        isLoading={isLoading}
      />

      {/* Employee Specific Content - Mobile Optimized Grid */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 animate-in slide-in-from-bottom-4">
           
           {/* 1. My Team (Top Left) */}
           <div className="bg-white p-4 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center gap-1.5 min-h-[90px]">
              <div className="flex items-center gap-2 text-primary">
                 <div className="p-1.5 bg-primary-light rounded-lg"><Network size={14} /></div>
                 <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">Team</span>
              </div>
              <h3 className="font-semibold text-slate-800 text-xs md:text-sm line-clamp-2 leading-tight pl-1" title={data.myTeamName}>
                {data.myTeamName}
              </h3>
           </div>

           {/* 2. Reports To (Top Right) */}
           <div className="bg-white p-4 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center gap-1.5 min-h-[90px]">
              <div className="flex items-center gap-2 text-primary">
                 <div className="p-1.5 bg-primary-light rounded-lg"><User size={14} /></div>
                 <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">Manager</span>
              </div>
              <h3 className="font-semibold text-slate-800 text-xs md:text-sm line-clamp-2 leading-tight pl-1">
                {data.myManager?.name || 'No Manager'}
              </h3>
           </div>

           {/* 3. Leave Action (Bottom Full Width - Compact) */}
           <button 
             onClick={() => onNavigate('leave', { autoOpen: true })}
             className="col-span-2 w-full py-3.5 px-5 bg-primary text-white rounded-2xl md:rounded-[1.5rem] shadow-lg shadow-primary-light/50 flex items-center justify-between active:scale-[0.98] transition-all group border border-white/10"
           >
              <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg group-hover:rotate-90 transition-transform duration-500">
                    <Plus size={14} className="text-white" />
                 </div>
                 <div className="text-left">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">New Request</span>
                 </div>
              </div>
              
              <div className="flex items-center gap-2 text-[9px] font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                 <span>Apply Leave</span>
                 <ArrowRight size={14} />
              </div>
           </button>
        </div>
      )}

      {/* Renders nothing for paid organizations or while this placement is off. */}
      {!isLoading && <AdFrame placement="employee_dashboard" />}
    </div>
  );
};
