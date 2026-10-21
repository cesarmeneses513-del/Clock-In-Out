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
const dot = (color: string, label: string) => {
  const width = label.length > 2 ? 34 : 24;
  return L.divIcon({
    className: '',
    html: `<div style="box-sizing:border-box;width:${width}px;height:24px;border-radius:9999px;background:${color};border:3px solid #ffffff;box-shadow:0 1px 6px rgba(15,23,42,0.5);color:#fff;font:800 10px/18px sans-serif;text-align:center">${label}</div>`,
    iconSize: [width, 24],
    iconAnchor: [width / 2, 12],
  });
};

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

    const valid = (lat?: number, lng?: number) => Number.isFinite(lat) && Number.isFinite(lng);
    // Bounds come from the coordinates: layers have no size until the map has a view
    const bounds = L.latLngBounds([]);
    if (site && valid(site.latitude, site.longitude)) {
      const radius = site.geofenceRadius || 150;
      L.circle([site.latitude!, site.longitude!], {
        radius,
        color: '#2563eb',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.12,
      }).addTo(map);
      bounds.extend(L.latLng(site.latitude!, site.longitude!).toBounds(radius * 2));
    }
    if (locationIn && valid(locationIn.latitude, locationIn.longitude)) {
      L.marker([locationIn.latitude, locationIn.longitude], { icon: dot('#059669', 'IN') })
        .bindTooltip('Clock in')
        .addTo(map);
      bounds.extend([locationIn.latitude, locationIn.longitude]);
    }
    if (locationOut && valid(locationOut.latitude, locationOut.longitude)) {
      L.marker([locationOut.latitude, locationOut.longitude], { icon: dot('#e11d48', 'OUT') })
        .bindTooltip('Clock out')
        .addTo(map);
      bounds.extend([locationOut.latitude, locationOut.longitude]);
    }
    const fit = () =>
      bounds.isValid() ? map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 }) : map.setView([-33.8688, 151.2093], 11);
    fit();

    // The pop-up is still laying out when the map mounts
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
      fit();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
    };
  }, [site, locationIn, locationOut]);

  return <div ref={containerRef} className="isolate h-56 w-full rounded-xl border-2 border-slate-300 overflow-hidden" />;
};
