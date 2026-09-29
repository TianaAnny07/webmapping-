// 🆕 NOUVEAU FICHIER : src/components/BaseMapPicker.tsx
// Sélecteur de fond de carte, comme dans Google Maps (Plan / Satellite / Hybride / Relief)

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/Themecontext';

export type BaseMapType = 'standard' | 'satellite' | 'hybrid' | 'terrain';

type Option = { id: BaseMapType; label: string; icon: any };

const OPTIONS: Option[] = [
  { id: 'standard', label: 'Plan', icon: 'map-outline' },
  { id: 'satellite', label: 'Satellite', icon: 'earth-outline' },
  { id: 'hybrid', label: 'Hybride', icon: 'globe-outline' },
  { id: 'terrain', label: 'Relief', icon: 'trail-sign-outline' },
];

type Props = {
  value: BaseMapType;
  onChange: (m: BaseMapType) => void;
};

export default function BaseMapPicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const current = OPTIONS.find((o) => o.id === value) || OPTIONS[0];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {open && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {OPTIONS.map((o) => {
            const active = o.id === value;
            return (
              <TouchableOpacity
                key={o.id}
                style={[
                  styles.row,
                  active && { backgroundColor: colors.accent + '22' },
                ]}
                onPress={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                <Ionicons
                  name={o.icon}
                  size={18}
                  color={active ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.label,
                    { color: active ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {o.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={16} color={colors.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.card }]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={open ? 'close' : 'layers-outline'}
          size={22}
          color={open ? colors.textSecondary : colors.accent}
        />
        {!open && (
          <Text style={[styles.btnLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {current.label}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    zIndex: 30,
    alignItems: 'flex-end',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
    paddingVertical: 6,
    minWidth: 160,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
