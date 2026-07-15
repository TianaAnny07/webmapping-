import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAllFacilities } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { Facility } from '../types';

const ACC_COLOR: Record<string, string> = { high: '#00c9a7', medium: '#f59e0b', low: '#ef4444' };

// Position initiale centrée sur Madagascar
const INITIAL_REGION = { latitude: -18.9, longitude: 47.0, latitudeDelta: 8, longitudeDelta: 8 };

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllFacilities().then(setFacilities).finally(() => setLoading(false));
  }, []);

  const locateMe = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) return;
    const pos = await getCurrentPosition();
    setUserPos(pos);
    mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.3, longitudeDelta: 0.3 }, 800);
  }, []);

  useEffect(() => { locateMe(); }, [locateMe]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {facilities.map((f) => (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.latitude, longitude: f.longitude }}
            pinColor={ACC_COLOR[f.accessibility]}
            title={f.name}
            description={f.type === 'hospital' ? 'Hôpital' : 'CSB'}
            onCalloutPress={() => navigation.navigate('FacilityDetail', { facility: f })}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator color="#00c9a7" />
        </View>
      )}

      <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
        <Ionicons name="locate" size={22} color="#0d2030" />
      </TouchableOpacity>

      <View style={styles.legend}>
        {Object.entries(ACC_COLOR).map(([key, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {key === 'high' ? 'Haute' : key === 'medium' ? 'Moyenne' : 'Faible'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locateBtn: {
    position: 'absolute', bottom: 30, right: 20, backgroundColor: '#fff',
    padding: 12, borderRadius: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  loadingBadge: {
    position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: '#fff',
    padding: 10, borderRadius: 20, elevation: 3,
  },
  legend: {
    position: 'absolute', bottom: 30, left: 16, backgroundColor: '#fff', borderRadius: 12,
    padding: 10, elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 11, color: '#334155' },
});
