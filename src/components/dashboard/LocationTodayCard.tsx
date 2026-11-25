import React from 'react';
import { MapPin, Navigation, Ban, ExternalLink } from 'lucide-react';
import { Attendance } from '../../types';
import { isNoLocationRecord } from '../../utils/attendanceUtils';
import { useLang } from '../../context/LanguageContext';

interface Props {
  punches: Attendance[];   // today's punches, earliest first
}

const hasCoords = (a: Attendance) =>
  !!a.location && (a.location.lat !== 0 || a.location.lng !== 0) && !isNoLocationRecord(a);

/**
 * Employee's own location card: where they checked in today. Because each
 * check-in is its own punch, an office → site → office day shows as several
 * rows here. Check-out does not record a location by design, so this lists
 * check-in points only. No map API key needed — each point links to Google Maps.
 */
export const LocationTodayCard: React.FC<Props> = ({ punches }) => {
  const { t } = useLang();
  const withLocation = punches.filter(hasCoords);
  const gpsOff = punches.length > 0 && withLocation.length === 0;

  return (
    <div className="bg-white p-5 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-light rounded-lg text-primary"><MapPin size={14} /></div>
          <h3 className="font-semibold text-sm text-slate-900">{t('loc.title')}</h3>
        </div>
        {punches.length > 0 && (
          gpsOff ? (
            <span className="flex items-center gap-1 text-rose-500 text-xs font-semibold">
              <Ban size={12} /> {t('loc.gpsOff')}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
              <Navigation size={12} /> {t('loc.gpsOk')}
            </span>
          )
        )}
      </div>

      {punches.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">{t('loc.none')}</p>
      )}

      {gpsOff && (
        <p className="text-xs text-slate-400 py-1">{t('loc.none')}</p>
      )}

      <div className="space-y-2">
        {withLocation.map((p, i) => (
          <a
            key={p.id || i}
            href={`https://www.google.com/maps?q=${p.location!.lat},${p.location!.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary tabular-nums">{p.checkIn || '—'}</span>
              <MapPin size={16} className="text-primary mt-0.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-700 truncate">
                {p.location?.address || `${p.location!.lat.toFixed(5)}, ${p.location!.lng.toFixed(5)}`}
              </div>
              <div className="text-[10px] text-slate-400">{t('loc.map')}</div>
            </div>
            <ExternalLink size={14} className="text-slate-300 group-hover:text-primary flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
};
