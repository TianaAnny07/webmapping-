import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  coordinate: { latitude: number; longitude: number };
  type: 'hospital' | 'csb';
  onPress?: () => void;
}


  // Petite icône hôpital/CSB statique (pas d'animation)
 
export default function FacilityIconMarker({ coordinate, type, onPress }: Props) {
  const color = type === 'hospital' ? '#00c9a7' : '#f59e0b';

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.92 }} onPress={onPress}>
      <View style={styles.wrap}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Ionicons name={type === 'hospital' ? 'medkit' : 'bandage'} size={16} color="#fff" />
        </View>
        <View style={[styles.pin, { borderTopColor: color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  badge: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3,
  },
  pin: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
});