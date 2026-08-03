import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import { getItinerary } from '../services/api';
import { haversineKm, formatDistance } from '../services/Geo';
import { Itinerary, TravelMode } from '../types';
import DistanceMeasurePanel from '../components/DistanceMeasurePanel';
import { useTheme } from '../context/Themecontext';

const INITIAL_REGION = { latitude: -18.9, longitude: 47.0, latitudeDelta: 8, longitudeDelta: 8 };

/**
 * Onglet dédié "Distance" : deux façons de placer les points A et B —
 * toucher la carte, OU taper un nom (ville/établissement) dans les champs
 * du panneau avec suggestions automatiques. Rien ne s'affiche sur la carte
 * tant qu'on n'a pas appuyé sur "Valider" : à ce moment-là seulement, la
 * carte zoome sur les deux points et affiche la distance entre eux.
 */
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

  // Utilisé à la fois par le tap sur la carte (label vide) et par la
  // sélection dans les champs de recherche (label = nom choisi).
  const handleSetPoint = useCallback((which: 'A' | 'B', coords: LatLng | null, label: string) => {
    if (which === 'A') {
      setPointA(coords);
      setPointALabel(label);
    } else {
      setPointB(coords);
      setPointBLabel(label);
    }
    setRoute(null);
    setConfirmed(false); // il faudra re-valider après tout changement de point
  }, []);

  const straightLineKm = pointA && pointB
    ? haversineKm(pointA.latitude, pointA.longitude, pointB.latitude, pointB.longitude)
    : null;

  // Appelé par le bouton "Valider" du panneau : révèle le trait + le
  // badge de distance, et zoome la carte pour montrer les deux points.
  const handleConfirm = useCallback(() => {
    if (!pointA || !pointB) return;
    setConfirmed(true);
    mapRef.current?.fitToCoordinates([pointA, pointB], {
      edgePadding: { top: 160, right: 60, bottom: 260, left: 60 },
      animated: true,
    });
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
            <Polyline coordinates={[pointA, pointB]} strokeColor="#f59e0b" strokeWidth={3} lineDashPattern={[6, 6]} />
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