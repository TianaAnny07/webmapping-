import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/Themecontext';
import { CATEGORY_META, CATEGORY_ORDER } from '../services/facilityCategories';



//   source que les marqueurs sur la carte (CategoryMarker, FloatingMarker).
 
 
export default function MapLegend() {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.card }]} onPress={() => setOpen(true)}>
        <Ionicons name="list-outline" size={16} color={colors.textPrimary} />
        <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Légende</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Légende de la carte</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {CATEGORY_ORDER.map((key) => {
              const item = CATEGORY_META[key];
              return (
                <View key={key} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={13} color="#fff" />
                  </View>
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                </View>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4,
  },
  buttonText: { fontSize: 12.5, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 13, flexShrink: 1 },
});
