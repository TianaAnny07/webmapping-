import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { getCurrentPosition } from '../services/location';
import { getCachedFacilities } from '../services/api';
import { haversineKm } from '../services/Geo';

type Level = 'good' | 'medium' | 'low';


export default function CoverageBanner() {
  const [info, setInfo] = useState<{ level: Level; km: number } | null>(null);
  const okRef = useRef(false);

  const compute = async () => {
    const pos = await getCurrentPosition();
    const all = await getCachedFacilities();
    let min = Infinity;
    for (const f of all) {
      const d = haversineKm(pos.latitude, pos.longitude, f.latitude, f.longitude);
      if (d < min) min = d;
    }
    if (!isFinite(min)) return;
    const km = Math.round(min * 10) / 10;
    const level: Level = km <= 2 ? 'good' : km <= 7 ? 'medium' : 'low';
    setInfo({ level, km });
    okRef.current = true;
  };

  // Se remplit tout seul dès que la localisation est activée
  useEffect(() => {
    let tries = 0;
    const it = setInterval(async () => {
      tries += 1;
      if (okRef.current || tries > 20) {
        clearInterval(it);
        return;
      }
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') await compute();
      } catch {}
    }, 3000);
    return () => clearInterval(it);
    
  }, []);

  if (!info) return null;

  const conf: Record<Level, { color: string; text: string }> = {
    good: { color: '#15803d', text: `✅ Zone bien desservie — centre de santé le plus proche à ${info.km} km` },
    medium: { color: '#b45309', text: `🟡 Couverture moyenne — centre de santé le plus proche à ${info.km} km` },
    low: { color: '#b91c1c', text: `⚠️ Zone peu couverte — le centre le plus proche est à ${info.km} km` },
  };

  return (
    <View style={[styles.banner, { backgroundColor: conf[info.level].color }]}>
      <Text style={styles.text}>{conf[info.level].text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 102, left: 16, right: 16, zIndex: 24,
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '700' },
});