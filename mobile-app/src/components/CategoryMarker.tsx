import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, FacilityCategory } from '../services/facilityCategories';

interface Props {
  coordinate: { latitude: number; longitude: number };
  category: FacilityCategory;
  onPress?: () => void;
}

/**
 * Marqueur statique (non-animé) pour les établissements 
 
 */
export default function CategoryMarker({ coordinate, category, onPress }: Props) {
  const meta = CATEGORY_META[category];
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: meta.color }]}>
        <Ionicons name={meta.icon} size={13} color="#fff" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3,
  },
});