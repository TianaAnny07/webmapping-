import { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  coordinate: { latitude: number; longitude: number };
  type: 'hospital' | 'csb';
  /**
   * 'nearby'  → utilisé pour TOUS les établissements proches de l'utilisateur
   *             (badge rond, coloré selon l'accessibilité).
   * 'search'  → utilisé pour l'établissement spécifiquement recherché ou
   *             visé par la navigation (badge en forme d'épingle, violet,
   *             clairement différent des badges "près de moi").
   */
  variant?: 'nearby' | 'search';
  accentColor?: string; // pour 'nearby' : couleur d'accessibilité (vert/orange/rouge)
  onPress?: () => void;
}

// Icônes par type — jamais de cœur. 'medkit' pour un hôpital, 'bandage'
// pour un CSB (soins de base), symboles médicaux neutres.
const NEARBY_ICON: Record<'hospital' | 'csb', any> = { hospital: 'medkit', csb: 'bandage' };
const SEARCH_ICON: Record<'hospital' | 'csb', any> = { hospital: 'medkit-outline', csb: 'bandage-outline' };
const SEARCH_COLOR = '#8b5cf6';

/**
 * Marqueur d'établissement animé (flotte doucement en boucle). Deux styles
 * selon `variant` : petit badge rond pour "près de moi", ou badge en
 * épingle plus grand et distinct pour l'établissement recherché / la
 * destination de navigation.
 */
export default function FloatingMarker({ coordinate, type, variant = 'search', accentColor, onPress }: Props) {
  const bob = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const isSearch = variant === 'search';
  const color = isSearch ? SEARCH_COLOR : accentColor || '#00c9a7';
  const icon = isSearch ? SEARCH_ICON[type] : NEARBY_ICON[type];
  const bobDistance = isSearch ? 9 : 5;
  const badgeSize = isSearch ? 36 : 28;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -bobDistance, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    bobLoop.start();
    pulseLoop.start();
    return () => {
      bobLoop.stop();
      pulseLoop.stop();
    };
  }, [bob, pulse, bobDistance]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, isSearch ? 1.8 : 1.5] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.92 }} zIndex={isSearch ? 999 : 500} tracksViewChanges onPress={onPress}>
      <View style={[styles.wrap, isSearch && styles.wrapSearch]}>
        <Animated.View
          style={[
            styles.pulse,
            { backgroundColor: color, width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
        <Animated.View style={[styles.badgeWrap, { transform: [{ translateY: bob }] }]}>
          {isSearch ? (
            // Variante "recherché" : badge en épingle (forme de goutte), pour
            // se distinguer visuellement des badges ronds "près de moi".
            <View style={[styles.pinBadge, { backgroundColor: color }]}>
              <View style={styles.pinIconCounter}>
                <Ionicons name={icon} size={18} color="#fff" />
              </View>
            </View>
          ) : (
            <View style={[styles.roundBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: color }]}>
              <Ionicons name={icon} size={14} color="#fff" />
            </View>
          )}
          <View style={[styles.pin, { borderTopColor: color }]} />
        </Animated.View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 46, height: 56, alignItems: 'center', justifyContent: 'flex-end' },
  wrapSearch: { width: 56, height: 66 },
  pulse: { position: 'absolute', bottom: 8 },
  badgeWrap: { alignItems: 'center' },
  roundBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3 },
  pinBadge: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
    transform: [{ rotate: '45deg' }], borderBottomRightRadius: 0,
  },
  pin: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  pinIconCounter: { transform: [{ rotate: '-45deg' }] },
});