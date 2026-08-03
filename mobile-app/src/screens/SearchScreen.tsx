import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchFacilities, getNearbyFacilities } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { Facility } from '../types';
import { useTheme } from '../context/Themecontext';

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'nearby'>('nearby');
  const [geoError, setGeoError] = useState('');

  const loadNearby = useCallback(async () => {
    setLoading(true);
    setGeoError('');
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setGeoError('Activez la géolocalisation pour voir les établissements les plus proches.');
        return;
      }
      const pos = await getCurrentPosition();
      const data = await getNearbyFacilities(pos.latitude, pos.longitude);
      setResults(data);
      setMode('nearby');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNearby(); }, [loadNearby]);

  useEffect(() => {
    if (!query) { loadNearby(); return; }
    setMode('search');
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFacilities(query);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Rechercher un hôpital ou un CSB…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
        {query !== '' && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setQuery('')} style={[styles.tab, mode === 'search' && query === '' && styles.tabActive]}>
          <Text style={[styles.tabText, { color: colors.textSecondary }, mode !== 'nearby' && query === '' && { color: colors.accent }]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={loadNearby} style={styles.tab}>
          <Ionicons name="location" size={13} color={mode === 'nearby' && query === '' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.tabText, { color: mode === 'nearby' && query === '' ? colors.accent : colors.textSecondary }]}> Près de moi</Text>
        </TouchableOpacity>
      </View>

      {geoError !== '' && mode === 'nearby' && <Text style={[styles.empty, { color: colors.textSecondary }]}>{geoError}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('FacilityDetail', { facility: item })}
            >
              <View style={[styles.typeIcon, { backgroundColor: item.type === 'hospital' ? '#00c9a71a' : '#f59e0b1a' }]}>
                <Ionicons name={item.type === 'hospital' ? 'medkit' : 'bandage'} size={18} color={item.type === 'hospital' ? '#00c9a7' : '#f59e0b'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.region} · {item.district}</Text>
              </View>
              {item.distanceKm !== undefined && (
                <Text style={[styles.distance, { color: colors.accent }]}>{item.distanceKm} km</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Aucun établissement trouvé.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, elevation: 1 },
  input: { flex: 1, fontSize: 14 },
  tabs: { flexDirection: 'row', gap: 18, marginTop: 16, marginBottom: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10, gap: 12, elevation: 1 },
  typeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  distance: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 30 },
});