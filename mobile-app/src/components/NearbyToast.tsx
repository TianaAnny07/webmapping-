import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, FacilityCategory } from '../services/facilityCategories';

// Élément d'un établissement affiché dans la notification.
export interface NearbyToastItem {
  name: string;
  category: FacilityCategory;
  distanceKm?: number;
}

interface Props {
  visible: boolean;
  greetingName?: string;
  items: NearbyToastItem[];
  onClose: () => void;
  onItemPress: (index: number) => void;
}


export default function NearbyToast({ visible, greetingName, items, onClose, onItemPress }: Props) {
  const [expanded, setExpanded] = useState(false); // compact ou allongé
  const slideY = useRef(new Animated.Value(-400)).current;

  // Animation d'entrée (depuis le haut) à chaque fois que le toast devient visible.
  useEffect(() => {
    if (visible) {
      setExpanded(false); // on rouvre toujours en compact
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 12 }).start();
    } else {
      Animated.timing(slideY, { toValue: -400, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, slideY]);

  // Glisser le toast vers le haut pour le fermer (gardé simple).
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -12,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40) onClose();
      },
    }),
  ).current;

  if (!visible) return null;

  const greeting = `Bonjour${greetingName ? ` ${greetingName}` : ''} 👋`;
  const summary = `${items.length} établissement${items.length > 1 ? 's' : ''} à proximité`;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.toast, { transform: [{ translateY: slideY }] }]}
    >
      {/* En-tête : salutation + actions (réduire/allonger, fermer) */}
      <TouchableOpacity style={styles.header} activeOpacity={0.8} onPress={() => setExpanded((e) => !e)}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.summary}>{expanded ? summary : 'Toucher pour voir le détail'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setExpanded((e) => !e)}
            style={styles.iconBtn}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={18} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Liste des établissements (visible seulement quand allongé) */}
      {expanded && (
        <View style={styles.list}>
          {items.map((item, index) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
            return (
              <TouchableOpacity
                key={`${item.name}-${index}`}
                style={styles.item}
                onPress={() => onItemPress(index)}
              >
                <View style={[styles.itemIcon, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.itemTag}>
                  <Text style={[styles.itemTagText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                {item.distanceKm != null && (
                  <Text style={styles.itemDist}>
                    {item.distanceKm < 1 ? `${(item.distanceKm * 1000).toFixed(0)} m` : `${item.distanceKm.toFixed(1)} km`}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
  position: 'absolute', alignSelf: 'center', top: '32%', // centré verticalement
  width: '90%', maxWidth: 420, zIndex: 40,               // centré horizontalement
  backgroundColor: '#ffffff', borderRadius: 16, padding: 14,
  elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10,
},
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  greeting: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  summary: { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  list: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  itemIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  itemTag: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: '#f1f5f9', marginLeft: 4,
  },
  itemTagText: { fontSize: 10, fontWeight: '700' },
  itemDist: { fontSize: 12, fontWeight: '700', color: '#6DBE45', minWidth: 44, textAlign: 'right' },
});