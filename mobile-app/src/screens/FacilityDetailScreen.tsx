import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'FacilityDetail'>;

const ACC_LABEL: Record<string, string> = { high: 'Haute', medium: 'Moyenne', low: 'Faible' };
const ACC_COLOR: Record<string, string> = { high: '#00c9a7', medium: '#f59e0b', low: '#ef4444' };

export default function FacilityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Props['route']>();
  const { facility } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#1e293b" />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: facility.type === 'hospital' ? '#00c9a71a' : '#f59e0b1a' }]}>
          <Ionicons name={facility.type === 'hospital' ? 'medkit' : 'heart'} size={26} color={facility.type === 'hospital' ? '#00c9a7' : '#f59e0b'} />
        </View>
        <Text style={styles.title}>{facility.name}</Text>
        <Text style={styles.subtitle}>{facility.region} — {facility.district}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{facility.beds}</Text>
          <Text style={styles.statLabel}>Lits</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{facility.staff}</Text>
          <Text style={styles.statLabel}>Personnel</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ACC_COLOR[facility.accessibility] }]}>
            {ACC_LABEL[facility.accessibility]}
          </Text>
          <Text style={styles.statLabel}>Accessibilité</Text>
        </View>
      </View>

      <View style={styles.infoList}>
        {facility.hours && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#64748b" />
            <Text style={styles.infoText}>{facility.hours}</Text>
          </View>
        )}
        {facility.phone && (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${facility.phone}`)}>
            <Ionicons name="call-outline" size={18} color="#64748b" />
            <Text style={[styles.infoText, { color: '#00c9a7' }]}>{facility.phone}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#64748b" />
          <Text style={styles.infoText}>
            Statut: {facility.status === 'operational' ? 'Opérationnel' : facility.status === 'limited' ? 'Service limité' : 'Fermé'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.routeBtn}
        onPress={() => navigation.navigate('Route', { facility })}
      >
        <Ionicons name="navigate" size={18} color="#fff" />
        <Text style={styles.routeBtnText}>Voir l'itinéraire</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backBtn: { marginTop: 55, marginLeft: 16 },
  header: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, paddingHorizontal: 20 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  infoList: { marginTop: 28, paddingHorizontal: 20, gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#334155' },
  routeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00c9a7', marginHorizontal: 20, marginTop: 32, paddingVertical: 14, borderRadius: 14,
  },
  routeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
