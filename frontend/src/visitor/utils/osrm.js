

// import axios from 'axios';
// import config from '../../config';

// // Le serveur public OSRM (router.project-osrm.org) n'héberge qu'un seul

// const AVERAGE_SPEED_KMH = {
//   walking: 5,
//   cycling: 40, // "Moto" dans l'interface
//   driving: 45,
// };

// /**
//   Calcule un itinéraire via OSRM.
//   Retourne { distanceMeters, durationSeconds, geometry, steps } 
 
//  */
// export async function getItinerary(fromLat, fromLon, toLat, toLon, mode = 'driving') {
//   const url = `${config.OSRM_URL}/driving/${fromLon},${fromLat};${toLon},${toLat}`;
//   const { data } = await axios.get(url, {
//     params: { overview: 'full', geometries: 'geojson', steps: true },
//     timeout: 15000,
//   });

//   const route = data?.routes?.[0];
//   if (!route) throw new Error('Aucun itinéraire trouvé.');

//   const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
//   const speedKmh = AVERAGE_SPEED_KMH[mode] || AVERAGE_SPEED_KMH.driving;
//   const durationSeconds = (route.distance / 1000 / speedKmh) * 3600;

//   const steps = (route.legs || []).flatMap((leg) =>
//     (leg.steps || []).map((s) => ({
//       type: s.maneuver.type,
//       modifier: s.maneuver.modifier,
//       distanceMeters: s.distance,
//       location: [s.maneuver.location[1], s.maneuver.location[0]], // [lat, lon]
//       streetName: s.name,
//     }))
//   );

//   return {
//     distanceMeters: route.distance,
//     durationSeconds,
//     geometry,
//     steps,
//   };
// }

import axios from 'axios';
import config from '../../config';

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

/**
 * Calcule un itinéraire via OSRM.
 * Retourne { distanceMeters, durationSeconds, geometry, steps } où :
 * - geometry est un tableau de [lat, lon] prêt pour un <Polyline> Leaflet
 * - steps est la liste des instructions virage-par-virage (pour le guidage)
 */
export async function getItinerary(fromLat, fromLon, toLat, toLon, mode = 'driving') {
  const url = `${config.OSRM_URL}/driving/${fromLon},${fromLat};${toLon},${toLat}`;
  const { data } = await axios.get(url, {
    params: { overview: 'full', geometries: 'geojson', steps: true },
    timeout: 15000,
  });

  const route = data?.routes?.[0];
  if (!route) throw new Error('Aucun itinéraire trouvé.');

  const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  const speedKmh = MODE_SPEEDS_KMH[mode] || MODE_SPEEDS_KMH.driving;
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