// Weekly roster (table roster_entries, migration 0058). A database without the
// table is treated as "no roster", so the app keeps working unchanged there.
import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import { shiftService } from './shift.service';
import { organizationService } from './organization.service';
import { applyRoster, DayShift, RosterEntry, addDays } from '../utils/roster';

const isMissingTable = (error: any) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /roster_entries/.test(String(error.message || '')) && /does not exist|schema cache/.test(String(error.message || '')));

const mapEntry = (r: any): RosterEntry => ({
  id: r.id,
  employeeId: String(r.employee_id),
  date: r.date,
  startTime: r.start_time || undefined,
  endTime: r.end_time || undefined,
  isOff: !!r.is_off,
});

export const rosterService = {
  /** All entries between two dates (inclusive), for the whole organization or one person. */
  async getRoster(from: string, to: string, employeeId?: string): Promise<RosterEntry[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = apiClient.getOrganizationId();
    let q = supabase.from('roster_entries').select('*').gte('date', from).lte('date', to);
    if (orgId) q = q.eq('organization_id', orgId);
    if (employeeId) q = q.eq('employee_id', employeeId);
    const { data, error } = await q;
    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return (data ?? []).map(mapEntry);
  },

  async getEntry(employeeId: string, date: string): Promise<RosterEntry | null> {
    try {
      const rows = await rosterService.getRoster(date, date, employeeId);
      return rows[0] ?? null;
    } catch (e) {
      console.warn('[RosterService] roster lookup failed, using shift only', e);
      return null;
    }
  },

  /** Create or replace one cell. */
  async saveEntry(entry: RosterEntry): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    const { data: auth } = await supabase.auth.getSession();
    const { error } = await supabase.from('roster_entries').upsert({
      organization_id: orgId,
      employee_id: entry.employeeId,
      date: entry.date,
      start_time: entry.isOff ? null : entry.startTime || null,
      end_time: entry.isOff ? null : entry.endTime || null,
      is_off: entry.isOff,
      updated_at: new Date().toISOString(),
      updated_by: auth.session?.user.id ?? null,
    }, { onConflict: 'employee_id,date' });
    if (error) throw error;
    apiClient.notify();
  },

  async clearEntry(employeeId: string, date: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('roster_entries').delete().eq('employee_id', employeeId).eq('date', date);
    if (error) throw error;
    apiClient.notify();
  },

  /** Copy every entry of the week starting `fromMonday` into the week starting `toMonday`. */
  async copyWeek(fromMonday: string, toMonday: string): Promise<number> {
    const src = await rosterService.getRoster(fromMonday, addDays(fromMonday, 6));
    const offset = Math.round((new Date(toMonday).getTime() - new Date(fromMonday).getTime()) / 86400000);
    for (const e of src) {
      await rosterService.saveEntry({ ...e, id: undefined, date: addDays(e.date, offset) });
    }
    return src.length;
  },

  /**
   * Times that apply to one person on one day: roster entry, else assigned
   * shift, else default shift (company hours are the caller's last fallback).
   * Used for check-in late detection and display. The frozen workday session
   * manager keeps using shiftService.resolveShiftForEmployee directly.
   */
  async resolveShiftForDay(employeeId: string, employeeShiftId: string | undefined, date?: string): Promise<DayShift> {
    const day = date || new Date().toISOString().split('T')[0];
    const [base, entry, config] = await Promise.all([
      shiftService.resolveShiftForEmployee(employeeId, employeeShiftId, day),
      rosterService.getEntry(employeeId, day),
      organizationService.getConfig().catch(() => null),
    ]);
    return applyRoster(base, entry, config);
  },
};
