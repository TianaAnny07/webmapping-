import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

interface Props {
  coordinate: { latitude: number; longitude: number };
  region: string;
  count: number;
  onPress?: () => void;
}


export default function RegionCountMarker({ coordinate, region, count, onPress }: Props) {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} onPress={onPress} tracksViewChanges={false}>
      <View style={styles.badge}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.region} numberOfLines={1}>{region}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', borderWidth: 2, borderColor: '#6DBE45', elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3,
    minWidth: 56,
  },
  count: { color: '#fff', fontWeight: '800', fontSize: 14 },
  region: { color: '#cbd5e1', fontSize: 9, maxWidth: 90 },
});