import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchFacilities } from '../services/api';
import { searchPlaces } from '../services/geocode';
import { Facility } from '../types';
import { useTheme } from '../context/Themecontext';

interface Props {
  label: string;
  placeholder: string;
  value: string; // nom actuellement sélectionné (label du point)
  onSelect: (coords: { latitude: number; longitude: number }, label: string) => void;
  onClear: () => void;
}

// Un résultat de suggestion peut être soit un établissement de santé,
// soit une ville/village trouvé via géocodage (Nominatim/OpenStreetMap).
type Suggestion =
  | { kind: 'facility'; id: string; name: string; sub: string; latitude: number; longitude: number }
  | { kind: 'place'; id: string; name: string; sub: string; latitude: number; longitude: number };

/**
 * Champ "Point A" / "Point B" avec suggestions automatiques. Combine deux
 * sources de résultats pendant la frappe :
 * - les établissements de santé déjà chargés dans l'app (hôpitaux/CSB)
 * - les villes/villages trouvés via géocodage (pour pouvoir taper le nom
 *   d'une ville qui n'a pas forcément de CSB portant ce nom exact)
 */
export default function PointSearchField({ label, placeholder, value, onSelect, onClear }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [facilities, places] = await Promise.all([
          searchFacilities(query).catch(() => [] as Facility[]),
          searchPlaces(query).catch(() => []),
        ]);
        const facilitySuggestions: Suggestion[] = facilities.slice(0, 4).map((f) => ({
          kind: 'facility',
          id: `f-${f.id}`,
          name: f.name,
          sub: f.district || f.region || '',
          latitude: f.latitude,
          longitude: f.longitude,
        }));
        const placeSuggestions: Suggestion[] = places.slice(0, 4).map((p, i) => ({
          kind: 'place',
          id: `p-${i}-${p.name}`,
          name: p.name,
          sub: 'Ville / lieu',
          latitude: p.latitude,
          longitude: p.longitude,
        }));
        // Établissements d'abord, puis villes — combinés dans la même liste.
        setResults([...facilitySuggestions, ...placeSuggestions]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handlePick = (s: Suggestion) => {
    setQuery(s.name);
    setOpen(false);
    onSelect({ latitude: s.latitude, longitude: s.longitude }, s.name);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search" size={14} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setOpen(true);
            if (t.trim() === '') onClear();
          }}
          onFocus={() => setOpen(true)}
        />
        {searching && <ActivityIndicator size="small" color={colors.accent} />}
        {query !== '' && !searching && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
              onClear();
            }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {open && results.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FlatList
            data={results}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionRow} onPress={() => handlePick(item)}>
                <Ionicons
                  name={item.kind === 'facility' ? 'medkit-outline' : 'business-outline'}
                  size={14}
                  color={colors.accent}
                />
                <View>
                  <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.suggestionSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10, zIndex: 25 },
  label: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  input: { flex: 1, fontSize: 13 },
  suggestions: {
    position: 'absolute', top: 60, left: 0, right: 0, borderRadius: 10, borderWidth: 1,
    maxHeight: 240, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, zIndex: 30,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9 },
  suggestionTitle: { fontSize: 12.5, fontWeight: '600' },
  suggestionSub: { fontSize: 10.5, marginTop: 1 },
});