// src/visitor/utils/osrm.js

import axios from 'axios';
import config from '../../config';
import { haversineKm } from './geo';

// Le serveur public OSRM (router.project-osrm.org) n'héberge qu'un seul
// profil réel : la voiture. Demander /walking/ ou /cycling/ sur ce serveur
// gratuit renvoie donc toujours le même tracé "voiture" — d'où des résultats
// identiques entre les modes. On récupère toujours ce tracé réel, puis on
// adapte la durée à une vitesse moyenne selon le mode choisi.
export const MODE_SPEEDS_KMH = {
  walking: 5,
  cycling: 40, // "Moto" dans l'interface
  driving: 45,
};

function mapRoute(route, speedKmh) {
  const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  const durationSeconds = (route.distance / 1000 / speedKmh) * 3600;
  const steps = (route.legs || []).flatMap((leg) =>
    (leg.steps || []).map((s) => ({
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
      distanceMeters: s.distance,
      location: [s.maneuver.location[1], s.maneuver.location[0]],
      streetName: s.name,
    }))
  );
  return {
    distanceMeters: route.distance,
    durationSeconds,
    geometry,
    steps,
  };
}

/**
 * Calcule un ou plusieurs itinéraires via OSRM.
 * Retourne { distanceMeters, durationSeconds, geometry, steps, options } où :
 * - les 4 premiers champs correspondent au trajet le plus court (compatibilité
 *   avec le code existant qui utilise directement le résultat)
 * - `options` est le tableau complet des itinéraires trouvés (triés du plus
 *   court au plus long), pour laisser le visiteur choisir s'il y en a plusieurs
 */
export async function getItinerary(fromLat, fromLon, toLat, toLon, mode = 'driving') {
  const url = `${config.OSRM_URL}/driving/${fromLon},${fromLat};${toLon},${toLat}`;
  const { data } = await axios.get(url, {
    params: { overview: 'full', geometries: 'geojson', steps: true, alternatives: true },
    timeout: 15000,
  });

  const routes = data?.routes || [];
  if (routes.length === 0) throw new Error('Aucun itinéraire trouvé.');

  const speedKmh = MODE_SPEEDS_KMH[mode] || MODE_SPEEDS_KMH.driving;
  const options = routes.map((route) => mapRoute(route, speedKmh)).sort((a, b) => a.distanceMeters - b.distanceMeters);

  return {
    ...options[0], // le plus court reste le choix par défaut
    options,
  };
}

/**
 * Itinéraire de secours en ligne droite, utilisé quand OSRM est injoignable
 * (connexion coupée, serveur down, timeout...). Pas de virage-par-virage,
 * juste la distance/temps estimé et un tracé direct vers la destination —
 * assez pour continuer à guider grossièrement le visiteur.
 */
export function buildFallbackRoute(fromLat, fromLon, toLat, toLon, mode = 'driving') {
  const distanceKm = haversineKm(fromLat, fromLon, toLat, toLon);
  const distanceMeters = distanceKm * 1000;
  const speedKmh = MODE_SPEEDS_KMH[mode] || MODE_SPEEDS_KMH.driving;
  const durationSeconds = (distanceKm / speedKmh) * 3600;

  return {
    distanceMeters,
    durationSeconds,
    geometry: [
      [fromLat, fromLon],
      [toLat, toLon],
    ],
    steps: [
      { type: 'depart', modifier: null, distanceMeters, location: [fromLat, fromLon], streetName: null },
      { type: 'arrive', modifier: null, distanceMeters: 0, location: [toLat, toLon], streetName: null },
    ],
    isFallback: true,
  };
}