import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TeamMapPoint {
  empId: string;
  name: string;
  lat: number;
  lng: number;
  time?: string;
  working?: boolean;
  late?: boolean;
  /** Today's check-in points in order, for the route polyline. */
  route: { lat: number; lng: number; time?: string }[];
}

interface Props {
  points: TeamMapPoint[];
}

// A small, stable palette so each person keeps a colour within one render.
const PALETTE = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2'];

/**
 * Boss-only team map. Each employee's latest known position (check-in or a
 * 30-minute ping) shows as a coloured pin; tapping a pin draws that person's
 * route for today, in order. Free OpenStreetMap tiles — no API key. Pings are
 * only sent while the employee's app is open, so gaps are possible.
 */
export const TeamMap: React.FC<Props> = ({ points }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { attributionControl: true, zoomControl: true })
      .setView([3.139, 101.6869], 11); // Kuala Lumpur fallback
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    // The card animates in; give layout a tick then fix the tile sizing.
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; routeRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers/route (keep the tile layer).
    map.eachLayer(layer => { if (!(layer instanceof L.TileLayer)) map.removeLayer(layer); });
    routeRef.current = null;

    if (points.length === 0) return;

    const drawRoute = (p: TeamMapPoint, color: string) => {
      if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }
      if (p.route.length < 2) return;
      // Dashed line through today's positions, with a small timed dot at each.
      const group = L.featureGroup();
      L.polyline(p.route.map(r => [r.lat, r.lng]) as [number, number][], {
        color, weight: 3, opacity: 0.7, dashArray: '6 6',
      }).addTo(group);
      p.route.slice(0, -1).forEach(r => {
        L.circleMarker([r.lat, r.lng], { radius: 4, color, weight: 2, fillColor: '#ffffff', fillOpacity: 1 })
          .bindTooltip(r.time || '', { direction: 'top' })
          .addTo(group);
      });
      group.addTo(map);
      routeRef.current = group;
    };

    const bounds: [number, number][] = [];
    points.forEach((p, i) => {
      const color = p.working ? '#059669' : PALETTE[i % PALETTE.length];
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 9, color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1,
      }).addTo(map);
      marker.bindPopup(
        `<div style="font-weight:700">${p.name}</div>` +
        `<div style="font-size:11px;color:#64748b">${p.working ? 'Working' : 'Checked out'}${p.late ? ' · Late' : ''}</div>` +
        (p.time ? `<div style="font-size:11px;color:#64748b">Last seen ${p.time}</div>` : '') +
        (p.route.length > 1 ? `<div style="font-size:11px;color:#2563eb;margin-top:2px">Tap pin for today's route</div>` : '')
      );
      marker.on('click', () => drawRoute(p, color));
      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length === 1) map.setView(bounds[0], 15);
    else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }, [points]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <h3 className="font-semibold text-sm text-slate-900">Team map</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {points.length} located · tap a pin for route
        </span>
      </div>
      {/* The map element is always rendered so Leaflet can initialise even
          before any points arrive; the empty-state sits on top. */}
      <div className="relative">
        <div ref={elRef} className="h-72 w-full" style={{ background: '#e2e8f0' }} />
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-slate-400">
            No location-tagged check-ins today.
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMap;
