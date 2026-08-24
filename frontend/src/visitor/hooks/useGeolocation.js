import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Gère la géolocalisation du visiteur :
 * - locateOnce() : demande une position ponctuelle
 * - startWatch(): démarre un suivi continu (mode navigation)
 * - stopWatch() : arrête le suivi
 *
 * Expose aussi :
 * - `accuracy`  : précision GPS en mètres (pour filtrer le bruit du capteur)
 * - `heading`   : cap de déplacement en degrés (0 = nord), fourni par le
 *                 navigateur quand l'appareil bouge et dispose d'un capteur
 *                 compatible. Peut être `null` si l'appareil est à l'arrêt
 *                 ou ne fournit pas cette donnée.
 */
export default function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [heading, setHeading] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef(null);

  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;

  // Limites approximatives de Madagascar
  const MADAGASCAR_BOUNDS = {
    latMin: -25.7,
    latMax: -11.9,
    lonMin: 43.2,
    lonMax: 50.9,
  };

  const isInMadagascar = (lat, lon) => {
    return (
      lat >= MADAGASCAR_BOUNDS.latMin &&
      lat <= MADAGASCAR_BOUNDS.latMax &&
      lon >= MADAGASCAR_BOUNDS.lonMin &&
      lon <= MADAGASCAR_BOUNDS.lonMax
    );
  };

  const applyPosition = (pos, setters) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    setters.setPosition([lat, lon]);
    setters.setAccuracy(pos.coords.accuracy ?? null);
    // heading n'est fiable que si l'appareil bouge réellement (speed > 0) ;
    // sinon le navigateur renvoie souvent NaN ou null.
    const hasReliableHeading = typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading);
    setters.setHeading(hasReliableHeading ? pos.coords.heading : null);

    // Vérifier si la position est dans Madagascar
    if (!isInMadagascar(lat, lon)) {
      const msg = `Position détectée hors de Madagascar (${lat.toFixed(2)}, ${lon.toFixed(2)}). Vérifiez que le GPS est activé et que vous êtes bien à Madagascar.`;
      setters.setError(msg);
    } else {
      setters.setError(null);
    }
  };

  const locateOnce = useCallback(
    (onSuccess, onError) => {
      if (!supported) {
        const msg = "La géolocalisation n'est pas disponible sur cet appareil.";
        setError(msg);
        onError?.(msg);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyPosition(pos, { setPosition, setAccuracy, setHeading, setError });
          onSuccess?.([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          let msg;
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = "Permission refusée. Autorisez la localisation dans les paramètres du navigateur.";
              break;
            case err.POSITION_UNAVAILABLE:
              msg = "Position indisponible. Vérifiez que le GPS est activé sur votre appareil.";
              break;
            case err.TIMEOUT:
              msg = "Délai dépassé. Le GPS met trop de temps à répondre, réessayez.";
              break;
            default:
              msg = `Erreur de localisation (code ${err.code}). Vérifiez les autorisations.`;
          }
          setError(msg);
          onError?.(msg);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
    [supported]
  );

  const startWatch = useCallback(() => {
    if (!supported || watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        applyPosition(pos, { setPosition, setAccuracy, setHeading, setError });
      },
      (err) => {
        let msg;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = "Permission refusée. Autorisez la localisation dans les paramètres du navigateur.";
            break;
          case err.POSITION_UNAVAILABLE:
            msg = "Signal GPS perdu. Vérifiez que le GPS est activé.";
            break;
          case err.TIMEOUT:
            msg = "Signal GPS trop lent. Réessayez en extérieur.";
            break;
          default:
            msg = "Signal de localisation perdu.";
        }
        setError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    setWatching(true);
  }, [supported]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  useEffect(() => {
    return () => stopWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { position, accuracy, heading, error, watching, locateOnce, startWatch, stopWatch, setPosition };
}