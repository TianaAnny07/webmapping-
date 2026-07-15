import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchFacilities, getNearbyFacilities } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { Facility } from '../types';

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'nearby'>('nearby');

  const loadNearby = useCallback(async () => {
    setLoading(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) return;
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
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.input}
          placeholder="Rechercher un hôpital ou un CSB…"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <Text style={styles.sectionTitle}>
        {mode === 'nearby' ? 'Établissements les plus proches' : 'Résultats de recherche'}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#00c9a7" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('FacilityDetail', { facility: item })}
            >
              <View style={[styles.typeIcon, { backgroundColor: item.type === 'hospital' ? '#00c9a71a' : '#f59e0b1a' }]}>
                <Ionicons name={item.type === 'hospital' ? 'medkit' : 'heart'} size={18} color={item.type === 'hospital' ? '#00c9a7' : '#f59e0b'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.region} · {item.district}</Text>
              </View>
              {item.distanceKm !== undefined && (
                <Text style={styles.distance}>{item.distanceKm} km</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Aucun établissement trouvé.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6', paddingTop: 60, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, elevation: 1,
  },
  input: { flex: 1, fontSize: 14 },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 13, color: '#64748b', fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginBottom: 10, gap: 12, elevation: 1,
  },
  typeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  cardSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  distance: { fontSize: 12, fontWeight: '600', color: '#00c9a7' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 30 },
});
