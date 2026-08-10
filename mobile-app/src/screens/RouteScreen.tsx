import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Itinerary } from '../types';
import { getItinerary, MODE_SPEEDS_KMH } from '../services/api';
import { watchPosition } from '../services/location';
import { haversineKm, distanceToRouteMeters, formatDistance, formatDuration } from '../services/Geo';
import { describeStep } from '../services/Maneuver';
import { speak, stopSpeaking, isVoiceEnabled, setVoiceEnabled } from '../services/Speech';
import NavigationGuide from '../components/NavigationGuide';
import FacilityInfoCard from '../components/FacilityInfoCard';
import FloatingMarker from '../components/FloatingMarker';
import { useTheme } from '../context/Themecontext';
import { useLanguage } from '../context/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;

// ⚠️ Seuil de détection "hors itinéraire", en mètres. Un smartphone a
// normalement une précision GPS de 5 à 15 m, même à l'arrêt — un seuil
// trop bas (proche de 1 m) déclenchera l'alerte en continu à cause du
// simple bruit du signal, pas d'un vrai écart de trajet. 15 m est déjà
// très réactif ; ajustez cette valeur ici selon vos tests sur le terrain.
const OFF_ROUTE_THRESHOLD_M = 15;
// Seuil resserré : on n'annonce "arrivé" que tout près de la vraie
// destination (avant : 60 m, ce qui déclenchait l'annonce trop tôt).
const ARRIVAL_THRESHOLD_M = 20;
const STEP_ARRIVAL_THRESHOLD_M = 30;

export default function RouteScreen() {
  const navigation = useNavigation<any>();
  const routeParams = useRoute<Props['route']>();
  const { facility, mode } = routeParams.params;
  const { colors } = useTheme();
  const { language } = useLanguage();
  const mapRef = useRef<MapView>(null);
  const watchSub = useRef<{ remove: () => void } | null>(null);
  const hasFitRoute = useRef(false);
  const wasOffRoute = useRef(false); // pour ne déclencher l'alerte qu'au moment où on SORT de l'itinéraire, pas en boucle

  const [itinerary, setItinerary] = useState<Itinerary>(routeParams.params.itinerary);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [offRouteM, setOffRouteM] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled());
  const [recalculating, setRecalculating] = useState(false);

  const steps = itinerary.steps;
  const currentStep = steps[stepIndex];
  const nextStep = steps[stepIndex + 1];

  // 1) Zoom directement sur l'itinéraire dès le démarrage de la navigation,
  //    au lieu d'une vue large centrée sur la destination.
  useEffect(() => {
    if (hasFitRoute.current || itinerary.geometry.length === 0) return;
    const coords = itinerary.geometry.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
      hasFitRoute.current = true;
    }, 300); // léger délai pour laisser la MapView finir son montage natif
    return () => clearTimeout(t);
  }, [itinerary]);

  // Annonce vocale au démarrage puis à chaque changement d'étape.
  useEffect(() => {
    if (!currentStep) return;
    const { text } = describeStep(currentStep, language);
    speak(text);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      watchSub.current?.remove();
      stopSpeaking();
    };
  }, []);

  // Suivi position en direct : avance d'étape, détecte l'arrivée et les écarts d'itinéraire.
  useEffect(() => {
    watchPosition((coords) => {
      setUserPos(coords);

      const distToDestKm = haversineKm(coords.latitude, coords.longitude, facility.latitude, facility.longitude);
      if (distToDestKm * 1000 <= ARRIVAL_THRESHOLD_M) {
        setArrived(true);
        speak('Vous êtes arrivé à destination.');
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

      // 2) Alerte renforcée (vibration + voix) au moment précis où l'on
      // sort de l'itinéraire — une seule fois, pas à chaque mise à jour
      // GPS tant qu'on reste hors route.
      if (isOffNow && !wasOffRoute.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        speak("Attention, vous semblez être hors de l'itinéraire prévu.");
      }
      wasOffRoute.current = isOffNow;
    }).then((sub) => {
      watchSub.current = sub;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleToggleVoice = () => {
    const next = !voiceOn;
    setVoiceEnabled(next);
    setVoiceOn(next);
  };

  const handleStop = () => {
    stopSpeaking();
    navigation.goBack();
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
        initialRegion={{
          latitude: userPos?.latitude ?? facility.latitude,
          longitude: userPos?.longitude ?? facility.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        <FloatingMarker coordinate={{ latitude: facility.latitude, longitude: facility.longitude }} category={facility.category} />
        {coords.length > 0 && <Polyline coordinates={coords} strokeColor={colors.accent} strokeWidth={5} />}
      </MapView>

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
            Vous semblez être hors de l'itinéraire prévu (à {Math.round(offRouteM)} m).
          </Text>
          <TouchableOpacity onPress={handleRecalculate} disabled={recalculating} style={styles.alertAction}>
            <Text style={styles.alertActionText}>{recalculating ? '…' : 'Recalculer'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
        {arrived ? (
          <>
            <View style={styles.arrivedRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              <Text style={[styles.destName, { color: colors.textPrimary }]}>Vous êtes arrivé</Text>
            </View>
            <FacilityInfoCard facility={facility} compact />
            <TouchableOpacity style={[styles.stopBtn, { backgroundColor: colors.accent }]} onPress={handleStop}>
              <Text style={styles.stopBtnText}>Terminer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.destName, { color: colors.textPrimary }]}>{facility.name}</Text>
            <Text style={[styles.routeInfo, { color: colors.textSecondary }]}>
              {formatDistance(itinerary.distanceMeters)} · {formatDuration(itinerary.durationSeconds)} · {MODE_SPEEDS_KMH[mode]} km/h
            </Text>
            <FacilityInfoCard facility={facility} compact />
            <TouchableOpacity style={[styles.stopBtn, { backgroundColor: colors.danger }]} onPress={handleStop}>
              <Ionicons name="stop-circle" size={18} color="#fff" />
              <Text style={styles.stopBtnText}>Arrêter la navigation</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 55, left: 16, padding: 10, borderRadius: 24, elevation: 3 },
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