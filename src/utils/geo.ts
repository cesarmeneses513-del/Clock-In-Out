import { LocationStamp } from '../types';

export async function captureCurrentLocation(): Promise<LocationStamp | undefined> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return undefined;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          addressName: `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`,
          timestamp: new Date().toISOString(),
        });
      },
      () => {
        // Fallback gracefully without blocking the punch
        resolve(undefined);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
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
