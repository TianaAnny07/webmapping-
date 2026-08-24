import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchFacilities, getNearbyFacilities } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { Facility, FacilityType } from '../types';
import { useTheme } from '../context/Themecontext';

// Types affichés dans le menu déroulant du filtre, avec leur icône.
const FILTERS: { id: FacilityType | 'all'; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'Tous', icon: 'apps', color: '#00c9a7' },
  { id: 'hospital', label: 'Hôpitaux', icon: 'medkit', color: '#00c9a7' },
  { id: 'csb', label: 'CSB / Centres de santé', icon: 'bandage', color: '#f59e0b' },
  { id: 'pharmacy', label: 'Pharmacies', icon: 'medkit-outline', color: '#8b5cf6' },
  { id: 'clinic', label: 'Cliniques', icon: 'business', color: '#0ea5e9' },
];

function filterByType(list: Facility[], type: FacilityType | 'all'): Facility[] {
  if (type === 'all') return list;
  return list.filter((f) => f.type === type);
}

function fTypeIcon(type: FacilityType): string {
  switch (type) {
    case 'hospital': return 'medkit';
    case 'pharmacy': return 'medkit-outline';
    case 'clinic': return 'business';
    case 'health_post': return 'home';
    default: return 'bandage';
  }
}

function fTypeColor(type: FacilityType): string {
  switch (type) {
    case 'hospital': return '#00c9a7';
    case 'pharmacy': return '#8b5cf6';
    case 'clinic': return '#0ea5e9';
    case 'health_post': return '#ef4444';
    default: return '#f59e0b';
  }
}

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'nearby'>('nearby');
  const [geoError, setGeoError] = useState('');
  const [filter, setFilter] = useState<FacilityType | 'all'>('all'); // filtre sélectionné
  const [filterOpen, setFilterOpen] = useState(false); // menu déroulant ouvert/fermé

  // Résultats après application du filtre (calcul local = instantané)
  const filteredResults = useMemo(() => filterByType(results, filter), [results, filter]);

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
          onChangeText={(v) => { setQuery(v); setFilterOpen(false); }}
        />
        {query !== '' && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {/* Bouton "Tous / <type>" qui ouvre la liste déroulante de filtres */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterOpen((o) => !o)}
        >
          <Ionicons name={FILTERS.find((f) => f.id === filter)?.icon as any} size={14} color={colors.accent} />
          <Text style={[styles.tabText, { color: colors.accent }]}>
            {FILTERS.find((f) => f.id === filter)?.label}
          </Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={loadNearby} style={styles.tab}>
          <Ionicons name="location" size={13} color={mode === 'nearby' && query === '' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.tabText, { color: mode === 'nearby' && query === '' ? colors.accent : colors.textSecondary }]}> Près de moi</Text>
        </TouchableOpacity>
      </View>

      
      {filterOpen && (
        <View style={[styles.dropdown, { backgroundColor: colors.card }]}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setFilter(f.id);
                  setFilterOpen(false);
                }}
              >
                <Ionicons name={f.icon as any} size={16} color={active ? colors.accent : f.color} />
                <Text style={[styles.dropdownLabel, { color: colors.textPrimary }, active && { color: colors.accent, fontWeight: '700' }]}>
                  {f.label}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={16} color={colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {geoError !== '' && mode === 'nearby' && <Text style={[styles.empty, { color: colors.textSecondary }]}>{geoError}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('FacilityDetail', { facility: item })}
            >
              <View style={[styles.typeIcon, { backgroundColor: `${fTypeColor(item.type)}1a` }]}>
                <Ionicons name={fTypeIcon(item.type) as any} size={18} color={fTypeColor(item.type)} />
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
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '600' },
  dropdown: {
    marginBottom: 8, borderRadius: 12, paddingVertical: 4, overflow: 'hidden',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  dropdownLabel: { flex: 1, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10, gap: 12, elevation: 1 },
  typeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  distance: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 30 },
});