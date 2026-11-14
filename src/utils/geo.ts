import { LocationStamp } from '../types';

// Why the device location could not be read
export type LocationFailure = 'denied' | 'unavailable' | 'unsupported';

function readPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function toStamp(pos: GeolocationPosition): LocationStamp {
  return {
    latitude: Number(pos.coords.latitude.toFixed(6)),
    longitude: Number(pos.coords.longitude.toFixed(6)),
    accuracy: Math.round(pos.coords.accuracy),
    addressName: `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`,
    timestamp: new Date().toISOString(),
  };
}

export async function captureCurrentLocation(): Promise<{
  location?: LocationStamp;
  failure?: LocationFailure;
}> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { failure: 'unsupported' };
  }

  try {
    return { location: toStamp(await readPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })) };
  } catch (err) {
    if ((err as GeolocationPositionError).code === 1) return { failure: 'denied' };
  }

  // GPS often times out indoors: settle for the Wi-Fi / network position
  try {
    return { location: toStamp(await readPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 })) };
  } catch (err) {
    return { failure: (err as GeolocationPositionError).code === 1 ? 'denied' : 'unavailable' };
  }
}

// Location permission for this app, when the browser can tell without prompting
export async function getLocationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}

// Automatic geofence clock-out: ignore readings less precise than this, and require this many
// consecutive readings outside the site spread over at least this long
export const GEOFENCE_MAX_ACCURACY_M = 100;
export const GEOFENCE_CONFIRM_READINGS = 3;
export const GEOFENCE_CONFIRM_MS = 60_000;

export interface OutsideStreak {
  shiftId: string;
  count: number;
  since: number; // ms of the first reading outside
}

// One GPS reading against the site's geofence. Returns the new streak of readings outside
// (null when back inside) and whether the worker has now really left. Vague readings change nothing.
export function trackGeofenceExit(
  prev: OutsideStreak | null,
  shiftId: string,
  distanceM: number,
  accuracyM: number | undefined,
  radiusM: number,
  now: number
): { streak: OutsideStreak | null; left: boolean } {
  const accuracy = accuracyM ?? Infinity;
  if (accuracy > GEOFENCE_MAX_ACCURACY_M) return { streak: prev, left: false };
  // Outside only if even the nearest edge of the reading's error circle is beyond the radius
  if (distanceM - accuracy <= radiusM) return { streak: null, left: false };
  const streak =
    prev && prev.shiftId === shiftId ? { ...prev, count: prev.count + 1 } : { shiftId, count: 1, since: now };
  return {
    streak,
    left: streak.count >= GEOFENCE_CONFIRM_READINGS && now - streak.since >= GEOFENCE_CONFIRM_MS,
  };
}

// Calculate distance in meters between two coordinates (Haversine)
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Compute new coordinates at a specified distance in meters (useful for simulation)
export function offsetCoordinates(lat: number, lon: number, distanceMeters: number): { latitude: number; longitude: number } {
  // Approximate earth offsets: 1 deg lat ≈ 111,320m, 1 deg lon ≈ 111,320 * cos(lat)
  const deltaLat = distanceMeters / 111320;
  const deltaLon = distanceMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    latitude: Number((lat + deltaLat).toFixed(6)),
    longitude: Number((lon + deltaLon).toFixed(6)),
  };
}

// Real-time tracking wrapper
export function watchLocation(
  onLocation: (loc: LocationStamp) => void,
  onError?: (err: GeolocationPositionError) => void
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onLocation({
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy),
        addressName: `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`,
        timestamp: new Date().toISOString(),
      });
    },
    (err) => {
      if (onError) onError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
