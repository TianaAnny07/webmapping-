import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Gère la géolocalisation du visiteur :
 * - position()  : demande une position ponctuelle
 * - startWatch(): démarre un suivi continu (mode navigation)
 * - stopWatch() : arrête le suivi
 */
export default function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef(null);

  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;

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
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setPosition(coords);
          setError(null);
          onSuccess?.(coords);
        },
        () => {
          const msg = "Impossible d'obtenir votre position. Vérifiez les autorisations.";
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
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setError(null);
      },
      () => setError('Signal de localisation perdu.'),
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

  return { position, error, watching, locateOnce, startWatch, stopWatch };
}
