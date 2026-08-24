import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import { getItinerary } from '../services/api';
import { haversineKm, formatDistance } from '../services/Geo';
import { Itinerary, TravelMode } from '../types';
import DistanceMeasurePanel from '../components/DistanceMeasurePanel';
import { useTheme } from '../context/Themecontext';

const INITIAL_REGION = { latitude: -18.9, longitude: 47.0, latitudeDelta: 8, longitudeDelta: 8 };


function getZoomForDelta(deltaDeg: number): number {
  const zoom = Math.log2(360 / deltaDeg) + 0.5; // + 0.5 = un cran de zoom en plus qu'avant
  return Math.max(3, Math.min(18, Math.round(zoom)));
}

export default function MeasureScreen() {
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [pointA, setPointA] = useState<LatLng | null>(null);
  const [pointB, setPointB] = useState<LatLng | null>(null);
  const [pointALabel, setPointALabel] = useState('');
  const [pointBLabel, setPointBLabel] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [route, setRoute] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setPointALabel('');
    setPointBLabel('');
    setConfirmed(false);
    setRoute(null);
    setError('');
  }, []);

  const handleMapPress = useCallback(
    (e: any) => {
      const coord: LatLng = e.nativeEvent.coordinate;
      setConfirmed(false);
      if (!pointA) {
        setPointA(coord);
        setPointALabel('');
        setRoute(null);
        setError('');
      } else if (!pointB) {
        setPointB(coord);
        setPointBLabel('');
      } else {
        setPointA(coord);
        setPointALabel('');
        setPointB(null);
        setPointBLabel('');
        setRoute(null);
        setError('');
      }
    },
    [pointA, pointB],
  );

  const handleSetPoint = useCallback((which: 'A' | 'B', coords: LatLng | null, label: string) => {
    if (which === 'A') {
      setPointA(coords);
      setPointALabel(label);
    } else {
      setPointB(coords);
      setPointBLabel(label);
    }
    setRoute(null);
    setConfirmed(false);
  }, []);

  const straightLineKm = pointA && pointB
    ? haversineKm(pointA.latitude, pointA.longitude, pointB.latitude, pointB.longitude)
    : null;

  // Zoom direct sur les 2 points au clic "Valider
  const handleConfirm = useCallback(() => {
  if (!pointA || !pointB) return;
  setConfirmed(true);

  const centerLat = (pointA.latitude + pointB.latitude) / 2;
const centerLon = (pointA.longitude + pointB.longitude) / 2;
const latDelta = Math.abs(pointA.latitude - pointB.latitude) * 1.2 || 0.015;   // 1.6 → 1.2
const lonDelta = Math.abs(pointA.longitude - pointB.longitude) * 1.2 || 0.015; // 1.6 → 1.2
const zoom = getZoomForDelta(Math.max(latDelta, lonDelta));

mapRef.current?.setCamera({ center: { latitude: centerLat, longitude: centerLon }, zoom });
}, [pointA, pointB]);

  const handleComputeRoute = useCallback(
    async (mode: TravelMode) => {
      if (!pointA || !pointB) return;
      setLoading(true);
      setError('');
      try {
        const result = await getItinerary(pointA.latitude, pointA.longitude, pointB.latitude, pointB.longitude, mode);
        setRoute(result);
      } catch {
        setError("Impossible de calculer l'itinéraire pour le moment.");
      } finally {
        setLoading(false);
      }
    },
    [pointA, pointB],
  );

  const midpoint = pointA && pointB
    ? { latitude: (pointA.latitude + pointB.latitude) / 2, longitude: (pointA.longitude + pointB.longitude) / 2 }
    : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        onPress={handleMapPress}
      >
        {pointA && pointB && confirmed && (
          <>
            <Polyline
  coordinates={[pointA, pointB]}
  strokeColor="#f59e0b"
  strokeWidth={4}
  lineDashPattern={[1, 12]}
  lineCap="round"
/>
            {midpoint && straightLineKm != null && (
              <Marker coordinate={midpoint} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[styles.distanceBadge, { borderColor: '#f59e0b' }]}>
                  <Text style={styles.distanceBadgeText}>{formatDistance(straightLineKm * 1000)}</Text>
                </View>
              </Marker>
            )}
          </>
        )}
        {pointA && <Marker coordinate={pointA} pinColor="#f59e0b" title="Point A" />}
        {pointB && <Marker coordinate={pointB} pinColor="#8b5cf6" title="Point B" />}
      </MapView>

      <View style={styles.panelWrap}>
        <DistanceMeasurePanel
          pointA={pointA}
          pointB={pointB}
          pointALabel={pointALabel}
          pointBLabel={pointBLabel}
          straightLineKm={straightLineKm}
          confirmed={confirmed}
          route={route}
          loading={loading}
          error={error}
          onSetPoint={handleSetPoint}
          onConfirm={handleConfirm}
          onComputeRoute={handleComputeRoute}
          onReset={reset}
          onClose={reset}
           
  nearA={pointB}   // Point A cherché près du Point B déjà placé
  nearB={pointA}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panelWrap: { position: 'absolute', top: 55, left: 16, right: 16, zIndex: 20 },
  distanceBadge: {
    backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 2,
  },
  distanceBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});