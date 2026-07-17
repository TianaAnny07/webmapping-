import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function ProfilModal({ user, onClose, onUpdate, onLogout }) {
  const { isDark, toggleTheme } = useTheme();
  const [view, setView] = useState('menu'); // 'menu' | 'profile' | 'settings'
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const dropdownRef = useRef();

  useEffect(() => {
    api.get('/auth/profile').then((res) => {
      setProfile(res.data);
      setUsername(res.data.username || '');
      setAvatar(res.data.avatar || null);
    });

    // Fermer si clic extérieur
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setSaving(true);
    try {
      const body = { username };
      if (avatar !== profile?.avatar) body.avatar = avatar;
      if (password) body.password = password;
      const res = await api.patch('/auth/profile', body);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, username: res.data.username, avatar: res.data.avatar }));
      onUpdate({ username: res.data.username, avatar: res.data.avatar });
    } catch (err) {
      setError(`Erreur : ${err.response?.data?.message || 'Mise à jour impossible'}`);
      setSaving(false);
    }
  };

  if (!profile) return null;

  // ===== MENU DROPDOWN =====
  if (view === 'menu') {
    return (
      <div ref={dropdownRef} style={{
        position: 'absolute',
        bottom: '70px',
        left: '12px',
        width: '220px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid #f0f0f0',
        zIndex: 2000,
        overflow: 'hidden',
      }}>
        {/* Header profil */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>
            {profile.username || 'Admin'}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            {profile.email}
          </div>
        </div>

        {/* Options */}
        <div style={{ padding: '8px 0' }}>
          <div
            onClick={() => setView('profile')}
            style={menuItem}
            onMouseEnter={e => e.currentTarget.style.background = '#f4f6f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <i className="bi bi-person" style={{ fontSize: '16px', color: '#555' }}></i>
            <span style={{ fontSize: '14px', color: '#1a1a2e' }}>Mon profil</span>
          </div>

          <div
            onClick={() => setView('settings')}
            style={menuItem}
            onMouseEnter={e => e.currentTarget.style.background = '#f4f6f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <i className="bi bi-gear" style={{ fontSize: '16px', color: '#555' }}></i>
            <span style={{ fontSize: '14px', color: '#1a1a2e' }}>Paramètres</span>
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }}></div>

          <div
            onClick={onLogout}
            style={menuItem}
            onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <i className="bi bi-box-arrow-left" style={{ fontSize: '16px', color: '#e74c3c' }}></i>
            <span style={{ fontSize: '14px', color: '#e74c3c' }}>Déconnexion</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== VUE PROFIL / PARAMÈTRES =====
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }} onClick={() => setView('menu')}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        width: '400px',
        maxWidth: '95vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '14px', padding: '4px' }}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>
              {view === 'profile' ? 'Mon profil' : 'Paramètres'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#888' }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#f0faf0', border: '3px solid #6DBE45',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', overflow: 'hidden'
            }}
          >
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <i className="bi bi-person-fill" style={{ fontSize: '36px', color: '#6DBE45' }}></i>
            }
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.45)', color: '#fff',
              fontSize: '11px', textAlign: 'center', padding: '3px'
            }}>
              <i className="bi bi-camera-fill"></i>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e' }}>{profile.username || '—'}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{profile.email}</div>
            <span style={{
              display: 'inline-block', marginTop: '4px',
              background: '#6DBE45', color: '#fff',
              padding: '2px 12px', borderRadius: '12px', fontSize: '11px'
            }}>{profile.role}</span>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            background: '#fff5f5', color: '#e74c3c',
            border: '1px solid #f5c6c6', borderRadius: '8px',
            padding: '8px 12px', marginBottom: '12px', fontSize: '12px'
          }}>
            <i className="bi bi-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Champs */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Nom d'utilisateur</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Votre nom d'utilisateur"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Email</label>
          <input
            value={profile.email}
            disabled
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: '#f4f6f9', color: '#aaa', boxSizing: 'border-box' }}
          />
        </div>

        {view === 'settings' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f0faf0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>Thème de l'application</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{isDark ? 'Sombre' : 'Clair'}</div>
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  border: '1px solid #ddd', background: '#fff',
                  color: '#6DBE45', cursor: 'pointer', fontSize: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <i className={`bi ${isDark ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`}></i>
              </button>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '10px' }}>
                <i className="bi bi-lock-fill"></i> Changer le mot de passe
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Confirmer</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répéter le mot de passe"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={() => setView('menu')}
            style={{ background: '#f4f6f9', color: '#555', border: '1px solid #ddd', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#6DBE45', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {saving ? 'Enregistrement...' : <><i className="bi bi-check2"></i> Enregistrer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const menuItem = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 16px',
  cursor: 'pointer',
  background: 'transparent',
  transition: 'background 0.15s',
};

export default ProfilModal;