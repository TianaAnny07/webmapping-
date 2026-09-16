import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/Themecontext';
import { getCurrentPosition } from '../services/location';
import { getCachedFacilities } from '../services/api';
import { haversineKm } from '../services/Geo';

/** Reverse geocoding Nominatim (comme le web) : quartier + commune, ex. « Isada, Fianarantsoa » */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr&zoom=17`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'SanteGeoMG/1.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const a = data.address || {};
  const quartier = a.suburb || a.neighbourhood || a.quarter || null;
  const commune = a.town || a.village || a.city || a.municipality || null;
  const parts = [quartier, commune].filter(Boolean);
  return parts.join(', ') || data.display_name || null;
}

/** Code météo WMO (Open-Meteo) -> emoji, comme la version web */
function weatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌦️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

/**
 * Barre « 📍 quartier, ville + 🌡️ température du jour » (comme l'en-tête web).
 * - Se met à jour TOUTE SEULE dès que la localisation est activée
 *   (vérifie la permission toutes les 3 s pendant 1 minute max).
 * - Aucun cercle de chargement : rien ne cache la température.
 * - Un appui sur la pastille position force un rafraîchissement.
 */
export default function LocationWeatherBar() {
  const { colors } = useTheme();
  const [label, setLabel] = useState<string | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [icon, setIcon] = useState('☀️');
  const [cov, setCov] = useState<{ level: 'good' | 'medium' | 'low'; km: number } | null>(null);
  const [showCovMsg, setShowCovMsg] = useState(false);
  const okRef = useRef(false);
  const busyRef = useRef(false);

  const refresh = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const granted = await requestPermission();
      if (!granted) return;
      const coords = await getCurrentPosition();

      // Position précise : quartier + commune
      try {
        const l = await reverseGeocode(coords.latitude, coords.longitude);
        if (l) {
          setLabel(l);
          okRef.current = true;
        }
      } catch {
        /* lieu optionnel */
      }

      // Météo du jour (Open-Meteo, gratuite, sans clé)
      try {
        const wres = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true&timezone=auto`,
        );
        if (wres.ok) {
          const w = await wres.json();
          if (w.current_weather) {
            setTemp(Math.round(w.current_weather.temperature));
            setIcon(weatherIcon(w.current_weather.weathercode ?? 0));
          }
        }
      } catch {
        /* météo optionnelle */
      }

      // Couverture de la zone : distance au centre le plus proche
      try {
        const all = await getCachedFacilities();
        let min = Infinity;
        for (const f of all) {
          const d = haversineKm(coords.latitude, coords.longitude, f.latitude, f.longitude);
          if (d < min) min = d;
        }
        if (isFinite(min)) {
          const km = Math.round(min * 10) / 10;
          setCov({ level: km <= 2 ? 'good' : km <= 7 ? 'medium' : 'low', km });
        }
      } catch {
        /* couverture optionnelle */
      }
    } catch {
      /* silencieux */
    } finally {
      busyRef.current = false;
    }
  };

  // Demande la permission SANS bloquer : renvoie false si pas encore accordée
  async function requestPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Location.requestForegroundPermissionsAsync();
    return req.status === 'granted';
  }

  // Dès que l'utilisateur active la localisation (même plus tard), la barre se remplit
  useEffect(() => {
    refresh();
    let tries = 0;
    const it = setInterval(async () => {
      tries += 1;
      if (okRef.current || tries > 20) {
        clearInterval(it);
        return;
      }
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') refresh();
    }, 3000);
    return () => clearInterval(it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.row} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: colors.card }]}
        onPress={refresh}
      >
        <Ionicons name="location" size={13} color="#6DBE45" />
        <Text style={[styles.pillText, { color: colors.textPrimary }]} numberOfLines={1}>
          {label ?? 'Localisation…'}
        </Text>
      </TouchableOpacity>

      {temp != null && (
        <View style={[styles.pill, { backgroundColor: colors.card }]}>
          <Text style={styles.emoji}>{icon}</Text>
          <Text style={[styles.pillText, { color: colors.textPrimary }]}>{temp}°C</Text>
        </View>
      )}

      {/* Bouton couverture, à côté de la météo : affiche la phrase au toucher */}
      {cov && (
        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: cov.level === 'good' ? '#15803d' : cov.level === 'medium' ? '#b45309' : '#b91c1c' },
          ]}
          onPress={() => setShowCovMsg((s) => !s)}
        >
          <Text style={[styles.pillText, { color: '#fff' }]} numberOfLines={1}>
            {cov.level === 'good' ? '✅' : cov.level === 'medium' ? '🟡' : '⚠️'} Couverture
          </Text>
        </TouchableOpacity>
      )}

      {cov && showCovMsg && (
        <View
          style={[
            styles.covMsg,
            { backgroundColor: cov.level === 'good' ? '#15803d' : cov.level === 'medium' ? '#b45309' : '#b91c1c' },
          ]}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
            {cov.level === 'good'
              ? `Vous êtes dans une zone bien desservie : le centre le plus proche est à ${cov.km} km.`
              : cov.level === 'medium'
              ? `Couverture moyenne : le centre le plus proche est à ${cov.km} km.`
              : `Zone critique : le centre de santé le plus proche est à ${cov.km} km.`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute', top: 62, left: 16, right: 60, zIndex: 25,
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
    maxWidth: '70%',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  emoji: { fontSize: 13 },
  covMsg: {
    position: 'absolute', top: 42, left: 0, right: 0,
    borderRadius: 12, padding: 10, elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6,
  },
});
