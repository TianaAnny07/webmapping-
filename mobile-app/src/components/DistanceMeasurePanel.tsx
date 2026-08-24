import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Itinerary, TravelMode } from '../types';
import { formatDistance, formatDuration } from '../services/Geo';
import { useTheme } from '../context/Themecontext';
import PointSearchField from './PointSearchField';

interface Props {
  pointA: { latitude: number; longitude: number } | null;
  pointB: { latitude: number; longitude: number } | null;
  
  pointALabel: string;
  pointBLabel: string;
  straightLineKm: number | null;
  confirmed: boolean;
  route: Itinerary | null;
  loading: boolean;
  error: string;
  onSetPoint: (which: 'A' | 'B', coords: { latitude: number; longitude: number } | null, label: string) => void;
  onConfirm: () => void;
  onComputeRoute: (mode: TravelMode) => void;
  onReset: () => void;
  onClose: () => void;
   nearB?: { latitude: number; longitude: number } | null; // pour biaiser Point B vers Point A
  nearA?: { latitude: number; longitude: number } | null; // pour biaiser Point A vers Point B
}

const MODES: { key: TravelMode; icon: any; label: string }[] = [
  { key: 'walking', icon: 'walk', label: 'À pied' },
  { key: 'cycling', icon: 'bicycle', label: 'Moto' },
  { key: 'driving', icon: 'car', label: 'Voiture' },
];


//  Panneau flottant du mode "mesurer une distance".
 
 
export default function DistanceMeasurePanel({
  pointA, pointB, pointALabel, pointBLabel, straightLineKm, confirmed, route, loading, error,
  onSetPoint, onConfirm, onComputeRoute, onReset, onClose, nearB, nearA,
}: Props) {
  const { colors } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const handleConfirmPress = () => {
    onConfirm();
    setCollapsed(true); // se réduit automatiquement dès la validation
  };

  // --- Pastille réduite (après validation, repliée) ---
  if (confirmed && collapsed) {
    return (
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: colors.card }]}
        onPress={() => setCollapsed(false)}
      >
        <Ionicons name="resize-outline" size={14} color={colors.accent} />
        <Text style={[styles.chipText, { color: colors.textPrimary }]}>
          {straightLineKm != null ? `${straightLineKm.toFixed(1)} km` : '—'}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  // --- Panneau complet (avant validation, ou rouvert après) ---
  let status = 'Tapez un nom ou touchez la carte pour placer le point A.';
  if (pointA && !pointB) status = 'Tapez un nom ou touchez la carte pour placer le point B.';
  if (pointA && pointB && !confirmed) status = 'Appuyez sur "Valider" pour afficher la distance sur la carte.';

  return (
    <View style={[styles.panel, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="resize-outline" size={16} color={colors.accent} />
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Mesurer une distance</Text>
        </View>
        <View style={styles.headerActions}>
          {confirmed && (
            <TouchableOpacity onPress={() => setCollapsed(true)} style={styles.headerBtn}>
              <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {!confirmed && (
        <>
          <PointSearchField
            label="Point A"
            placeholder="Ville ou établissement…"
            value={pointALabel}
            onSelect={(coords, label) => onSetPoint('A', coords, label)}
            onClear={() => onSetPoint('A', null, '')}
             near={nearA}   
          />
          <PointSearchField
            label="Point B"
            placeholder="Ville ou établissement…"
            value={pointBLabel}
            onSelect={(coords, label) => onSetPoint('B', coords, label)}
            onClear={() => onSetPoint('B', null, '')}
            near={nearB} 
          />
          <Text style={[styles.status, { color: colors.textSecondary }]}>{status}</Text>
        </>
      )}

      {pointA && pointB && !confirmed && (
        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.accent }]} onPress={handleConfirmPress}>
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>Valider</Text>
        </TouchableOpacity>
      )}

      {confirmed && (
        <>
          <View style={styles.confirmedHeader}>
            <Text style={[styles.confirmedLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {pointALabel || 'Point A'} → {pointBLabel || 'Point B'}
            </Text>
          </View>

          <View style={[styles.resultRow, { backgroundColor: colors.input }]}>
            <Ionicons name="swap-horizontal" size={16} color={colors.accent} />
            <Text style={[styles.resultText, { color: colors.textPrimary }]}>
              Distance à vol d'oiseau : <Text style={styles.bold}>{straightLineKm?.toFixed(1)} km</Text>
            </Text>
          </View>

          <View style={styles.modes}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeBtn, { backgroundColor: colors.input }]}
                onPress={() => onComputeRoute(m.key)}
                disabled={loading}
              >
                <Ionicons name={m.icon} size={16} color={colors.accent} />
                <Text style={[styles.modeLabel, { color: colors.textPrimary }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Calcul de l'itinéraire…</Text>
            </View>
          )}

          {error !== '' && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          {route && !loading && (
            <View style={[styles.resultRow, styles.resultRoute, { backgroundColor: colors.input, borderColor: colors.accent }]}>
              <Ionicons name="git-branch-outline" size={16} color={colors.accent} />
              <Text style={[styles.resultText, { color: colors.textPrimary }]}>
                Par la route : <Text style={styles.bold}>{formatDistance(route.distanceMeters)}</Text> — {formatDuration(route.durationSeconds)}
              </Text>
            </View>
          )}
        </>
      )}

      <TouchableOpacity onPress={onReset} style={styles.resetBtn}>
        <Ionicons name="refresh" size={14} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Recommencer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, padding: 14, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBtn: { padding: 2 },
  headerText: { fontSize: 13, fontWeight: '700' },
  status: { fontSize: 12, marginBottom: 10 },
  confirmedHeader: { marginBottom: 8 },
  confirmedLabel: { fontSize: 11.5, fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 10, paddingVertical: 10, marginBottom: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 8 },
  resultRoute: { borderLeftWidth: 3 },
  resultText: { fontSize: 12.5, flex: 1 },
  bold: { fontWeight: '700' },
  modes: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  modeBtn: { flex: 1, alignItems: 'center', gap: 3, borderRadius: 10, paddingVertical: 8 },
  modeLabel: { fontSize: 11, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  error: { fontSize: 12, marginBottom: 6 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
});