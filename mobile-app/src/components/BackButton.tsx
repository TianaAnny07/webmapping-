import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/Themecontext';

export default function BackButton() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Map');
    }
  };

  return (
    <TouchableOpacity
      onPress={handleBack}
      style={[styles.btn, { backgroundColor: colors.card }]}
      accessibilityLabel="Retour"
    >
      <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 55,
    left: 16,
    zIndex: 40,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
