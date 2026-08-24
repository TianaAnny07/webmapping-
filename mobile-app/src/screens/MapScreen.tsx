


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, TextInput, FlatList, Keyboard } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFacilityCountByRegion, getCachedFacilities, searchFacilities, RegionCount } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { haversineKm } from '../services/Geo';
import { Facility } from '../types';
import { useTheme } from '../context/Themecontext';
import { useAuth } from '../context/AuthContext';
import NearbyToast, { NearbyToastItem } from '../components/NearbyToast';
import { useLanguage } from '../context/LanguageContext';
import FloatingMarker from '../components/FloatingMarker';
import RegionCountMarker from '../components/RegionCountMarker';
import MapLegend from '../components/MapLegend';
import { CATEGORY_META, FacilityCategory } from '../services/facilityCategories';

const NEARBY_MAX_COUNT = 15;
const MADAGASCAR_REGION = { latitude: -18.9, longitude: 47.0, latitudeDelta: 8, longitudeDelta: 8 };

function bucketOf(category: FacilityCategory): 'hospital' | 'csb' | 'pharmacy' | 'clinic' | null {
  if (category === 'chu' || category === 'hospital') return 'hospital';
  if (category === 'csb1' || category === 'csb2') return 'csb';
  if (category === 'pharmacy') return 'pharmacy';
  if (category === 'clinic') return 'clinic';
  return null; // 'other' et 'maternity' ne sont plus garantis dans "près de moi"
}

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [toastItems, setToastItems] = useState<NearbyToastItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [notifCount, setNotifCount] = useState(0); // badge rouge sur la cloche
  const [hasNotifications, setHasNotifications] = useState(false); // la cloche reste visible
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);

  const [regionCounts, setRegionCounts] = useState<RegionCount[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  const [showIndividualMarkers, setShowIndividualMarkers] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState<Facility[]>([]);
  const [highlightedFacility, setHighlightedFacility] = useState<Facility | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Facility[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchCollapsed, setSearchCollapsed] = useState(false);

  const centerOn = useCallback((latitude: number, longitude: number, zoom: number) => {
    mapRef.current?.setCamera({ center: { latitude, longitude }, zoom });
  }, []);

  const locateMe = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) return;
    const pos = await getCurrentPosition();
    setShowIndividualMarkers(true);
    centerOn(pos.latitude, pos.longitude, 16);

    const all = await getCachedFacilities();
    const withDist = all
      .map((f) => ({ f, distKm: haversineKm(pos.latitude, pos.longitude, f.latitude, f.longitude) }))
      .sort((a, b) => a.distKm - b.distKm);

    const picked: Facility[] = [];
    const pickedIds = new Set<string>();
    const guaranteed: NearbyToastItem[] = [];
    (['hospital', 'csb', 'pharmacy', 'clinic'] as const).forEach((bucket) => {
      const match = withDist.find(({ f }) => bucketOf(f.category) === bucket && !pickedIds.has(f.id));
      if (match) {
        picked.push(match.f);
        pickedIds.add(match.f.id);
        guaranteed.push({ name: match.f.name, category: match.f.category, distanceKm: match.distKm });
      }
    });
    for (const { f } of withDist) {
      if (picked.length >= NEARBY_MAX_COUNT) break;
      if (!pickedIds.has(f.id)) {
        picked.push(f);
        pickedIds.add(f.id);
      }
    }
    setNearbyFacilities(picked);

   
        // apparait 15s apres activation
    if (guaranteed.length > 0) {
      setTimeout(() => {
        setToastItems(guaranteed);
        setShowToast(true);                 // le toast glisse du haut
        setNotifCount(guaranteed.length);   // badge (ex : 4)
        setHasNotifications(true);          // la cloche devient visible
      }, 15000); // 15 secondes
    }
  }, [centerOn]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchFacilities(query);
        setResults(data.slice(0, 8));
        setSearchError('');
      } catch {
        setSearchError(t('search_error_network'));
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, t]);

  const handleSelectResult = useCallback(
    (facility: Facility) => {
      setQuery(facility.name);
      setShowResults(false);
      setHighlightedFacility(facility);
      setShowIndividualMarkers(true);
      setSearchCollapsed(true);
      Keyboard.dismiss();
      centerOn(facility.latitude, facility.longitude, 15);
    },
    [centerOn],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setHighlightedFacility(null);
    setSearchCollapsed(false);
  }, []);

  const handleRegionPress = useCallback(
    (r: RegionCount) => centerOn(r.latitude, r.longitude, 8),
    [centerOn],
  );

  // Rouvrir la notification depuis la cloche
 const handleBellPress = () => {
  if (showToast) {
    setShowToast(false);            // réduire
  } else {
    setShowToast(true);             // voir la notification
    setNotifCount(0);               // ← le CHIFFRE disparaît
    // hasNotifications reste true → la cloche reste visible
  }
};

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={MADAGASCAR_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setShowResults(false)}
      >
        {!showIndividualMarkers && regionCounts.map((r) => (
          <RegionCountMarker
            key={r.region}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            region={r.region}
            count={r.count}
            onPress={() => handleRegionPress(r)}
          />
        ))}

        {showIndividualMarkers && nearbyFacilities.map((f) =>
          highlightedFacility?.id === f.id ? null : (
            <FloatingMarker
              key={f.id}
              coordinate={{ latitude: f.latitude, longitude: f.longitude }}
              category={f.category}
              variant="nearby"
              onPress={() => navigation.navigate('FacilityDetail', { facility: f })}
            />
          ),
        )}

        {highlightedFacility && (
          <FloatingMarker
            coordinate={{ latitude: highlightedFacility.latitude, longitude: highlightedFacility.longitude }}
            category={highlightedFacility.category}
            variant="search"
            onPress={() => navigation.navigate('FacilityDetail', { facility: highlightedFacility })}
          />
        )}
      </MapView>

      {loadingRegions && (
        <View style={[styles.loadingBadge, { backgroundColor: colors.card }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      <NearbyToast
        visible={showToast}
        greetingName={user?.username}
        items={toastItems}
        onClose={() => {
          setShowToast(false);
          // On garde la cloche + badge pour pouvoir rouvrir
        }}
        onItemPress={(i) => {
          const item = toastItems[i];
          const match = nearbyFacilities.find((f) => f.name === item.name && f.category === item.category);
          if (match) centerOn(match.latitude, match.longitude, 16);
          setShowToast(false);
        }}
      />

      
            {/* CLOCHE : visible une fois que la notification est arrivée ; le
          badge (chiffre) disparaît quand on touche la cloche, la cloche reste. */}
      {hasNotifications && (
        <TouchableOpacity style={styles.bellBtn} onPress={handleBellPress}>
          <Ionicons name="notifications" size={24} color="#fff" />
          {notifCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {highlightedFacility && (
        <View style={[styles.locationBanner, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.locationBannerMain}
            onPress={() => navigation.navigate('FacilityDetail', { facility: highlightedFacility })}
          >
            <Ionicons name={CATEGORY_META[highlightedFacility.category].icon} size={16} color={CATEGORY_META[highlightedFacility.category].color} />
            <Text style={[styles.locationBannerText, { color: colors.textPrimary }]} numberOfLines={1}>
              {highlightedFacility.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.locationBannerArrow}
            onPress={() => centerOn(highlightedFacility.latitude, highlightedFacility.longitude, 16)}
          >
            <Ionicons name="arrow-down-circle" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchWrap}>
        {searchCollapsed ? (
          <TouchableOpacity style={[styles.searchChip, { backgroundColor: colors.card }]} onPress={() => setSearchCollapsed(false)}>
            <Ionicons name="search" size={14} color={colors.accent} />
            <Text style={[styles.searchChipText, { color: colors.textPrimary }]} numberOfLines={1}>{query}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={t('search_placeholder_map')}
                placeholderTextColor={colors.textSecondary}
                value={query}
                returnKeyType="search"
                onFocus={() => setShowResults(true)}
                onChangeText={(v) => { setQuery(v); setShowResults(true); }}
                onSubmitEditing={() => { if (results.length > 0) handleSelectResult(results[0]); }}
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
                  renderItem={({ item }) => {
                    const meta = CATEGORY_META[item.category];
                    return (
                      <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectResult(item)}>
                        <Ionicons name={meta.icon} size={16} color={meta.color} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.region} · {item.district}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.resultGo} onPress={() => navigation.navigate('FacilityDetail', { facility: item })}>
                          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
          </>
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
  locateBtn: { position: 'absolute', bottom: 30, right: 20, padding: 12, borderRadius: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },
  // Cloche de notification en haut à droite
  bellBtn: {
    position: 'absolute', top: 55, right: 16, zIndex: 30,
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6DBE45', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  loadingBadge: { position: 'absolute', top: 60, alignSelf: 'center', padding: 10, borderRadius: 20, elevation: 3 },
  locationBanner: {
    position: 'absolute', top: 55, left: 16, right: 16, zIndex: 25, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 8, paddingVertical: 10,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6,
  },
  locationBannerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationBannerText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  locationBannerArrow: { padding: 4 },
  searchWrap: { position: 'absolute', top: 112, left: 16, right: 16, zIndex: 20, elevation: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 },
  searchInput: { flex: 1, fontSize: 13.5 },
  searchChip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%', elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 },
  searchChipText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  resultsBox: { borderRadius: 14, marginTop: 8, maxHeight: 260, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  resultName: { fontSize: 13, fontWeight: '600' },
  resultSub: { fontSize: 11, marginTop: 1 },
  resultGo: { padding: 4 },
  legendWrap: { position: 'absolute', bottom: 30, left: 16 },
});