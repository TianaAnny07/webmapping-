import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

/**
 * Menu profil visiteur, calqué sur celui de l'admin :
 * - un petit menu déroulant (nom + email + 3 options)
 * - "Mon profil" -> nom d'utilisateur + email
 * - "Paramètres" -> mot de passe + thème clair/sombre
 * - "Déconnexion"
 */
function ProfileMenu({ onClose, onUpdate, onLogout }) {
  const [view, setView] = useState('menu'); // 'menu' | 'profile' | 'settings'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const wrapRef = useRef();
  const { isDark, toggleTheme } = useTheme();

  // Charge le profil UNE SEULE FOIS (ou quand on clique "Réessayer") —
  // séparé du listener ci-dessous pour ne pas relancer l'appel API à
  // chaque re-rendu du parent.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    api
      .get('/auth/profile')
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
        setUsername(res.data.username || '');
        setAvatar(res.data.avatar || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(
          err.response?.status === 401
            ? 'Session expirée, reconnectez-vous.'
            : "Impossible de charger le profil. Vérifiez que le serveur backend tourne bien."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // Ferme le menu si on clique en dehors (uniquement actif en vue "menu").
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (view === 'menu' && wrapRef.current && !wrapRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, view]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError('');
    if (password && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      const body = { username };
      if (avatar !== profile?.avatar) body.avatar = avatar;
      if (password) body.password = password;
      const res = await api.patch('/auth/profile', body);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...stored, username: res.data.username, avatar: res.data.avatar };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setPassword('');
      setConfirmPassword('');
      setView('menu');
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSaving(false);
    }
  };

  // ===== CHARGEMENT =====
  if (loading) {
    return (
      <div ref={wrapRef} className="profile-dropdown">
        <div className="profile-dropdown__loading">
          <i className="bi bi-arrow-repeat spin"></i> Chargement du profil…
        </div>
      </div>
    );
  }

  // ===== ERREUR (au lieu de rester invisible) =====
  if (fetchError) {
    return (
      <div ref={wrapRef} className="profile-dropdown">
        <div className="profile-dropdown__loading profile-dropdown__loading--error">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{fetchError}</span>
          <button className="profile-dropdown__retry" onClick={() => setReloadTick((t) => t + 1)}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // ===== MENU DÉROULANT =====
  if (view === 'menu') {
    return (
      <div ref={wrapRef} className="profile-dropdown">
        <div className="profile-dropdown__header">
          <div className="profile-dropdown__name">{profile.username || 'Visiteur'}</div>
          <div className="profile-dropdown__email">{profile.email}</div>
        </div>

        <div className="profile-dropdown__items">
          <div className="profile-dropdown__item" onClick={() => setView('profile')}>
            <i className="bi bi-person"></i>
            <span>Mon profil</span>
          </div>
          <div className="profile-dropdown__item" onClick={() => setView('settings')}>
            <i className="bi bi-gear"></i>
            <span>Paramètres</span>
          </div>
          <div className="profile-dropdown__divider"></div>
          <div className="profile-dropdown__item profile-dropdown__item--danger" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Déconnexion</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== VUE "MON PROFIL" / "PARAMÈTRES" =====
  return (
    <div className="profile-modal-backdrop" onClick={() => setView('menu')}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal__header">
          <div className="profile-modal__header-left">
            <button className="profile-modal__back" onClick={() => setView('menu')}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <span>{view === 'profile' ? 'Mon profil' : 'Paramètres'}</span>
          </div>
          <button className="profile-modal__close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="profile-modal__avatar-section">
          <div className="profile-modal__avatar" onClick={() => fileRef.current.click()}>
            {avatar ? <img src={avatar} alt="avatar" /> : <i className="bi bi-person-fill"></i>}
            <span className="profile-modal__avatar-edit">
              <i className="bi bi-camera-fill"></i>
            </span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div className="profile-modal__identity">
            <div className="profile-modal__identity-name">{profile.username || '—'}</div>
            <div className="profile-modal__identity-email">{profile.email}</div>
            <div className="profile-modal__role-badge">{profile.role === 'admin' ? 'Administrateur' : 'Visiteur'}</div>
          </div>
        </div>

        {error && (
          <div className="profile-modal__error">
            <i className="bi bi-exclamation-circle"></i> {error}
          </div>
        )}

        {view === 'profile' && (
          <>
            <div className="profile-modal__field">
              <label>Nom d'utilisateur</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Votre nom" />
            </div>

            <div className="profile-modal__field">
              <label>Email</label>
              <input value={profile.email} disabled />
            </div>

            <div className="profile-modal__actions">
              <button className="btn-secondary" onClick={() => setView('menu')}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement…' : <><i className="bi bi-check2"></i> Enregistrer</>}
              </button>
            </div>
          </>
        )}

        {view === 'settings' && (
          <>
            <div className="profile-modal__settings-row">
              <div>
                <div className="profile-modal__settings-title">Thème de l'application</div>
                <div className="profile-modal__settings-sub">{isDark ? 'Sombre' : 'Clair'}</div>
              </div>
              <button className="profile-modal__theme-switch" onClick={toggleTheme}>
                <i className={`bi ${isDark ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`}></i>
              </button>
            </div>

            <div className="profile-modal__section-title">
              <i className="bi bi-lock-fill"></i> Changer le mot de passe
            </div>

            <div className="profile-modal__field">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Laisser vide pour ne pas changer"
              />
            </div>
            <div className="profile-modal__field">
              <label>Confirmer</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répéter le mot de passe"
              />
            </div>

            <div className="profile-modal__actions">
              <button className="btn-secondary" onClick={() => setView('menu')}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement…' : <><i className="bi bi-check2"></i> Enregistrer</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProfileMenu;