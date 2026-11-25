import React, { useEffect, useRef, useState } from 'react';
import { Car, Camera, Gauge, Check, X, Loader2 } from 'lucide-react';
import { MileageLog } from '../../types';
import { hrService } from '../../services/hrService';
import { compressMileagePhoto } from '../../services/mileage.service';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

interface Props {
  employeeId: string;
  employeeName?: string;
}

/**
 * Own-car mileage: snap the odometer + type the reading when you set out, and
 * again when you finish. Distance is computed from the two readings (no GPS).
 */
export const MileageCard: React.FC<Props> = ({ employeeId, employeeName }) => {
  const { showToast } = useToast();
  const { t } = useLang();
  const [trips, setTrips] = useState<MileageLog[]>([]);
  const [mode, setMode] = useState<'idle' | 'start' | 'end'>('idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setTrips(await hrService.getTodayMileage(employeeId)); }
    catch (e) { console.error('[MileageCard] load failed:', e); }
  };
  useEffect(() => { load(); }, [employeeId]);

  const openTrip = trips.find(t => t.startAt && !t.endAt);
  const doneTrips = trips.filter(t => t.endAt);
  const todayTotal = doneTrips.reduce((a, t) => a + (t.distance || 0), 0);

  const resetForm = () => { setMode('idle'); setPhoto(null); setReading(''); };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-pick of the same file
    if (!file) return;
    try { setPhoto(await compressMileagePhoto(file)); }
    catch (err) { console.error('[MileageCard] photo compress failed:', err); showToast(t('mile.photoFail'), 'error'); }
  };

  const readingNum = parseFloat(reading);
  const readingValid = !isNaN(readingNum) && readingNum >= 0;
  const endTooLow = mode === 'end' && openTrip?.startReading != null && readingValid && readingNum < openTrip.startReading;
  const canSubmit = !!photo && readingValid && !endTooLow && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (mode === 'start') {
        await hrService.startMileageTrip({ employeeId, employeeName, reading: readingNum, photo: photo! });
        showToast(t('mile.okStart'), 'success');
      } else if (mode === 'end' && openTrip) {
        await hrService.endMileageTrip(openTrip.id, readingNum, photo!);
        showToast(t('mile.okEnd'), 'success');
      }
      resetForm();
      await load();
    } catch (e) {
      console.error('[MileageCard] submit failed:', e);
      showToast(t('mile.fail'), 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white p-5 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-light rounded-lg text-primary"><Car size={14} /></div>
          <h3 className="font-semibold text-sm text-slate-900">{t('mile.title')}</h3>
        </div>
        {doneTrips.length > 0 && (
          <span className="text-xs font-semibold text-primary">{t('mile.today')} {todayTotal} km</span>
        )}
      </div>

      {/* Completed trips today */}
      {doneTrips.length > 0 && (
        <div className="divide-y divide-slate-50 mb-2">
          {doneTrips.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-500 tabular-nums">{t.startReading} → {t.endReading} km</span>
              <span className="font-semibold text-slate-900 tabular-nums">{t.distance} km</span>
            </div>
          ))}
        </div>
      )}

      {/* Open trip (started, not ended) */}
      {openTrip && mode !== 'end' && (
        <div className="flex items-center justify-between py-2 mb-1 text-sm">
          <span className="text-slate-500">{t('mile.startReading')} <span className="font-semibold text-slate-900 tabular-nums">{openTrip.startReading} km</span></span>
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">{t('mile.inProgress')}</span>
        </div>
      )}

      {/* Inline capture form */}
      {mode !== 'idle' && (
        <div className="mt-2 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Camera size={16} /> {photo ? t('mile.retake') : t('mile.takePhoto')}
          </button>
          {photo && <img src={photo} alt="odometer" className="w-full max-h-40 object-contain rounded-lg border border-slate-200" />}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
            <Gauge size={16} className="text-slate-400" />
            <input
              type="number" inputMode="decimal" value={reading}
              onChange={e => setReading(e.target.value)}
              placeholder={mode === 'start' ? t('mile.startPh') : t('mile.endPh')}
              className="flex-1 bg-transparent outline-none text-sm font-semibold tabular-nums"
            />
          </div>
          {endTooLow && <p className="text-xs text-rose-600">{t('mile.tooLow')} ({openTrip?.startReading} km)</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={!canSubmit}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {mode === 'start' ? t('mile.confirmStart') : t('mile.confirmEnd')}
            </button>
            <button onClick={resetForm} disabled={busy}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {mode === 'idle' && (
        <div className="mt-2">
          {openTrip ? (
            <button onClick={() => setMode('end')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              <Gauge size={16} /> {t('mile.end')}
            </button>
          ) : (
            <button onClick={() => setMode('start')}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              <Car size={16} /> {t('mile.start')}
            </button>
          )}
          <p className="mt-2 text-[11px] text-slate-400 text-center">{t('mile.hint')}</p>
        </div>
      )}
    </div>
  );
};
