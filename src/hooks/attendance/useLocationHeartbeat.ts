import { useEffect, useRef } from 'react';
import { locationPingService } from '../../services/locationPing.service';

const INTERVAL_MS = 30 * 60 * 1000;   // one ping every 30 minutes
const CHECK_EVERY_MS = 60 * 1000;     // cheap local check once a minute

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('no geolocation')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000,
    });
  });

/**
 * While a staff member is checked in, record their GPS position every
 * 30 minutes so the boss's team map shows where they are. Runs only while the
 * app is open (a web app cannot read location in the background); when the
 * app is reopened after a gap, it pings straight away. Stops on check-out.
 */
export function useLocationHeartbeat(user: { id: string; role?: string } | null | undefined) {
  const busy = useRef(false);
  // Earliest time the next ping is due. 0 = unknown, ask the server.
  const nextDueAt = useRef(0);

  const enabled = !!user && user.role !== 'ADMIN' && user.role !== 'HR';
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !userId) return;
    nextDueAt.current = 0;

    const tick = async () => {
      if (busy.current || document.visibilityState !== 'visible') return;
      if (nextDueAt.current && Date.now() < nextDueAt.current) return;
      busy.current = true;
      try {
        const open = await locationPingService.getOpenAttendance(userId);
        if (!open) {
          // Not checked in: look again in a few minutes.
          nextDueAt.current = Date.now() + 5 * 60 * 1000;
          return;
        }
        const lastPing = await locationPingService.getLastPingAt(userId);
        const last = Math.max(open.checkInAt, lastPing || 0);
        if (Date.now() - last < INTERVAL_MS) {
          nextDueAt.current = last + INTERVAL_MS;
          return;
        }
        const pos = await getPosition();
        await locationPingService.record({
          employeeId: userId,
          attendanceId: open.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        nextDueAt.current = Date.now() + INTERVAL_MS;
      } catch (err) {
        // GPS off / no signal / offline: try again in 5 minutes.
        console.warn('[location heartbeat] ping skipped', err);
        nextDueAt.current = Date.now() + 5 * 60 * 1000;
      } finally {
        busy.current = false;
      }
    };

    // Re-check immediately when the app comes back to the foreground, and
    // after any check-in / check-out (reset so the server is asked again).
    const onVisible = () => { if (document.visibilityState === 'visible') { nextDueAt.current = 0; tick(); } };
    document.addEventListener('visibilitychange', onVisible);

    tick();
    const id = setInterval(tick, CHECK_EVERY_MS);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, userId]);
}
