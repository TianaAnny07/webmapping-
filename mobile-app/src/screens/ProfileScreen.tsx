import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/Themecontext';
import { authService } from '../services/auth';

/**
 * Écran "Mon profil / Paramètres".
 * - Toucher la PHOTO elle-même → l'affiche simplement en grand (aperçu).
 * - Toucher le petit bouton APPAREIL PHOTO → ouvre la galerie pour la changer.
 * Dès que l'avatar est sauvegardé, updateUser() met à jour le contexte
 * auth partagé — ce qui rafraîchit automatiquement l'icône de l'onglet
 * "Profil" dans la barre du bas (voir AppNavigator.tsx).
 */
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState<string | null | undefined>(user?.avatar);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour changer d'avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const newAvatar = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(newAvatar);
      // Sauvegarde immédiate : pas besoin d'attendre "Enregistrer" pour que
      // la photo se mette à jour partout (onglet Profil inclus).
      saveAvatar(newAvatar);
    }
  };

  const saveAvatar = async (newAvatar: string) => {
    try {
      const updated = await authService.updateProfile({ avatar: newAvatar });
      updateUser(updated); // ← propage immédiatement à l'icône de l'onglet "Profil"
    } catch (e: any) {
      setError(e.response?.data?.message || "Impossible d'enregistrer la photo.");
    }
  };

  const handleAvatarPress = () => {
    if (avatar) setPreviewVisible(true); // affiche simplement la photo en grand
  };

  const handleSave = async () => {
    setError('');
    if (password && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      const body: { username?: string; avatar?: string | null; password?: string } = { username };
      if (avatar !== user?.avatar) body.avatar = avatar;
      if (password) body.password = password;
      const updated = await authService.updateProfile(body);
      updateUser(updated);
      setPassword('');
      setConfirmPassword('');
      Alert.alert('Profil mis à jour', 'Vos informations ont bien été enregistrées.');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mon profil</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          {/* Toucher la photo = juste l'afficher en grand */}
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={avatar ? 0.85 : 1} style={[styles.avatar, { backgroundColor: colors.input }]}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={40} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Toucher le petit appareil photo = changer la photo */}
          <TouchableOpacity
            onPress={pickAvatar}
            style={[styles.avatarEdit, { backgroundColor: colors.accent }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="camera" size={13} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.input }]}>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>
            {user?.role === 'admin' ? 'Administrateur' : 'Visiteur'}
          </Text>
        </View>
      </View>

      {/* Aperçu plein écran de la photo */}
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewVisible(false)}>
          {avatar && <Image source={{ uri: avatar }} style={styles.previewImage} resizeMode="contain" />}
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVisible(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Nom d'utilisateur</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
        value={username}
        onChangeText={setUsername}
        placeholder="Votre nom"
        placeholderTextColor={colors.textSecondary}
      />

      <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.themeTitle, { color: colors.textPrimary }]}>Thème de l'application</Text>
          <Text style={[styles.themeSub, { color: colors.textSecondary }]}>{isDark ? 'Sombre' : 'Clair'}</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={[styles.themeSwitch, { backgroundColor: colors.accent }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 20 }]}>
        <Ionicons name="lock-closed" size={12} /> Changer le mot de passe
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
        value={password}
        onChangeText={setPassword}
        placeholder="Laisser vide pour ne pas changer"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Répéter le mot de passe"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
      />

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 55, marginBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  email: { fontSize: 13, marginTop: 10 },
  roleBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6,
  },
  themeTitle: { fontSize: 13.5, fontWeight: '600' },
  themeSub: { fontSize: 12, marginTop: 2 },
  themeSwitch: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, marginTop: 22,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8 },
  logoutText: { fontWeight: '600', fontSize: 14 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  errorText: { color: '#fff', fontSize: 12.5, flex: 1 },
  previewBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  previewImage: { width: '90%', height: '70%' },
  previewClose: { position: 'absolute', top: 50, right: 24, padding: 8 },
});