import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Itinerary, TravelMode } from '../types';
import { getItineraryOptions, MODE_SPEEDS_KMH } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/location';
import { formatDistance, formatDuration } from '../services/Geo';
import { useTheme } from '../context/Themecontext';
import FacilityInfoCard from '../components/FacilityInfoCard';

type Props = NativeStackScreenProps<RootStackParamList, 'FacilityDetail'>;

const MODES: { key: TravelMode; label: string; icon: any }[] = [
  { key: 'walking', label: 'À pied', icon: 'walk' },
  { key: 'cycling', label: 'Moto', icon: 'bicycle' },
  { key: 'driving', label: 'Voiture', icon: 'car' },
];

const LABEL_TEXT: Record<string, string> = { recommended: 'Recommandé', shortest: 'Le plus court' };
const LABEL_ICON: Record<string, any> = { recommended: 'star', shortest: 'flash' };

export default function FacilityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Props['route']>();
  const { facility } = route.params;
  const { colors } = useTheme();

  const [previewMode, setPreviewMode] = useState<TravelMode | null>(null);
  const [options, setOptions] = useState<Itinerary[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePreview = useCallback(
    async (mode: TravelMode) => {
      setPreviewMode(mode);
      setOptions([]);
      setSelectedIdx(0);
      setError('');
      setLoading(true);
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          setError('Autorisation de localisation refusée.');
          return;
        }
        const pos = await getCurrentPosition();
        const result = await getItineraryOptions(pos.latitude, pos.longitude, facility.latitude, facility.longitude, mode);
        setOptions(result);
      } catch {
        setError("Impossible de calculer l'itinéraire pour le moment.");
      } finally {
        setLoading(false);
      }
    },
    [facility],
  );

  const handleValidate = () => {
    const chosen = options[selectedIdx];
    if (!chosen || !previewMode) return;
    navigation.navigate('Route', { facility, mode: previewMode, itinerary: chosen });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{facility.name}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{facility.region} — {facility.district}</Text>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 16 }}>
        <FacilityInfoCard facility={facility} />
      </View>

      <View style={styles.sectionTitleRow}>
        <Ionicons name="navigate-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Itinéraire</Text>
      </View>

      <View style={styles.modes}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[
              styles.modeBtn,
              { backgroundColor: colors.card, borderColor: previewMode === m.key ? colors.accent : colors.border },
            ]}
            onPress={() => handlePreview(m.key)}
          >
            <Ionicons name={m.icon} size={20} color={previewMode === m.key ? colors.accent : colors.textSecondary} />
            <Text style={[styles.modeLabel, { color: previewMode === m.key ? colors.accent : colors.textPrimary }]}>{m.label}</Text>
            <Text style={[styles.modeSpeed, { color: colors.textSecondary }]}>{MODE_SPEEDS_KMH[m.key]} km/h</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.previewLoading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Recherche des itinéraires…</Text>
        </View>
      )}

      {error !== '' && !loading && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

      {options.length > 0 && !loading && previewMode && (
        <View style={{ marginHorizontal: 20, marginTop: 16, gap: 10 }}>
          <Text style={[styles.optionsHint, { color: colors.textSecondary }]}>
            {options.length > 1 ? `${options.length} itinéraires trouvés — choisissez le vôtre :` : 'Itinéraire trouvé :'}
          </Text>
          {options.map((opt, idx) => {
            const selected = idx === selectedIdx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedIdx(idx)}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card, borderColor: selected ? colors.accent : colors.border },
                ]}
              >
                <View style={[styles.optionRadio, { borderColor: selected ? colors.accent : colors.border }]}>
                  {selected && <View style={[styles.optionRadioDot, { backgroundColor: colors.accent }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTopRow}>
                    {opt.label && LABEL_TEXT[opt.label] && (
                      <View style={[styles.optionBadge, { backgroundColor: colors.accent + '22' }]}>
                        <Ionicons name={LABEL_ICON[opt.label]} size={11} color={colors.accent} />
                        <Text style={[styles.optionBadgeText, { color: colors.accent }]}>{LABEL_TEXT[opt.label]}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.optionStats, { color: colors.textPrimary }]}>
                    {formatDistance(opt.distanceMeters)} · {formatDuration(opt.durationSeconds)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={[styles.validateBtn, { backgroundColor: colors.accent }]} onPress={handleValidate}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.validateBtnText}>Démarrer la navigation</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { marginTop: 55, marginLeft: 16 },
  header: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  title: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, marginTop: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, marginHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  modes: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 12 },
  modeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4 },
  modeLabel: { fontSize: 12.5, fontWeight: '600' },
  modeSpeed: { fontSize: 10.5 },
  previewLoading: { alignItems: 'center', marginTop: 20 },
  errorText: { textAlign: 'center', marginTop: 16, marginHorizontal: 20, fontSize: 13 },
  optionsHint: { fontSize: 12, marginBottom: 2 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5,
    borderRadius: 14, padding: 14,
  },
  optionRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optionRadioDot: { width: 10, height: 10, borderRadius: 5 },
  optionTopRow: { flexDirection: 'row', marginBottom: 4 },
  optionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  optionBadgeText: { fontSize: 10.5, fontWeight: '700' },
  optionStats: { fontSize: 14, fontWeight: '700' },
  validateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 6 },
  validateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});