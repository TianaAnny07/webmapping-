import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteStep } from '../types';
import { formatDistance } from '../services/Geo';
import { describeStep } from '../services/Maneuver';
import { useTheme } from '../context/Themecontext';

interface Props {
  step: RouteStep;
  nextStep?: RouteStep | null;
  distanceToStepMeters: number;
  destinationName?: string;
}


export default function NavigationGuide({ step, nextStep, distanceToStepMeters, destinationName }: Props) {
  const { colors } = useTheme();
  const { text, rotation } = describeStep(step);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.compass, { backgroundColor: colors.input }]}>
        <Ionicons name="arrow-up" size={26} color={colors.accent} style={{ transform: [{ rotate: `${rotation}deg` }] }} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.instruction, { color: colors.textPrimary }]}>{text}</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          Dans {formatDistance(distanceToStepMeters)}
          {nextStep ? ` · puis ${describeStep(nextStep).text.toLowerCase()}` : ` · vers ${destinationName || "l'établissement"}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16,
    padding: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
  },
  compass: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  instruction: { fontSize: 14.5, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
});