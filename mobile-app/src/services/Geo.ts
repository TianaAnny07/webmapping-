// Utilitaires géographiques — portage exact de frontend/src/visitor/utils/geo.js
// afin que les calculs de distance/itinéraire soient identiques entre web et mobile.

/** Distance en km entre deux points (formule de Haversine). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distance approximative (en mètres) entre un point et un itinéraire
 * (liste de [lat, lon]). Distance minimale vers chaque sommet de la
 * polyligne — suffisant pour détecter un écart important.
 */
export function distanceToRouteMeters(lat: number, lon: number, routeCoords: [number, number][]): number {
  if (!routeCoords || routeCoords.length === 0) return Infinity;
  let min = Infinity;
  for (const [rLat, rLon] of routeCoords) {
    const d = haversineKm(lat, lon, rLat, rLon) * 1000;
    if (d < min) min = d;
  }
  return min;
}

/** Cap initial (en degrés, 0 = Nord, sens horaire) du point 1 vers le point 2. */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Index du point de la polyligne le plus proche d'une position donnée. */
export function nearestRouteIndex(lat: number, lon: number, routeCoords: [number, number][]): number {
  if (!routeCoords || routeCoords.length === 0) return -1;
  let bestIdx = 0;
  let bestDist = Infinity;
  routeCoords.forEach(([rLat, rLon], idx) => {
    const d = haversineKm(lat, lon, rLat, rLon);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

/** Formate une distance en mètres en texte lisible (m ou km). */
export function formatDistance(meters?: number | null): string {
  if (meters == null || Number.isNaN(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Formate une durée en secondes en texte lisible (min ou h min). */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} h ${m > 0 ? m + ' min' : ''}`.trim();
}