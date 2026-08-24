import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;


const OFF_ROUTE_THRESHOLD_M = 60;

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
  
  const [followMode, setFollowMode] = useState(true);

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
    if (!currentStep) return;
    const { text } = describeStep(currentStep, language);
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      const name = user?.username?.trim();
      const greeting = name ? `Bonjour ${name}. ` : 'Bonjour. ';
      speak(`${greeting}${text}`);
    } else {
      speak(text);
    }
  }, [stepIndex]); 

  useEffect(() => {
    return () => {
      watchSub.current?.remove();
      stopSpeaking();
    };
  }, []);

  
  useEffect(() => {
    watchPosition((coords) => {
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
        speak(t('nav_arrived_voice'));
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
        initialRegion={initialItineraryRegion}
        showsUserLocation
        onPanDrag={() => setFollowMode(false)}
      >
        <FloatingMarker coordinate={{ latitude: facility.latitude, longitude: facility.longitude }} category={facility.category} />
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
              {formatDistance(itinerary.distanceMeters)} · {formatDuration(itinerary.durationSeconds)} · {MODE_SPEEDS_KMH[mode]} {t('km_h')}
            </Text>
            <FacilityInfoCard facility={facility} compact />
            <TouchableOpacity style={[styles.stopBtn, { backgroundColor: colors.danger }]} onPress={handleStop}>
              <Ionicons name="stop-circle" size={18} color="#fff" />
              <Text style={styles.stopBtnText}>{t('nav_stop')}</Text>
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