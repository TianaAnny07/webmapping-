import { useState, useCallback } from 'react';
import { haversineKm } from '../utils/geo';
import { getItinerary } from '../utils/osrm';

/**
 * Hook de mesure de distance entre deux points quelconques.
 * Ne dépend d'AUCUNE géolocalisation : les deux points viennent soit
 * d'un clic sur la carte, soit d'une sélection manuelle (ex: deux
 * établissements choisis dans une liste).
 */
export default function useDistanceMeasure() {
  const [active, setActive] = useState(false); // mode "mesure" activé/désactivé
  const [pointA, setPointA] = useState(null); // [lat, lon]
  const [pointB, setPointB] = useState(null); // [lat, lon]
  const [route, setRoute] = useState(null); // résultat OSRM (distance réelle par la route)
  const [mode, setMode] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Réinitialise complètement la mesure en cours. */
  const reset = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setRoute(null);
    setError(null);
  }, []);

  /** Active/désactive le mode "cliquer sur la carte pour mesurer". */
  const toggle = useCallback(() => {
    setActive((v) => {
      if (v) reset(); // en sortant du mode, on efface la mesure en cours
      return !v;
    });
  }, [reset]);

  /** Appelé quand l'utilisateur clique sur la carte en mode mesure. */
  const handlePointSelection = useCallback(
    (coords) => {
      if (!pointA) {
        setPointA(coords);
        setRoute(null);
        setError(null);
      } else if (!pointB) {
        setPointB(coords);
      } else {
        // Mesure déjà complète : nouveau clic repart de zéro
        setPointA(coords);
        setPointB(null);
        setRoute(null);
        setError(null);
      }
    },
    [pointA, pointB]
  );

  /** Fixe un point précis manuellement (ex: depuis une liste de villes/établissements). */
  const setPoint = useCallback((which, coords) => {
    if (which === 'A') setPointA(coords);
    else setPointB(coords);
    setRoute(null);
  }, []);

  /** Distance à vol d'oiseau (toujours disponible instantanément, sans réseau). */
  const straightLineKm =
    pointA && pointB ? haversineKm(pointA[0], pointA[1], pointB[0], pointB[1]) : null;

  /** Distance réelle par la route (appel OSRM), calculée à la demande. */
  const computeRoute = useCallback(
    async (travelMode = mode) => {
      if (!pointA || !pointB) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getItinerary(pointA[0], pointA[1], pointB[0], pointB[1], travelMode);
        setRoute(result);
        setMode(travelMode);
      } catch {
        setError("Impossible de calculer l'itinéraire pour le moment.");
        setRoute(null);
      } finally {
        setLoading(false);
      }
    },
    [pointA, pointB, mode]
  );

  return {
    active,
    toggle,
    pointA,
    pointB,
    route,
    mode,
    loading,
    error,
    straightLineKm,
    reset,
    setPoint,
    handleMapClick: handlePointSelection,
    computeRoute,
  };
}