import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth';
import { useTheme } from '../context/Themecontext';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!email || !password) {
      setError('Email et mot de passe sont obligatoires.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      
      await authService.register(email, password, 'visitor', username || undefined);
      
      await authService.logout();

      Alert.alert('Compte créé', 'Votre compte a bien été créé. Connectez-vous pour continuer.', [
        { text: 'OK', onPress: () => navigation.navigate('Login', { prefillEmail: email }) },
      ]);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.brand}>
        <Ionicons name="person-add" size={48} color={colors.accent} />
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Créer un compte</Text>
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Nom d'utilisateur (optionnel)"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Mot de passe"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <View style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>S'inscrire</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
        <Text style={[styles.link, { color: colors.textSecondary }]}>
          Déjà un compte ? <Text style={{ color: colors.accent, fontWeight: '700' }}>Se connecter</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  brand: { alignItems: 'center', marginBottom: 30 },
  brandTitle: { fontSize: 20, fontWeight: '800', marginTop: 10 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  input: { flex: 1, fontSize: 14 },
  button: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  link: { fontSize: 13 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  errorText: { color: '#fff', fontSize: 12.5, flex: 1 },
});