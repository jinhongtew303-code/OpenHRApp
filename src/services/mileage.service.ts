import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import { MileageLog } from '../types';
import { convertToWebP } from '../utils/imageConvert';

const MILEAGE_WEBP_QUALITY = 0.6;
const MILEAGE_MAX_DIMENSION = 900;

const todayYMD = (): string => new Date().toISOString().split('T')[0];

/** Compress a camera photo (File or data URL) to a small inline webp data URL. */
export async function compressMileagePhoto(input: File | string): Promise<string> {
  const blob = await convertToWebP(input, MILEAGE_WEBP_QUALITY, MILEAGE_MAX_DIMENSION);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const mapMileage = (r: any): MileageLog => ({
  id: r.id,
  employeeId: r.employee_id ? String(r.employee_id).trim() : '',
  employeeName: r.employee_name,
  date: r.date,
  startReading: r.start_reading != null ? Number(r.start_reading) : undefined,
  startPhoto: r.start_photo || undefined,
  startAt: r.start_at || undefined,
  endReading: r.end_reading != null ? Number(r.end_reading) : undefined,
  endPhoto: r.end_photo || undefined,
  endAt: r.end_at || undefined,
  distance: r.distance != null ? Number(r.distance) : undefined,
  organizationId: r.organization_id,
});

export const mileageService = {
  /** This employee's trips for today, newest first. */
  async getToday(employeeId: string): Promise<MileageLog[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('mileage_log')
      .select('*')
      .eq('employee_id', employeeId.trim())
      .eq('date', todayYMD())
      .order('start_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapMileage);
  },

  /** Boss view: every trip visible to the caller (RLS-scoped), within a date range. */
  async list(opts?: { since?: string; until?: string }): Promise<MileageLog[]> {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from('mileage_log').select('*').order('date', { ascending: false }).order('start_at', { ascending: false });
    if (opts?.since) q = q.gte('date', opts.since);
    if (opts?.until) q = q.lte('date', opts.until);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapMileage);
  },

  /** Start a trip: record the starting odometer reading + photo. */
  async startTrip(args: { employeeId: string; employeeName?: string; reading: number; photo?: string }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    const { error } = await supabase.from('mileage_log').insert({
      organization_id: orgId,
      employee_id: args.employeeId.trim(),
      employee_name: args.employeeName,
      date: todayYMD(),
      start_reading: args.reading,
      start_photo: args.photo,
      start_at: new Date().toISOString(),
    });
    if (error) throw error;
    apiClient.notify();
  },

  /** End a trip: record the closing odometer reading + photo (distance computed in DB). */
  async endTrip(id: string, reading: number, photo?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('mileage_log')
      .update({ end_reading: reading, end_photo: photo, end_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    apiClient.notify();
  },

  async deleteTrip(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('mileage_log').delete().eq('id', id);
    if (error) throw error;
    apiClient.notify();
  },
};
