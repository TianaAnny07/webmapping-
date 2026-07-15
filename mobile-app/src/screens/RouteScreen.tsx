import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getItinerary } from '../services/api';
import { getCurrentPosition, requestLocationPermission, watchPosition } from '../services/location';
import { useAlerts } from '../context/AlertContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;

export default function RouteScreen() {
  const navigation = useNavigation<any>();
  const routeParams = useRoute<Props['route']>();
  const { facility } = routeParams.params;
  const mapRef = useRef<MapView>(null);
  const watchSub = useRef<{ remove: () => void } | null>(null);
  const { alertMessage, dismissAlert, startTracking, sendPosition, stopTracking } = useAlerts();

  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [itinerary, setItinerary] = useState<{ distanceMeters: number; durationSeconds: number; geometry: [number, number][] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [validated, setValidated] = useState(false); // true une fois que l'utilisateur a confirmé le trajet
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const granted = await requestLocationPermission();
      if (!granted) { setError("Autorisation de localisation refusée."); return; }
      const pos = await getCurrentPosition();
      setUserPos(pos);
      const data = await getItinerary(pos.latitude, pos.longitude, facility.latitude, facility.longitude);
      setItinerary(data);
    } catch (e: any) {
      setError("Impossible de calculer l'itinéraire pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [facility]);

  useEffect(() => { load(); }, [load]);

  // Une fois l'itinéraire validé par l'utilisateur : trace le trajet, suit sa position en direct,
  // et signale via WebSocket toute déviation (déclenche une alerte s'il semble perdu)
  function validateRoute() {
    if (!itinerary) return;
    setValidated(true);
    startTracking('mobile-user', itinerary.geometry);
    watchPosition((coords) => {
      setUserPos(coords);
      sendPosition(coords.latitude, coords.longitude);
    }).then((sub) => { watchSub.current = sub; });
  }

  useEffect(() => {
    return () => {
      watchSub.current?.remove();
      stopTracking();
    };
  }, [stopTracking]);

  const coords = itinerary?.geometry.map(([lat, lon]) => ({ latitude: lat, longitude: lon })) ?? [];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: (userPos?.latitude ?? facility.latitude),
          longitude: (userPos?.longitude ?? facility.longitude),
          latitudeDelta: 0.5, longitudeDelta: 0.5,
        }}
        showsUserLocation
      >
        {userPos && <Marker coordinate={userPos} pinColor="#3b82f6" title="Vous" />}
        <Marker coordinate={{ latitude: facility.latitude, longitude: facility.longitude }} title={facility.name} pinColor="#00c9a7" />
        {coords.length > 0 && (
          <Polyline coordinates={coords} strokeColor={validated ? '#00c9a7' : '#94a3b8'} strokeWidth={5} />
        )}
      </MapView>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#1e293b" />
      </TouchableOpacity>

      {loading && (
        <View style={styles.centerCard}>
          <ActivityIndicator color="#00c9a7" />
          <Text style={styles.centerCardText}>Calcul de l'itinéraire…</Text>
        </View>
      )}

      {error !== '' && !loading && (
        <View style={styles.centerCard}>
          <Text style={styles.centerCardText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {itinerary && !loading && (
        <View style={styles.bottomSheet}>
          <Text style={styles.destName}>{facility.name}</Text>
          <Text style={styles.routeInfo}>
            {(itinerary.distanceMeters / 1000).toFixed(1)} km · {Math.round(itinerary.durationSeconds / 60)} min
          </Text>

          {!validated ? (
            <TouchableOpacity style={styles.validateBtn} onPress={validateRoute}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.validateBtnText}>Valider l'itinéraire</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.trackingBadge}>
              <Ionicons name="navigate" size={16} color="#00c9a7" />
              <Text style={styles.trackingText}>Trajet en cours — vous êtes guidé en temps réel</Text>
            </View>
          )}
        </View>
      )}

      {alertMessage && (
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.alertText}>{alertMessage}</Text>
          <TouchableOpacity onPress={dismissAlert}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute', top: 55, left: 16, backgroundColor: '#fff', padding: 10, borderRadius: 24, elevation: 3,
  },
  centerCard: {
    position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: '#fff',
    padding: 18, borderRadius: 14, alignItems: 'center', gap: 8, elevation: 4,
  },
  centerCardText: { fontSize: 13, color: '#334155' },
  retryBtn: { marginTop: 6, backgroundColor: '#00c9a7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, elevation: 8,
  },
  destName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  routeInfo: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 14 },
  validateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00c9a7', paddingVertical: 14, borderRadius: 14,
  },
  validateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  trackingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00c9a71a',
    paddingVertical: 12, borderRadius: 14, justifyContent: 'center',
  },
  trackingText: { color: '#00947e', fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  alertBanner: {
    position: 'absolute', top: 55, left: 16, right: 16, backgroundColor: '#ef4444',
    borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 6,
  },
  alertText: { color: '#fff', fontSize: 12.5, flex: 1 },
});
