import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, FacilityCategory } from '../services/facilityCategories';
import { isOpenNow } from '../services/openingHours';

// Élément d'un établissement affiché dans la notification.
export interface NearbyToastItem {
  name: string;
  category: FacilityCategory;
  distanceKm?: number;
  openingTime?: string;
  closingTime?: string;
  is24h?: boolean;
}

interface Props {
  visible: boolean;
  greetingName?: string;
  items: NearbyToastItem[];
  onClose: () => void;
  onItemPress: (index: number) => void;
}

export default function NearbyToast({ visible, greetingName, items, onClose, onItemPress }: Props) {
  const [expanded, setExpanded] = useState(false);
  const slideY = useRef(new Animated.Value(-400)).current;

  useEffect(() => {
    if (visible) {
      setExpanded(false);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 12 }).start();
    } else {
      Animated.timing(slideY, { toValue: -400, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, slideY]);

  // Glisser l'en-tête vers le haut pour fermer
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
    <Animated.View style={[styles.toast, { transform: [{ translateY: slideY }] }]}>
      {/* En-tête (toucher pour déplier / replier) */}
      <TouchableOpacity
        {...panResponder.panHandlers}
        style={styles.header}
        activeOpacity={0.8}
        onPress={() => setExpanded((e) => !e)}
      >
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.summary}>{expanded ? summary : 'Toucher pour voir le détail'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.iconBtn}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={18} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Liste SCROLLABLE, centrée à l'écran */}
      {expanded && (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={true}
          scrollEnabled={true}
        >
          {items.map((item, index) => {
            const meta = CATEGORY_META[item.category];
            const open = isOpenNow(item.openingTime, item.closingTime, item.is24h);
            return (
              <TouchableOpacity
                key={`${item.name}-${index}`}
                style={styles.item}
                onPress={() => onItemPress(index)}
              >
                <View style={[styles.itemIcon, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.itemTagText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                {open !== null && (
                  <View
                    style={{
                      borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
                      backgroundColor: open ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
                    }}
                  >
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: open ? '#16a34a' : '#dc2626' }}>
                      {open ? 'Ouvert' : 'Fermé'}
                    </Text>
                  </View>
                )}
                {item.distanceKm != null && (
                  <Text style={styles.itemDist}>
                    {item.distanceKm < 1 ? `${(item.distanceKm * 1000).toFixed(0)} m` : `${item.distanceKm.toFixed(1)} km`}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
       position: 'absolute', alignSelf: 'center', top: '28%',// un peu au milieu de l'écran
    width: '92%', maxWidth: 440, zIndex: 40,
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
  list: {
    marginTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 8,
    maxHeight: 320, // hauteur max => scroll quand il y a beaucoup d'établissements
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  itemIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  itemTagText: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  itemDist: { fontSize: 12, fontWeight: '800', color: '#6DBE45', minWidth: 46, textAlign: 'right' },
});
