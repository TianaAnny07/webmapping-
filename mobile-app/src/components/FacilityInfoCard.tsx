import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Facility } from '../types';
import { getFacilityPhotoUrl } from '../services/Photos';
import { useTheme } from '../context/Themecontext';

interface Props {
  facility: Facility;
  compact?: boolean; // version réduite, utilisée sous l'itinéraire pendant la navigation
}


  // description du backend si renseignée, sinon région/district + horaires.
 
import { CATEGORY_META } from '../services/facilityCategories';

function buildDescription(f: Facility): string {
  if (f.description && f.description.trim()) return f.description.trim();
  const parts: string[] = [];
  const kind = CATEGORY_META[f.category]?.label || (f.type === 'hospital' ? 'Hôpital' : 'Centre de santé de base (CSB)');
  parts.push(`${kind} situé à ${f.district || f.region || 'Madagascar'}.`);
  if (f.hours) parts.push(f.hours + '.');
  return parts.join(' ');
}

export default function FacilityInfoCard({ facility, compact = false }: Props) {
  const { colors } = useTheme();
  const photoUrl = getFacilityPhotoUrl(facility);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, compact && styles.cardCompact]}>
      <View style={styles.photoWrap}>
        <Image source={{ uri: photoUrl }} style={[styles.photo, compact && styles.photoCompact]} />
      </View>

      <View style={styles.body}>
        {!compact && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{buildDescription(facility)}</Text>
        )}

        {facility.services && (
          <View style={styles.row}>
            <Ionicons name="medkit-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]} numberOfLines={compact ? 2 : undefined}>
              {facility.services}
            </Text>
          </View>
        )}

        {facility.hours && (
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{facility.hours}</Text>
          </View>
        )}

        {facility.phone && (
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`tel:${facility.phone}`)}>
            <Ionicons name="call-outline" size={16} color={colors.accent} />
            <Text style={[styles.rowText, { color: colors.accent, fontWeight: '600' }]}>{facility.phone}</Text>
          </TouchableOpacity>
        )}

        {!facility.services && !facility.phone && !facility.hours && (
          <Text style={[styles.rowText, { color: colors.textSecondary }]}>
            Aucune information supplémentaire renseignée pour cet établissement.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden' },
  cardCompact: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  photoWrap: { position: 'relative' },
  photo: { width: '100%', height: 140 },
  photoCompact: { width: 84, height: 84, borderRadius: 12, margin: 8 },
  body: { padding: 12, gap: 8, flex: 1 },
  description: { fontSize: 12.5, lineHeight: 18, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 12.5, flexShrink: 1 },
});