import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'sante_madagascar_facilities';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

export function useFacilitiesCache() {
  const [cachedData, setCachedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger depuis le cache au démarrage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.timestamp || 0);
        if (age < CACHE_TTL_MS && parsed.data?.features?.length > 0) {
          setCachedData(parsed.data);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
      console.warn('Cache local illisible, on le ignore.', e);
      localStorage.removeItem(CACHE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveToCache = useCallback((features) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data: { features } })
      );
    } catch (e) {
      console.warn('Impossible de sauvegarder le cache local.', e);
    }
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setCachedData(null);
  }, []);

  return { cachedData, setCachedData, saveToCache, clearCache, isLoading, error };
}