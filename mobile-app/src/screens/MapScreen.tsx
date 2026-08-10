import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, TextInput, FlatList, Keyboard } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAllFacilities, searchFacilities } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { haversineKm } from '../services/Geo';
import { Facility } from '../types';
import { useTheme } from '../context/Themecontext';
import FloatingMarker from '../components/FloatingMarker';
import CategoryMarker from '../components/CategoryMarker';
import { CATEGORY_META } from '../services/facilityCategories';
import MapLegend from '../components/MapLegend';

const ACC_COLOR: Record<string, string> = { high: '#00c9a7', medium: '#f59e0b', low: '#ef4444' };
const NEARBY_RADIUS_KM = 3; // rayon "près de moi" pour les marqueurs flottants
const NEARBY_MAX_COUNT = 12; // limite pour éviter trop de marqueurs animés en même temps

// Position initiale centrée sur Madagascar
const INITIAL_REGION = { latitude: -18.9, longitude: 47.0, latitudeDelta: 8, longitudeDelta: 8 };

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedFacility, setHighlightedFacility] = useState<Facility | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);

  // --- Barre de recherche flottante en haut de la carte ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Facility[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    getAllFacilities().then(setFacilities).finally(() => setLoading(false));
  }, []);

  const locateMe = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) return;
    const pos = await getCurrentPosition();
    setUserPos(pos);
    // Delta ~0.01 = zoom "quartier" (environ 1 km de large), au lieu de
    // 0.3 qui montrait toute la région. animateToRegion garde une
    // transition fluide plutôt qu'un saut brutal.
    mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
  }, []);

  useEffect(() => { locateMe(); }, [locateMe]);

  // Établissements "près de moi" : flottent avec leur icône normale
  // (hôpital/CSB), triés par distance et limités en nombre pour éviter
  // trop de marqueurs animés en même temps.
  const nearbyFacilities = useMemo(() => {
    if (!userPos) return [];
    return facilities
      .map((f) => ({ f, distKm: haversineKm(userPos.latitude, userPos.longitude, f.latitude, f.longitude) }))
      .filter(({ distKm }) => distKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, NEARBY_MAX_COUNT)
      .map(({ f }) => f);
  }, [facilities, userPos]);

  const nearbyIds = useMemo(() => new Set(nearbyFacilities.map((f) => f.id)), [nearbyFacilities]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError('');
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await searchFacilities(query);
        setResults(data.slice(0, 8));
        setSearchError('');
      } catch {
        // Sur Android, MapView est rendu par une SurfaceView native ; si le
        // réseau échoue silencieusement, on veut au moins un retour visible
        // plutôt qu'une liste vide sans explication.
        setSearchError('Recherche indisponible. Vérifiez votre connexion.');
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelectResult = useCallback((facility: Facility) => {
    setQuery(facility.name);
    setShowResults(false);
    setHighlightedFacility(facility);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion(
      { latitude: facility.latitude, longitude: facility.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      800,
    );
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setHighlightedFacility(null);
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setShowResults(false)}
      >
        {facilities.map((f) => {
          if (highlightedFacility?.id === f.id) return null; // rendu séparément en flottant, ci-dessous
          if (nearbyIds.has(f.id)) return null; // idem : rendu en flottant "près de moi"
          return (
            <CategoryMarker
              key={f.id}
              coordinate={{ latitude: f.latitude, longitude: f.longitude }}
              category={f.category}
              onPress={() => navigation.navigate('FacilityDetail', { facility: f })}
            />
          );
        })}

        {/* Tous les établissements proches de l'utilisateur flottent, avec
            la couleur exacte de leur catégorie (même légende que sur la carte). */}
        {nearbyFacilities.map((f) => (
          <FloatingMarker
            key={f.id}
            coordinate={{ latitude: f.latitude, longitude: f.longitude }}
            category={f.category}
            variant="nearby"
            onPress={() => navigation.navigate('FacilityDetail', { facility: f })}
          />
        ))}

        {highlightedFacility && (
          <FloatingMarker
            coordinate={{ latitude: highlightedFacility.latitude, longitude: highlightedFacility.longitude }}
            category={highlightedFacility.category}
            variant="search"
            onPress={() => navigation.navigate('FacilityDetail', { facility: highlightedFacility })}
          />
        )}
      </MapView>

      {loading && (
        <View style={[styles.loadingBadge, { backgroundColor: colors.card }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Barre de recherche flottante au-dessus de la carte */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher un hôpital ou un CSB sur la carte…"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onFocus={() => setShowResults(true)}
            onChangeText={(v) => { setQuery(v); setShowResults(true); }}
          />
          {query !== '' && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {searchError !== '' && (
          <View style={[styles.resultsBox, { backgroundColor: colors.card, padding: 12 }]}>
            <Text style={{ color: colors.danger, fontSize: 12.5 }}>{searchError}</Text>
          </View>
        )}

        {showResults && results.length > 0 && (
          <View style={[styles.resultsBox, { backgroundColor: colors.card }]}>
            <FlatList
              data={results}
              keyExtractor={(f) => f.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectResult(item)}>
                  <Ionicons
                    name={CATEGORY_META[item.category].icon}
                    size={16}
                    color={CATEGORY_META[item.category].color}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.region} · {item.district}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resultGo}
                    onPress={() => navigation.navigate('FacilityDetail', { facility: item })}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.locateBtn, { backgroundColor: colors.card }]} onPress={locateMe}>
        <Ionicons name="locate" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.legendWrap}>
        <MapLegend />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locateBtn: {
    position: 'absolute', bottom: 30, right: 20, padding: 12, borderRadius: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  loadingBadge: { position: 'absolute', top: 60, alignSelf: 'center', padding: 10, borderRadius: 20, elevation: 3 },
  searchWrap: { position: 'absolute', top: 55, left: 16, right: 16, zIndex: 20, elevation: 20 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
  },
  searchInput: { flex: 1, fontSize: 13.5 },
  resultsBox: { borderRadius: 14, marginTop: 8, maxHeight: 260, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  resultName: { fontSize: 13, fontWeight: '600' },
  resultSub: { fontSize: 11, marginTop: 1 },
  resultGo: { padding: 4 },
  legendWrap: { position: 'absolute', bottom: 30, left: 16 },
});