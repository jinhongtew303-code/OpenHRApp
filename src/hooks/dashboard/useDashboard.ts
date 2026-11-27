
import { useState, useEffect } from 'react';
import { hrService } from '../../services/hrService';
import { Employee, Attendance, LeaveBalance, Holiday, Team, AppConfig, LeaveWorkflow, CustomLeaveType, MileageLog } from '../../types';
import { DEFAULT_LEAVE_TYPES } from '../../constants';
import { locationPingService, LocationPing } from '../../services/locationPing.service';

export interface DashboardData {
  freshUser: Employee;
  activeShift?: Attendance;
  userBalance: LeaveBalance | null;
  leaveUsed: number;
  upcomingHoliday: Holiday | null;
  teamMembersCount: number;
  activeTeamMembers: number;
  teamInfo: Team | null;
  appConfig: AppConfig | null;
  myManager?: Employee;
  myTeamName: string;
  approverLabel: string;
  leaveTypes: CustomLeaveType[];
  /** Today's own punches (for the employee's location card: office → site → back). */
  myTodayAttendance: Attendance[];
  /** All of today's org punches (admin board: who's in, where, who's late). Empty for non-admins. */
  todayAttendance: Attendance[];
  /** Full employee list (admin board: shows who hasn't checked in). Empty for non-admins. */
  allEmployees: Employee[];
  /** Today's mileage trips org-wide (admin board). Empty for non-admins. */
  todayMileage: MileageLog[];
  /** Today's 30-minute location pings org-wide, oldest first (admin map). Empty for non-admins. */
  todayPings: LocationPing[];
}

export const useDashboard = (user: any) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = () => setReloadKey(k => k + 1);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
        const isManager = user.role === 'MANAGER' || user.role === 'TEAM_LEAD' || user.role === 'MANAGEMENT';

        // Dashboard only uses today's attendance (to count "present today").
        // Previously this pulled 30 days × whole-org = thousands of rows just
        // to filter down to ~today's <N>. Server-side filter is keyed by the
        // `date` column and the 2-min cache key is query-scoped, so this
        // coexists with wider queries from Reports / AttendanceLogs.
        // Local midnight, so pings line up with the boss's own "today".
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);

        const [active, balance, emps, leaves, hols, atts, teams, config, wfs, leaveTypes, milTrips, pings] = await Promise.all([
          hrService.getActiveAttendance(user.id),
          hrService.getLeaveBalance(user.id),
          hrService.getEmployees(),
          hrService.getLeaves(),
          hrService.getHolidays(),
          hrService.getAttendance({ since: today, until: today, maxRows: 500, skipSelfieUrls: true }),
          hrService.getTeams(),
          hrService.getConfig(),
          hrService.getWorkflows(),
          hrService.getLeaveTypes(),
          // Admin board only: today's mileage claims. Skip the query for others.
          isAdmin ? hrService.listMileage({ since: today, until: today }) : Promise.resolve([] as MileageLog[]),
          // Admin map only: today's position pings. A failure here must not break the board.
          isAdmin
            ? locationPingService.listSince(midnight.toISOString()).catch(err => {
                console.warn('Location pings unavailable', err);
                return [] as LocationPing[];
              })
            : Promise.resolve([] as LocationPing[]),
        ]);

        // CRITICAL: Find fresh user record
        const me = emps.find(e => e.id === user.id) || user;

        // 1. Calculate Stats
        const myUsedLeaves = leaves
          .filter(l => l.employeeId === user.id && l.status === 'APPROVED')
          .reduce((acc, curr) => acc + (curr.totalDays || 0), 0);

        const futureHols = hols
          .filter(h => h.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));

        // 2. Filter Team Members based on Role
        let visibleEmployees: Employee[] = [];
        let teamInfo: Team | null = null;

        if (isAdmin) {
          visibleEmployees = emps;
        } else if (isManager) {
          // STRICT MANAGER VISIBILITY:
          // 1. Find teams I lead
          const myLedTeams = teams.filter(t => t.leaderId === me.id);
          const myLedTeamIds = myLedTeams.map(t => t.id);
          
          // 2. Filter employees: Must report to me OR be in a team I lead
          visibleEmployees = emps.filter(e => 
            (e.teamId && myLedTeamIds.includes(e.teamId)) || 
            (e.lineManagerId === me.id)
          );
          
          // For Dashboard display, if I lead multiple teams, just show count. 
          // If I lead one, show that team name. If I lead none but have reports, show "Direct Reports".
          teamInfo = myLedTeams.length > 0 ? myLedTeams[0] : null;
        } else {
          // Employee: See peers in same team
          visibleEmployees = emps.filter(e => me.teamId && e.teamId === me.teamId);
        }

        const visibleIds = visibleEmployees.map(t => t.id);
        const presentToday = atts.filter(a => a.date === today && visibleIds.includes(a.employeeId));
        // This employee's own punches today, earliest first (office → site → back).
        const myTodayAttendance = atts
          .filter(a => a.date === today && a.employeeId === user.id)
          .sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));

        // 3. Context Info
        const myManager = emps.find(e => e.id === me.lineManagerId);
        const myTeamName = teams.find(t => t.id === me.teamId)?.name || 'Unassigned';
        const myWorkflow = wfs?.find((w: LeaveWorkflow) => w.department === me.department);
        const role = myWorkflow?.approverRole || 'LINE_MANAGER';
        const approverLabel = role === 'HR' ? 'HR Department' : (role === 'ADMIN' ? 'Admin' : 'Line Manager');

        setData({
          freshUser: me,
          activeShift: active,
          userBalance: balance,
          leaveUsed: myUsedLeaves,
          upcomingHoliday: futureHols[0] || null,
          teamMembersCount: visibleEmployees.length,
          activeTeamMembers: presentToday.length,
          teamInfo,
          appConfig: config,
          myManager,
          myTeamName,
          approverLabel,
          leaveTypes: leaveTypes || DEFAULT_LEAVE_TYPES,
          myTodayAttendance,
          todayAttendance: isAdmin ? atts.filter(a => a.date === today) : [],
          allEmployees: isAdmin ? emps : [],
          todayMileage: milTrips || [],
          todayPings: pings || [],
        });

      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.role, reloadKey]);

  return { data, isLoading, refetch };
};
