import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Itinerary } from '../types';
import { getItinerary, MODE_SPEEDS_KMH } from '../services/api';
import { watchPosition, startRouteSimulation, stopRouteSimulation } from '../services/location';
import { haversineKm, distanceToRouteMeters, formatDistance, formatDuration } from '../services/Geo';
import { describeStep } from '../services/Maneuver';
import { speak, stopSpeaking, isVoiceEnabled, setVoiceEnabled } from '../services/Speech';
import NavigationGuide from '../components/NavigationGuide';
import FacilityInfoCard from '../components/FacilityInfoCard';
import FloatingMarker from '../components/FloatingMarker';
import { useTheme } from '../context/Themecontext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';


function getBoundingRegion(coords: { latitude: number; longitude: number }[], padding = 1.5) {
  if (coords.length === 0) return null;
  let minLat = coords[0].latitude, maxLat = coords[0].latitude;
  let minLon = coords[0].longitude, maxLon = coords[0].longitude;
  coords.forEach((c) => {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  });
  const latitudeDelta = Math.max((maxLat - minLat) * padding, 0.01);
  const longitudeDelta = Math.max((maxLon - minLon) * padding, 0.01);
  return { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2, latitudeDelta, longitudeDelta };
}

// Cap (direction) entre deux points, en degrés (0 = nord, 90 = est, 270 = ouest)
function bearingDeg(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;


const OFF_ROUTE_THRESHOLD_M = 120;

const ARRIVAL_THRESHOLD_M = 20;
const STEP_ARRIVAL_THRESHOLD_M = 30;

export default function RouteScreen() {
  const navigation = useNavigation<any>();
  const routeParams = useRoute<Props['route']>();
  const { facility, mode } = routeParams.params;
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const watchSub = useRef<{ remove: () => void } | null>(null);
  const hasFitRoute = useRef(false);
  const hasGreeted = useRef(false);
  const lastCameraUpdate = useRef(0); // limite les animations caméra à 1 max par seconde
  const wasOffRoute = useRef(false); // pour ne déclencher l'alerte qu'au moment où on SORT de l'itinéraire, pas en boucle

  const [itinerary, setItinerary] = useState<Itinerary>(routeParams.params.itinerary);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [offRouteM, setOffRouteM] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled());
    const [recalculating, setRecalculating] = useState(false);
  const [paused, setPaused] = useState(false); //  pause / reprise réelle
  const [elapsedSec, setElapsedSec] = useState(0); //  temps passé en route (hors pause)
  const [roadFactor, setRoadFactor] = useState(1.5); // réalité des routes malgaches
  const pausedRef = useRef(false);
    const prevPaused = useRef(false);
  const preAnnouncedRef = useRef(false); // préannonce déjà faite pour cette étape
  const wrongWayMs = useRef(0); // temps passé dans le mauvais sens
  const lastWrongWarn = useRef(0); // dernier avertissement « mauvais sens »
  const [followMode, setFollowMode] = useState(true);
  const [simulating, setSimulating] = useState(false); // démo en salle
  const [heading, setHeading] = useState(270); // direction du trajet (degrés)
  const lastPosRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const steps = itinerary.steps;
  const currentStep = steps[stepIndex];
  const nextStep = steps[stepIndex + 1];

  
  const initialItineraryRegion = useMemo(() => {
    const coords = itinerary.geometry.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
    return getBoundingRegion(coords) || {
      latitude: facility.latitude, longitude: facility.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05,
    };
  }, [itinerary, facility]);

  
  useEffect(() => {
    if (hasFitRoute.current || itinerary.geometry.length === 0) return;
    const coords = itinerary.geometry.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 140, right: 60, bottom: 260, left: 60 },
      animated: false, // pas d'animation ici : c'est déjà quasi la bonne vue, un ajustement sec évite tout effet de "zoom qui rentre"
    });
    hasFitRoute.current = true;
  }, [itinerary]);

  // Annonce vocale au démarrage puis à chaque changement d'étape 
  
    useEffect(() => {
    if (!currentStep || pausedRef.current) return; //  silence pendant la pause
    const { text } = describeStep(currentStep, language);
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      const name = user?.username?.trim();
      const greeting = name ? `Bonjour ${name}, ` : 'Bonjour, ';
      speak(`${greeting}je vous guide pour aller jusqu'à ${facility.name}. ${text}`);
    } else {
      speak(text);
    }
  }, [stepIndex]); 

      //  la préannonce + le mauvais sens à chaque nouvelle étape
  useEffect(() => {
    preAnnouncedRef.current = false;
    wrongWayMs.current = 0;
  }, [stepIndex]);

  // Chrono du temps réellement passé en route (gelé pendant la pause)
  useEffect(() => {
    if (arrived || paused) return;
    const id = setInterval(() => setElapsedSec((sec) => sec + 1), 1000);
    return () => clearInterval(id);
  }, [paused, arrived]);

  // Synchronise la pause + annonce la reprise
  useEffect(() => {
    pausedRef.current = paused;
    if (prevPaused.current && !paused) speak('Navigation reprise, bonne route.');
    prevPaused.current = paused;
  }, [paused]);

  useEffect(() => {
    return () => {
      watchSub.current?.remove();
      stopSpeaking();
      stopRouteSimulation();
    };
  }, []);

  
  useEffect(() => {
        watchPosition((coords) => {
      // ⏸️ En pause : la position reste suivie, mais annonces et alertes sont figées
      if (pausedRef.current) { setUserPos(coords); return; }
      // Oriente le 🚶 / 🏍️ / 🚗 vers la direction du trajet
            if (lastPosRef.current) {
        const dM =
          haversineKm(lastPosRef.current.latitude, lastPosRef.current.longitude, coords.latitude, coords.longitude) * 1000;
        if (dM > 1) {
          const moveHeading = bearingDeg(lastPosRef.current, coords);
          setHeading(moveHeading);

          // MAUVAIS SENS : 
          if (dM > 2 && currentStep) {
            const target = bearingDeg(coords, { latitude: currentStep.location[0], longitude: currentStep.location[1] });
            let diff = Math.abs(moveHeading - target);
            if (diff > 180) diff = 360 - diff;
            wrongWayMs.current = diff > 120 ? wrongWayMs.current + 4000 : 0;
            if (wrongWayMs.current >= 8000 && Date.now() - lastWrongWarn.current > 30000) {
              lastWrongWarn.current = Date.now();
              wrongWayMs.current = 0;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              speak(t('nav_wrong_way_voice'));
            }
          } else if (dM > 2) {
            wrongWayMs.current = 0;
          }
        }
      }
      lastPosRef.current = coords;

      //  PRÉANNONCE : 150 m avant un tournant
      if (currentStep && !preAnnouncedRef.current) {
        const dStep =
          haversineKm(coords.latitude, coords.longitude, currentStep.location[0], currentStep.location[1]) * 1000;
        if (dStep <= 150 && dStep > 30) {
          preAnnouncedRef.current = true;
          const metres = Math.round(dStep / 50) * 50;
          speak(`Dans environ ${metres} mètres : ${describeStep(currentStep, language).text.toLowerCase()}`);
        }
      }
      setUserPos(coords);

     
      if (followMode && hasFitRoute.current) {
        const now = Date.now();
        if (now - lastCameraUpdate.current > 1000) {
          lastCameraUpdate.current = now;
          mapRef.current?.animateCamera({ center: coords, zoom: 17 }, { duration: 500 });
        }
      }

      const distToDestKm = haversineKm(coords.latitude, coords.longitude, facility.latitude, facility.longitude);
      if (distToDestKm * 1000 <= ARRIVAL_THRESHOLD_M) {
        setArrived(true);
        stopRouteSimulation();
        setSimulating(false);
        speak(`${t('nav_arrived')} : ${facility.name}. ${t('nav_thanks_voice')}`);
        watchSub.current?.remove();
        return;
      }

      setStepIndex((idx) => {
        const step = steps[idx];
        if (!step) return idx;
        const distM = haversineKm(coords.latitude, coords.longitude, step.location[0], step.location[1]) * 1000;
        if (distM < STEP_ARRIVAL_THRESHOLD_M && idx < steps.length - 1) return idx + 1;
        return idx;
      });

      const off = distanceToRouteMeters(coords.latitude, coords.longitude, itinerary.geometry);
      const isOffNow = off > OFF_ROUTE_THRESHOLD_M;
      setOffRouteM(isOffNow ? off : null);

      // alerte hors itineraire
      if (isOffNow && !wasOffRoute.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        speak(t('nav_off_route_voice'));
      }
      wasOffRoute.current = isOffNow;
    }).then((sub) => {
      watchSub.current = sub;
    });
   
  }, [itinerary]);

  const handleRecalculate = useCallback(async () => {
    if (!userPos) return;
    setRecalculating(true);
    try {
      const result = await getItinerary(userPos.latitude, userPos.longitude, facility.latitude, facility.longitude, mode);
      setItinerary(result);
      setStepIndex(0);
      hasFitRoute.current = false; // permet un nouveau fitToCoordinates sur le nouveau tracé
      wasOffRoute.current = false;
      setOffRouteM(null);
    } catch {
      // silencieux : l'utilisateur peut réessayer via le même bouton
    } finally {
      setRecalculating(false);
    }
  }, [userPos, facility, mode]);

   // ⏸️ Pause / reprise de la navigation réelle
  const handleTogglePause = () => {
    if (!paused) {
      stopSpeaking();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      speak('Navigation en pause. Le temps de trajet est arrêté.');
    }
    setPaused((p) => !p);
  };

  const handleToggleVoice = () => {
    const next = !voiceOn;
    setVoiceEnabled(next);
    setVoiceOn(next);
  };

  const handleStop = () => {
    stopSpeaking();
    stopRouteSimulation();
    setSimulating(false);
    navigation.goBack();
  };

  // Démo en salle : un point virtuel suit l'itinéraire à ~18 km/h
  const handleToggleSimulation = () => {
    if (simulating) {
      stopRouteSimulation();
      setSimulating(false);
    } else {
      // Vitesse MOYENNE de la démo, adaptée au mode choisi :
      // à pied 15 km/h · moto 30 km/h · voiture 45 km/h
      const simSpeed = mode === 'walking' ? 15 : mode === 'cycling' ? 30 : 45;
      startRouteSimulation(
        itinerary.geometry.map(([lat, lon]) => ({ latitude: lat, longitude: lon })),
        simSpeed,
      );
      setSimulating(true);
      setFollowMode(true);
    }
  };

  const coords = itinerary.geometry.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
  const distToStepM = userPos && currentStep
    ? haversineKm(userPos.latitude, userPos.longitude, currentStep.location[0], currentStep.location[1]) * 1000
    : currentStep?.distanceMeters ?? 0;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialItineraryRegion}
        showsUserLocation={!simulating}
        onPanDrag={() => setFollowMode(false)}
      >
        <FloatingMarker coordinate={{ latitude: facility.latitude, longitude: facility.longitude }} category={facility.category} />
        {/* Petit bonhomme / moto / voiture qui suit le trajet pendant la simulation.
            - À pied : personnage toujours droit (jamais renversé).
            - Moto / voiture : retourné horizontalement selon le sens (ouest/est), jamais la tête en bas. */}
        {simulating && userPos && (
          <Marker coordinate={userPos} anchor={{ x: 0.5, y: 0.5 }} zIndex={10} flat>
            {mode === 'walking' ? (
              <Text style={{ fontSize: 30 }}>🚶</Text>
            ) : (
              <View style={{ transform: [{ scaleX: heading > 0 && heading < 180 ? -1 : 1 }] }}>
                <Text style={{ fontSize: 30 }}>{mode === 'cycling' ? '🏍️' : '🚗'}</Text>
              </View>
            )}
          </Marker>
        )}
        {coords.length > 0 && (
          <>
            {/* Liseré blanc en dessous : rend le tracé net et lisible sur n'importe quel fond de carte */}
            <Polyline coordinates={coords} strokeColor="#ffffff" strokeWidth={9} lineCap="round" lineJoin="round" />
            <Polyline coordinates={coords} strokeColor={colors.accent} strokeWidth={5} lineCap="round" lineJoin="round" />
          </>
        )}
      </MapView>

      {!followMode && !arrived && (
        <TouchableOpacity
          onPress={() => {
            setFollowMode(true);
            if (userPos) mapRef.current?.animateCamera({ center: userPos, zoom: 17 }, { duration: 500 });
          }}
          style={[styles.recenterBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="locate" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleStop} style={[styles.backBtn, { backgroundColor: colors.card }]}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={handleToggleVoice} style={[styles.voiceBtn, { backgroundColor: colors.card }]}>
        <Ionicons name={voiceOn ? 'volume-high' : 'volume-mute'} size={20} color={voiceOn ? colors.accent : colors.textSecondary} />
      </TouchableOpacity>

      {!arrived && currentStep && (
        <View style={styles.guideWrap}>
          <NavigationGuide step={currentStep} nextStep={nextStep} distanceToStepMeters={distToStepM} destinationName={facility.name} />
        </View>
      )}

      {offRouteM != null && !arrived && (
        <View style={[styles.alertBanner, { top: currentStep ? 130 : 60 }]}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.alertText}>
            {t('nav_off_route')} ({Math.round(offRouteM)} m).
          </Text>
          <TouchableOpacity onPress={handleRecalculate} disabled={recalculating} style={styles.alertAction}>
            <Text style={styles.alertActionText}>{recalculating ? '…' : t('nav_recalculate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
        {arrived ? (
          <>
            <View style={styles.arrivedRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              <Text style={[styles.destName, { color: colors.textPrimary }]}>{t('nav_arrived')}</Text>
            </View>
            <FacilityInfoCard facility={facility} compact />
            <TouchableOpacity style={[styles.stopBtn, { backgroundColor: colors.accent }]} onPress={handleStop}>
              <Text style={styles.stopBtnText}>{t('nav_finish')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.destName, { color: colors.textPrimary }]}>{facility.name}</Text>
                        <Text style={[styles.routeInfo, { color: colors.textSecondary }]}>
              {formatDistance(itinerary.distanceMeters)} · {formatDuration(Math.round(itinerary.durationSeconds * roadFactor))} estimé réel · {MODE_SPEEDS_KMH[mode]} {t('km_h')}
            </Text>
            <Text style={[styles.routeInfo, { color: paused ? '#f59e0b' : colors.textSecondary }]}>
              ⏱️ Temps écoulé : {formatDuration(elapsedSec)}{paused ? ' · EN PAUSE' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: 'Route bonne', f: 1.2 },
                { label: 'Route moyenne', f: 1.5 },
                { label: 'Route difficile', f: 2 },
              ].map((o) => (
                <TouchableOpacity
                  key={o.f}
                  onPress={() => setRoadFactor(o.f)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                    backgroundColor: roadFactor === o.f ? colors.accent : colors.bg,
                    borderWidth: 1, borderColor: roadFactor === o.f ? colors.accent : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: roadFactor === o.f ? '#fff' : colors.textSecondary }}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FacilityInfoCard facility={facility} compact />
                                   {/* ⏸️ ▶️ ⛔ Les 3 boutons alignés sur une seule rangée, comme « état de la route » */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.stopBtn, { flex: 1, paddingVertical: 10, backgroundColor: paused ? '#22c55e' : '#64748b' }]}
                onPress={handleTogglePause}
              >
                <Ionicons name={paused ? 'play-circle' : 'pause-circle'} size={16} color="#fff" />
                <Text style={[styles.stopBtnText, { fontSize: 11 }]} numberOfLines={1}>
                  {paused ? 'Reprendre' : 'Pause'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopBtn, { flex: 1, paddingVertical: 10, backgroundColor: simulating ? '#f59e0b' : colors.accent }]}
                onPress={handleToggleSimulation}
              >
                <Ionicons name={simulating ? 'pause-circle' : 'play-circle'} size={16} color="#fff" />
                <Text style={[styles.stopBtnText, { fontSize: 11 }]} numberOfLines={1}>
                  {simulating ? 'Stop démo' : 'Simuler'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.stopBtn, { flex: 1, paddingVertical: 10, backgroundColor: colors.danger }]} onPress={handleStop}>
                <Ionicons name="stop-circle" size={16} color="#fff" />
                <Text style={[styles.stopBtnText, { fontSize: 11 }]} numberOfLines={1}>Arrêter</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 55, left: 16, padding: 10, borderRadius: 24, elevation: 3 },
  recenterBtn: { position: 'absolute', bottom: 190, right: 16, padding: 12, borderRadius: 26, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4 },
  voiceBtn: { position: 'absolute', top: 55, right: 16, padding: 10, borderRadius: 24, elevation: 3 },
  guideWrap: { position: 'absolute', top: 110, left: 16, right: 16 },
  alertBanner: {
    position: 'absolute', left: 16, right: 16, backgroundColor: '#ef4444',
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 6,
  },
  alertText: { color: '#fff', fontSize: 12, flex: 1 },
  alertAction: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  alertActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, elevation: 8, gap: 12,
  },
  arrivedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  destName: { fontSize: 16, fontWeight: '700' },
  routeInfo: { fontSize: 13, marginTop: -6 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

});