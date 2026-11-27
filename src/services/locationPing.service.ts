import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';

export interface LocationPing {
  id: string;
  employeeId: string;
  attendanceId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  createdAt: string;
}

const mapPing = (r: any): LocationPing => ({
  id: r.id,
  employeeId: r.employee_id ? String(r.employee_id).trim() : '',
  attendanceId: r.attendance_id || undefined,
  lat: Number(r.lat),
  lng: Number(r.lng),
  accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
  createdAt: r.created_at,
});

export const locationPingService = {
  /**
   * The employee's currently open punch (checked in, not yet checked out),
   * or null. A plain read — deliberately does not run session reconciliation,
   * so polling it every 30 minutes has no side effects.
   */
  async getOpenAttendance(employeeId: string): Promise<{ id: string; checkInAt: number } | null> {
    if (!isSupabaseConfigured()) return null;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('attendance')
      .select('id, check_in')
      .eq('employee_id', employeeId.trim())
      .is('check_out', null)
      .gte('check_in', since)
      .order('check_in', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return { id: String(data[0].id), checkInAt: new Date(data[0].check_in).getTime() };
  },

  /** Time of this employee's most recent ping, or null. */
  async getLastPingAt(employeeId: string): Promise<number | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('location_pings')
      .select('created_at')
      .eq('employee_id', employeeId.trim())
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? new Date(data[0].created_at).getTime() : null;
  },

  async record(args: { employeeId: string; attendanceId?: string | null; lat: number; lng: number; accuracy?: number }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('location_pings').insert({
      organization_id: apiClient.getOrganizationId(),
      employee_id: args.employeeId.trim(),
      attendance_id: args.attendanceId || null,
      lat: args.lat,
      lng: args.lng,
      accuracy: args.accuracy ?? null,
    });
    if (error) throw error;
  },

  /** Boss view: every ping visible to the caller (RLS-scoped) since a time, oldest first. */
  async listSince(sinceIso: string): Promise<LocationPing[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('location_pings')
      .select('*')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .limit(2000);
    if (error) throw error;
    return (data || []).map(mapPing);
  },
};
