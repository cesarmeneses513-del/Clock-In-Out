import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SiteMapPickerProps {
  // Undefined while the site has no location: the map opens on Sydney with no pin
  latitude?: number;
  longitude?: number;
  radius: number; // geofence radius in metres
  editable: boolean;
  onPick: (latitude: number, longitude: number) => void;
}

// Plain dot instead of Leaflet's image marker, whose asset URLs break when bundled
const PIN_ICON = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 1px 6px rgba(15,23,42,0.5)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const SYDNEY: L.LatLngTuple = [-33.8688, 151.2093];

// Map of the site centre and its geofence; click or drag the pin to move the centre
export const SiteMapPicker: React.FC<SiteMapPickerProps> = ({
  latitude,
  longitude,
  radius,
  editable,
  onPick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current) return;

    // Wheel zoom is off so scrolling the form does not get trapped by the map
    const hasLocation = latitude !== undefined && longitude !== undefined;
    const centre: L.LatLngTuple = hasLocation ? [latitude, longitude] : SYDNEY;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(centre, hasLocation ? 16 : 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const circle = L.circle(centre, {
      radius,
      color: '#2563eb',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 0.12,
    });
    const marker = L.marker(centre, { icon: PIN_ICON, draggable: editable });
    if (hasLocation) {
      circle.addTo(map);
      marker.addTo(map);
      map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 18 });
    }

    if (editable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      });
      marker.on('drag', () => circle.setLatLng(marker.getLatLng()));
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPickRef.current(pos.lat, pos.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    // The pop-up is still laying out when the map mounts
    const resizeTimer = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Follow the centre when it changes (address search, GPS capture, click or drag)
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;
    if (latitude === undefined || longitude === undefined) {
      marker.remove();
      circle.remove();
      return;
    }
    const centre: L.LatLngTuple = [latitude, longitude];
    marker.setLatLng(centre);
    circle.setLatLng(centre);
    const wasHidden = !map.hasLayer(circle);
    if (wasHidden) {
      circle.addTo(map);
      marker.addTo(map);
    }
    if (wasHidden || !map.getBounds().pad(-0.2).contains(centre)) {
      map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 18 });
    }
  }, [latitude, longitude]);

  // Keep the whole geofence in view when the radius changes
  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;
    circle.setRadius(radius);
    if (map.hasLayer(circle)) {
      map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 18 });
    }
  }, [radius]);

  return (
    <div
      ref={containerRef}
      className="isolate h-56 w-full rounded-xl border-2 border-slate-300 overflow-hidden"
    />
  );
};
