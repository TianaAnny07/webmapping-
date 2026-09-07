import * as Location from 'expo-location';
import { haversineKm } from './Geo';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}


// SIMULATION DE TRAJET 

type GeoPoint = { latitude: number; longitude: number };

let simPoints: GeoPoint[] = [];
let simCum: number[] = [];      // distances cumulées (mètres)
let simTotal = 0;
let simTarget = 0;              // distance à parcourir (mètres)
let simSpeedKmh = 18;
const SIM_TICK_MS = 500; // pas de 0,5 s : avancée fluide le long du tracé vert
let simTimer: ReturnType<typeof setInterval> | null = null;
let simPos: GeoPoint | null = null;

export function isRouteSimulationActive(): boolean {
  return simTimer != null;
}

export function startRouteSimulation(points: GeoPoint[], speedKmh = 18): void {
  stopRouteSimulation();
  if (!points || points.length < 2) return;

  simPoints = points;
  simSpeedKmh = speedKmh;
  simCum = [0];
  for (let i = 1; i < points.length; i++) {
    simCum.push(
      simCum[i - 1] +
        haversineKm(points[i - 1].latitude, points[i - 1].longitude, points[i].latitude, points[i].longitude) * 1000,
    );
  }
  simTotal = simCum[simCum.length - 1];
  simTarget = 0;
  simPos = { ...points[0] };

  simTimer = setInterval(() => {
    simTarget += (simSpeedKmh / 3.6) * (SIM_TICK_MS / 1000);
    if (simTarget >= simTotal) {
      simPos = { ...simPoints[simPoints.length - 1] }; // arrivé au bout
      return;
    }
    // segment courant + interpolation
    let i = 1;
    while (i < simCum.length - 1 && simCum[i] < simTarget) i++;
    const segLen = Math.max(1, simCum[i] - simCum[i - 1]);
    const r = (simTarget - simCum[i - 1]) / segLen;
    const a = simPoints[i - 1];
    const b = simPoints[i];
    simPos = {
      latitude: a.latitude + (b.latitude - a.latitude) * r,
      longitude: a.longitude + (b.longitude - a.longitude) * r,
    };
  }, SIM_TICK_MS);
}

export function stopRouteSimulation(): void {
  if (simTimer) clearInterval(simTimer);
  simTimer = null;
  simPoints = [];
  simCum = [];
  simTotal = 0;
  simTarget = 0;
  simPos = null;
}

// =====================================================================

export async function getCurrentPosition() {
  if (simPos) return { ...simPos }; // en simulation, renvoie le point virtuel
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: location.coords.latitude, longitude: location.coords.longitude };
}

// Suivi continu : position simulée si démo active, sinon GPS réel.
export function watchPosition(callback: (coords: { latitude: number; longitude: number }) => void) {
  let lastReal: { latitude: number; longitude: number } | null = null;
  let realSub: { remove: () => void } | null = null;

  Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
    (loc) => {
      lastReal = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    },
  )
    .then((s) => {
      realSub = s;
    })
    .catch(() => {});

  const id = setInterval(() => {
    const p = simPos ?? lastReal;
    if (p) callback({ ...p });
  }, 500); // émission toutes les 0,5 s : déplacement fluide à l'écran

  return Promise.resolve({
    remove: () => {
      clearInterval(id);
      realSub?.remove();
    },
  });
}
