import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/Themecontext';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState(route.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Si on arrive ici sans erreur, le contexte auth a bien reçu un
      // utilisateur : AppNavigator bascule automatiquement vers les onglets.
      // Si l'app ne s'ouvre toujours pas après un login "réussi" sans
      // message d'erreur affiché, c'est le signe que la réponse serveur
      // ne contient pas le champ attendu (access_token/user) — vérifier
      // les logs du terminal Metro pour la trace exacte de l'erreur.
    } catch (e: any) {
      const serverMessage = e?.response?.data?.message;
      const isNetworkError = !e?.response;
      setError(
        isNetworkError
          ? "Impossible de joindre le serveur. Vérifiez que le backend tourne et que l'adresse IP dans api.ts est correcte."
          : serverMessage || 'Connexion impossible. Vérifiez vos identifiants.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <Ionicons name="heart-circle" size={56} color={colors.accent} />
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Santé Madagascar</Text>
        <Text style={[styles.brandSub, { color: colors.textSecondary }]}>Connectez-vous pour continuer</Text>
      </View>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
        <Text style={[styles.link, { color: colors.textSecondary }]}>
          Pas encore de compte ? <Text style={{ color: colors.accent, fontWeight: '700' }}>S'inscrire</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 36 },
  brandTitle: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  brandSub: { fontSize: 13, marginTop: 4 },
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