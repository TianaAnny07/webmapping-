import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';

function MonProfil() {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/auth/profile').then((res) => {
      setProfile(res.data);
      setUsername(res.data.username || '');
      setAvatar(res.data.avatar || null);
    });
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
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
      // Mettre à jour le localStorage
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, username: res.data.username, avatar: res.data.avatar }));
      setProfile(res.data);
      setPassword('');
      setConfirmPassword('');
      setSuccess('Profil mis à jour avec succès !');
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div style={{ color: '#888', padding: '40px' }}>Chargement...</div>;

  return (
    <div className="dash-section-box" style={{ maxWidth: '560px' }}>
      <h2 className="dash-section-heading">
        <i className="bi bi-person-circle"></i> Mon profil
      </h2>

      {success && <div style={alertGreen}><i className="bi bi-check-circle"></i> {success}</div>}
      {error && <div style={alertRed}><i className="bi bi-exclamation-circle"></i> {error}</div>}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '24px 0' }}>
        <div
          onClick={() => fileRef.current.click()}
          style={avatarBox}
          title="Cliquer pour changer la photo"
        >
          {avatar
            ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : <i className="bi bi-person-fill" style={{ fontSize: '40px', color: '#6DBE45' }}></i>
          }
          <div style={avatarOverlay}><i className="bi bi-camera-fill"></i></div>
        </div>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>{profile.username || profile.email}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{profile.email}</div>
          <div style={{ fontSize: '11px', color: '#6DBE45', marginTop: '2px' }}>{profile.role}</div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      </div>

      {/* Champs */}
      <div style={field}>
        <label style={label}>Nom d'utilisateur</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Entrez votre nom d'utilisateur"
          style={input}
        />
      </div>

      <div style={field}>
        <label style={label}>Email</label>
        <input value={profile.email} disabled style={{ ...input, background: '#f4f6f9', color: '#aaa' }} />
      </div>

      <div style={{ borderTop: '1px solid #eee', margin: '20px 0', paddingTop: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '14px' }}>
          <i className="bi bi-lock-fill"></i> Changer le mot de passe
        </div>
        <div style={field}>
          <label style={label}>Nouveau mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Laisser vide pour ne pas changer"
            style={input}
          />
        </div>
        <div style={field}>
          <label style={label}>Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Répéter le nouveau mot de passe"
            style={input}
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} style={btnSave}>
        {saving ? 'Enregistrement...' : <><i className="bi bi-check2"></i> Enregistrer les modifications</>}
      </button>
    </div>
  );
}

const field = { marginBottom: '14px' };
const label = { display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' };
const input = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' };
const btnSave = { background: '#6DBE45', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const alertGreen = { background: '#f0faf0', color: '#5aa336', border: '1px solid #c3e6a8', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' };
const alertRed = { background: '#fff5f5', color: '#e74c3c', border: '1px solid #f5c6c6', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' };
const avatarBox = { width: '80px', height: '80px', borderRadius: '50%', background: '#f0faf0', border: '3px solid #6DBE45', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', flexShrink: 0 };
const avatarOverlay = { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', textAlign: 'center', padding: '4px', opacity: 0, transition: 'opacity 0.2s' };

export default MonProfil;
