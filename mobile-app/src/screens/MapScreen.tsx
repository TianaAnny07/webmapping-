


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, TextInput, FlatList, Keyboard } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFacilityCountByRegion, getCachedFacilities, searchFacilities, getItinerary, RegionCount } from '../services/api';
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
import LocationWeatherBar from '../components/LocationWeatherBar';
import CoverageBanner from '../components/CoverageBanner';
import { isOpenNow, openLabel } from '../services/openingHours';
import { CATEGORY_META, CATEGORY_ORDER, FacilityCategory } from '../services/facilityCategories';

const NEARBY_MAX_COUNT = 15;
// Au-delà de cette distance, une catégorie n'est plus « garantie près de moi »
const MAX_GUARANTEE_KM = 100;
const MADAGASCAR_REGION = { latitude: -18.9, longitude: 47.0, latitudeDelta: 8, longitudeDelta: 8 };

// Toutes les catégories de la légende sont garanties dans « près de moi » :
// il y aura toujours au moins l'établissement le plus proche de chaque type.
function bucketOf(category: FacilityCategory): FacilityCategory {
  return category;
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

  // Mode URGENCE : centre ouvert le plus proche, en un clic
  const [emergency, setEmergency] = useState<{ facility: Facility; distKm: number } | null>(null);
  const [emergencyBusy, setEmergencyBusy] = useState(false);

  // Compteurs par région (bulles sur la carte) + fin du cercle de chargement
  useEffect(() => {
    (async () => {
      try {
        const all = await getCachedFacilities();
        const map = new Map<string, { count: number; lat: number; lon: number }>();
        for (const f of all) {
          const key = f.region || 'Inconnue';
          const e = map.get(key) || { count: 0, lat: 0, lon: 0 };
          e.count += 1;
          e.lat += f.latitude;
          e.lon += f.longitude;
          map.set(key, e);
        }
        setRegionCounts(
          Array.from(map.entries())
            .map(([region, e]) => ({
              region,
              count: e.count,
              latitude: e.lat / e.count,
              longitude: e.lon / e.count,
            }))
            .sort((a, b) => b.count - a.count),
        );
      } catch {
        /* silencieux */
      } finally {
        setLoadingRegions(false); // ← le cercle de chargement disparaît
      }
    })();
  }, []);

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
    CATEGORY_ORDER.forEach((bucket) => {
      // Suggestions/marqueurs « près de moi » : limités à MAX_GUARANTEE_KM
      const matchNear = withDist.find(({ f, distKm }) => bucketOf(f.category) === bucket && distKm <= MAX_GUARANTEE_KM && !pickedIds.has(f.id));
      if (matchNear) {
        picked.push(matchNear.f);
        pickedIds.add(matchNear.f.id);
      }
      // Notification : toujours les 8 catégories (la distance est affichée à côté)
      const matchAny = withDist.find(({ f }) => bucketOf(f.category) === bucket);
      if (matchAny) {
        guaranteed.push({ name: matchAny.f.name, category: matchAny.f.category, distanceKm: matchAny.distKm });
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

  // ===== MODE URGENCE : centre OUVERT le plus proche, en un clic =====
  const handleEmergency = async () => {
    if (emergencyBusy) return;
    setEmergencyBusy(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) return;
      const pos = await getCurrentPosition();
      const all = await getCachedFacilities();
      const withDist = all
        .map((f) => ({ f, d: haversineKm(pos.latitude, pos.longitude, f.latitude, f.longitude) }))
        .sort((a, b) => a.d - b.d);
      // 1) ceux qui sont ouverts maintenant (24h/24 ou dans les horaires)
      const open = withDist.filter(({ f }) => isOpenNow(f.openingTime, f.closingTime, f.is24h) !== false);
      const best = (open.length > 0 ? open : withDist)[0];
      if (!best) return;
      setEmergency({ facility: best.f, distKm: Math.round(best.d * 10) / 10 });
      setShowIndividualMarkers(true);
      setHighlightedFacility(best.f);
      centerOn(best.f.latitude, best.f.longitude, 15);
    } catch {
      /* silencieux */
    } finally {
      setEmergencyBusy(false);
    }
  };

  // Itinéraire direct (voiture) vers le centre trouvé en urgence
  const handleEmergencyRoute = async () => {
    if (!emergency) return;
    try {
      const pos = await getCurrentPosition();
      const itin = await getItinerary(
        pos.latitude,
        pos.longitude,
        emergency.facility.latitude,
        emergency.facility.longitude,
        'driving',
      );
      navigation.navigate('Route', { facility: emergency.facility, mode: 'driving', itinerary: itin });
    } catch {
      /* silencieux */
    }
  };

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
          <Ionicons name="notifications" size={30} color="#6DBE45" />
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

      {/* Barre position + température du jour (comme l'en-tête web) */}
      <LocationWeatherBar />

      {/* Indicateur zone couverte / peu couverte */}
      <CoverageBanner />

      {/* Bandeau URGENCE : centre ouvert le plus proche + itinéraire 1 clic */}
      {emergency && (
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyTitle} numberOfLines={1}>
            🚨 {emergency.facility.name}
          </Text>
          <Text style={styles.emergencySub}>
            {openLabel(emergency.facility.openingTime, emergency.facility.closingTime, emergency.facility.is24h)}
            {' · à '}
            {emergency.distKm < 1 ? `${Math.round(emergency.distKm * 1000)} m` : `${emergency.distKm} km`}
          </Text>
          <View style={styles.emergencyActions}>
            <TouchableOpacity style={styles.emergencyGo} onPress={handleEmergencyRoute}>
              <Ionicons name="navigate" size={14} color="#fff" />
              <Text style={styles.emergencyGoText}>Itinéraire</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEmergency(null)} style={styles.emergencyClose}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Gros bouton URGENCE */}
      <TouchableOpacity
        style={[styles.emergencyBtn, emergencyBusy && { opacity: 0.6 }]}
        onPress={handleEmergency}
        disabled={emergencyBusy}
      >
        <Ionicons name="alert" size={18} color="#fff" />
        <Text style={styles.emergencyBtnText}>{emergencyBusy ? '…' : 'URGENCE'}</Text>
      </TouchableOpacity>

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
  // Cloche de notification en haut à droite : simple cloche verte, sans fond ni bordure
  bellBtn: {
    position: 'absolute', top: 55, right: 16, zIndex: 30,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
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
  searchWrap: { position: 'absolute', top: 146, left: 16, right: 16, zIndex: 20, elevation: 20 },
  emergencyBtn: {
    position: 'absolute', bottom: 30, right: 16, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dc2626', borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 12,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
  },
  emergencyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  emergencyBanner: {
    position: 'absolute', bottom: 86, left: 16, right: 16, zIndex: 29,
    backgroundColor: '#dc2626', borderRadius: 14, padding: 12,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
  },
  emergencyTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emergencySub: { color: '#fecaca', fontSize: 12, marginTop: 2 },
  emergencyActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  emergencyGo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  emergencyGoText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emergencyClose: { padding: 6 },
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