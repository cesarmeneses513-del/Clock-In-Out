import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationStamp, ProjectSite } from '../types';

interface ShiftMapProps {
  site?: ProjectSite;
  locationIn?: LocationStamp;
  locationOut?: LocationStamp;
}

// Plain dots instead of Leaflet's image marker, whose asset URLs break when bundled
const dot = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:3px solid #ffffff;box-shadow:0 1px 6px rgba(15,23,42,0.5);color:#fff;font:800 10px/16px sans-serif;text-align:center">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

// Read-only map of a shift: the site geofence, where the worker clocked in (green) and out (red)
export const ShiftMap: React.FC<ShiftMapProps> = ({ site, locationIn, locationOut }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    if (site?.latitude !== undefined && site.longitude !== undefined) {
      const circle = L.circle([site.latitude, site.longitude], {
        radius: site.geofenceRadius || 150,
        color: '#2563eb',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.12,
      }).addTo(map);
      bounds.extend(circle.getBounds());
    }
    if (locationIn) {
      L.marker([locationIn.latitude, locationIn.longitude], { icon: dot('#059669', 'IN') })
        .bindTooltip('Clock in')
        .addTo(map);
      bounds.extend([locationIn.latitude, locationIn.longitude]);
    }
    if (locationOut) {
      L.marker([locationOut.latitude, locationOut.longitude], { icon: dot('#e11d48', 'OUT') })
        .bindTooltip('Clock out')
        .addTo(map);
      bounds.extend([locationOut.latitude, locationOut.longitude]);
    }
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });

    // The pop-up is still laying out when the map mounts
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
    };
  }, [site, locationIn, locationOut]);

  return <div ref={containerRef} className="isolate h-56 w-full rounded-xl border-2 border-slate-300 overflow-hidden" />;
};
