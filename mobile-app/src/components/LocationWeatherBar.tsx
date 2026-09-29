
// import { useEffect, useRef, useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import * as Location from 'expo-location';
// import { useTheme } from '../context/Themecontext';
// import { getCurrentPosition } from '../services/location';
// import { getCachedFacilities } from '../services/api';
// import { haversineKm } from '../services/Geo';

// /** Reverse geocoding Nominatim : quartier + commune, ex. « Isada, Fianarantsoa » */
// async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
//   const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr&zoom=17`;
//   const res = await fetch(url, {
//     headers: { Accept: 'application/json', 'User-Agent': 'SanteGeoMG/1.0' },
//   });
//   if (!res.ok) return null;
//   const data = await res.json();
//   const a = data.address || {};
//   const quartier = a.suburb || a.neighbourhood || a.quarter || null;
//   const commune = a.town || a.village || a.city || a.municipality || null;
//   const parts = [quartier, commune].filter(Boolean);
//   return parts.join(', ') || data.display_name || null;
// }

// function weatherIcon(code: number): string {
//   if (code === 0) return '☀️';
//   if (code === 1 || code === 2) return '🌤️';
//   if (code === 3) return '☁️';
//   if (code >= 45 && code <= 48) return '🌫️';
//   if (code >= 51 && code <= 67) return '🌦️';
//   if (code >= 71 && code <= 77) return '❄️';
//   if (code >= 80 && code <= 82) return '🌧️';
//   if (code >= 95) return '⛈️';
//   return '🌡️';
// }

// export interface CovMessage {
//   text: string;
//   color: string;
// }

// /**
//  * Barre du haut : 📍 · ️ · Couvert/Moyenne/Critique.
//  * - Avant activation : « Madagascar » seulement.
//  * - Appui sur le badge : le message remplace la barre de recherche pendant 6 s
//  *   (géré par MapScreen via onCovMsg), puis la barre de recherche revient.
//  */
// export default function LocationWeatherBar({
//   onCovMsg,
// }: {
//   onCovMsg?: (msg: CovMessage | null) => void;
// }) {
//   const { colors } = useTheme();
//   const [label, setLabel] = useState<string | null>(null);
//   const [temp, setTemp] = useState<number | null>(null);
//   const [icon, setIcon] = useState('☀️');
//   const [cov, setCov] = useState<{ level: 'good' | 'medium' | 'low'; km: number } | null>(null);
//   const [showCovMsg, setShowCovMsg] = useState(false);
//   const okRef = useRef(false);
//   const busyRef = useRef(false);

//   const covText = (c: { level: 'good' | 'medium' | 'low'; km: number }) =>
//     c.level === 'good'
//       ? `Vous êtes dans une zone bien desservie : le centre le plus proche est à ${c.km} km.`
//       : c.level === 'medium'
//       ? `Couverture moyenne : le centre le plus proche est à ${c.km} km.`
//       : `Zone critique : le centre de santé le plus proche est à ${c.km} km.`;

//   const covColor =
//     cov?.level === 'good' ? '#15803d' : cov?.level === 'medium' ? '#b45309' : '#b91c1c';

//   // Appui sur Couvert/Moyenne/Critique : le message prend la place de la recherche,
//   // puis tout revient après 6 secondes.
//   const toggleCovMsg = () => {
//     if (!cov) return;
//     const next = !showCovMsg;
//     setShowCovMsg(next);
//     if (next) {
//       onCovMsg?.({ text: covText(cov), color: covColor });
//       setTimeout(() => {
//         setShowCovMsg(false);
//         onCovMsg?.(null);
//       }, 6000);
//     } else {
//       onCovMsg?.(null);
//     }
//   };

//   const refresh = async (ask = false) => {
//     if (busyRef.current) return;
//     busyRef.current = true;
//     try {
//       const granted = ask
//         ? await requestPermission()
//         : (await Location.getForegroundPermissionsAsync()).status === 'granted';
//       if (!granted) return;
//       const coords = await getCurrentPosition();

//       try {
//         const l = await reverseGeocode(coords.latitude, coords.longitude);
//         if (l) {
//           setLabel(l);
//           okRef.current = true;
//         }
//       } catch {
//         /* lieu optionnel */
//       }

//       try {
//         const wres = await fetch(
//           `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true&timezone=auto`,
//         );
//         if (wres.ok) {
//           const w = await wres.json();
//           if (w.current_weather) {
//             setTemp(Math.round(w.current_weather.temperature));
//             setIcon(weatherIcon(w.current_weather.weathercode ?? 0));
//           }
//         }
//       } catch {
//         /* météo optionnelle */
//       }

//       try {
//         const all = await getCachedFacilities();
//         let min = Infinity;
//         for (const f of all) {
//           const d = haversineKm(coords.latitude, coords.longitude, f.latitude, f.longitude);
//           if (d < min) min = d;
//         }
//         if (isFinite(min)) {
//           const km = Math.round(min * 10) / 10;
//           setCov({ level: km <= 2 ? 'good' : km <= 7 ? 'medium' : 'low', km });
//         }
//       } catch {
//         /* couverture optionnelle */
//       }
//     } catch {
//       /* silencieux */
//     } finally {
//       busyRef.current = false;
//     }
//   };

//   async function requestPermission(): Promise<boolean> {
//     const { status } = await Location.getForegroundPermissionsAsync();
//     if (status === 'granted') return true;
//     const req = await Location.requestForegroundPermissionsAsync();
//     return req.status === 'granted';
//   }

//   // Se met à jour dès que la localisation est activée
//   useEffect(() => {
//     refresh(false);
//     let tries = 0;
//     const it = setInterval(async () => {
//       tries += 1;
//       if (okRef.current || tries > 60) {
//         clearInterval(it);
//         return;
//       }
//       const { status } = await Location.getForegroundPermissionsAsync();
//       if (status === 'granted') refresh(false);
//     }, 3000);
//     return () => clearInterval(it);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <View style={styles.wrap} pointerEvents="box-none">
//       <View style={styles.row}>
//         <TouchableOpacity
//           style={[styles.pill, { backgroundColor: colors.card, flexShrink: 1 }]}
//           onPress={() => refresh(true)}
//         >
//           <Ionicons name="location" size={13} color="#6DBE45" />
//           <Text style={[styles.pillText, { color: colors.textPrimary }]} numberOfLines={1}>
//             {label ?? 'Madagascar'}
//           </Text>
//         </TouchableOpacity>

//         {temp != null && (
//           <View style={[styles.pill, { backgroundColor: colors.card }]}>
//             <Text style={styles.emoji}>{icon}</Text>
//             <Text style={[styles.pillText, { color: colors.textPrimary }]}>{temp}°C</Text>
//           </View>
//         )}

//         {/* Badge texte seul, sans emoji */}
//         {cov && (
//           <TouchableOpacity
//             style={[styles.pill, { backgroundColor: covColor }]}
//             onPress={toggleCovMsg}
//           >
//             <View style={styles.dot} />
//             <Text style={[styles.pillText, { color: '#fff' }]} numberOfLines={1}>
//               {cov.level === 'good' ? 'Couvert' : cov.level === 'medium' ? 'Moyenne' : 'Critique'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: { position: 'absolute', top: 62, left: 16, right: 60, zIndex: 25 },
//   row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   pill: {
//     flexDirection: 'row', alignItems: 'center', gap: 6,
//     borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
//     elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
//   },
//   pillText: { fontSize: 12, fontWeight: '700' },
//   emoji: { fontSize: 13 },
//   dot: {
//     width: 8, height: 8, borderRadius: 4,
//     backgroundColor: 'rgba(255,255,255,.9)',
//   },
// });
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/Themecontext';
import { getCurrentPosition } from '../services/location';
import { getCachedFacilities } from '../services/api';
import { haversineKm } from '../services/Geo';

/** Reverse geocoding Nominatim : quartier + commune, ex. « Isada, Fianarantsoa » */
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

export interface CovMessage {
  text: string;
  color: string;
}

/**
 * Barre du haut : 📍 · ️ · Couvert/Moyenne/Critique.
 * - Avant activation : « Madagascar » seulement.
 * - Appui sur le badge : le message remplace la barre de recherche pendant 6 s
 *   (géré par MapScreen via onCovMsg), puis la barre de recherche revient.
 */
export default function LocationWeatherBar({
  onCovMsg,
}: {
  onCovMsg?: (msg: CovMessage | null) => void;
}) {
  const { colors } = useTheme();
  const [label, setLabel] = useState<string | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [icon, setIcon] = useState('☀️');
  const [cov, setCov] = useState<{ level: 'good' | 'medium' | 'low'; km: number } | null>(null);
  const [showCovMsg, setShowCovMsg] = useState(false);
  const okRef = useRef(false);
  const busyRef = useRef(false);

  const covText = (c: { level: 'good' | 'medium' | 'low'; km: number }) =>
    c.level === 'good'
      ? `Vous êtes dans une zone bien desservie : le centre le plus proche est à ${c.km} km.`
      : c.level === 'medium'
      ? `Couverture moyenne : le centre le plus proche est à ${c.km} km.`
      : `Zone critique : le centre de santé le plus proche est à ${c.km} km.`;

  const covColor =
    cov?.level === 'good' ? '#15803d' : cov?.level === 'medium' ? '#b45309' : '#b91c1c';

  // Appui sur Couvert/Moyenne/Critique : le message prend la place de la recherche,
  // puis tout revient après 6 secondes.
  const toggleCovMsg = () => {
    if (!cov) return;
    const next = !showCovMsg;
    setShowCovMsg(next);
    if (next) {
      onCovMsg?.({ text: covText(cov), color: covColor });
      setTimeout(() => {
        setShowCovMsg(false);
        onCovMsg?.(null);
      }, 6000);
    } else {
      onCovMsg?.(null);
    }
  };

  const refresh = async (ask = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const granted = ask
        ? await requestPermission()
        : (await Location.getForegroundPermissionsAsync()).status === 'granted';
      if (!granted) return;
      const coords = await getCurrentPosition();

      try {
        const l = await reverseGeocode(coords.latitude, coords.longitude);
        if (l) {
          setLabel(l);
          okRef.current = true;
        }
      } catch {
        /* lieu optionnel */
      }

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

  async function requestPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Location.requestForegroundPermissionsAsync();
    return req.status === 'granted';
  }

  // Se met à jour dès que la localisation est activée
  useEffect(() => {
    refresh(false);
    let tries = 0;
    const it = setInterval(async () => {
      tries += 1;
      if (okRef.current || tries > 60) {
        clearInterval(it);
        return;
      }
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') refresh(false);
    }, 3000);
    return () => clearInterval(it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pill, { backgroundColor: colors.card, flexShrink: 1 }]}
          onPress={() => refresh(true)}
        >
          <Ionicons name="location" size={13} color="#6DBE45" />
          <Text style={[styles.pillText, { color: colors.textPrimary }]} numberOfLines={1}>
            {label ?? 'Madagascar'}
          </Text>
        </TouchableOpacity>

        {temp != null && (
          <View style={[styles.pill, { backgroundColor: colors.card }]}>
            <Text style={styles.emoji}>{icon}</Text>
            <Text style={[styles.pillText, { color: colors.textPrimary }]}>{temp}°C</Text>
          </View>
        )}

        {/* Badge texte seul, sans emoji */}
        {cov && (
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: covColor }]}
            onPress={toggleCovMsg}
          >
            <View style={styles.dot} />
            <Text style={[styles.pillText, { color: '#fff' }]} numberOfLines={1}>
              {cov.level === 'good' ? 'Couvert' : cov.level === 'medium' ? 'Moyenne' : 'Critique'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 62, left: 16, right: 60, zIndex: 25 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  emoji: { fontSize: 13 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,.9)',
  },
});
