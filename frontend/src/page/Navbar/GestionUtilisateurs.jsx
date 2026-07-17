import React, { useEffect, useState } from 'react';
import api from '../../services/api';

function GestionUtilisateurs() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', role: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Token:', localStorage.getItem('token'));
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Erreur /auth/users:', err.response?.status, err.response?.data);
      setError(`Erreur ${err.response?.status || ''}: ${err.response?.data?.message || 'Chargement impossible'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditUser(user.id);
    setEditForm({ email: user.email, role: user.role });
  };

  const handleUpdate = async () => {
    try {
      await api.patch(`/auth/users/${editUser}`, editForm);
      setEditUser(null);
      fetchUsers();
    } catch {
      setError('Erreur lors de la modification');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      fetchUsers();
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div className="dash-section-box">
      <h2 className="dash-section-heading">
        <i className="bi bi-people-fill"></i> Gestion utilisateurs
      </h2>

      {error && (
        <div style={{ color: '#e74c3c', marginBottom: '12px' }}>{error}</div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', textAlign: 'left' }}>
              <th style={th}>ID</th>
              <th style={th}>Email</th>
              <th style={th}>Rôle</th>
              <th style={th}>Créé le</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {editUser === user.id ? (
                  <>
                    <td style={td}>{user.id}</td>
                    <td style={td}>
                      <input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        style={inputStyle}
                      />
                    </td>
                    <td style={td}>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="visitor">visitor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td style={td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={td}>
                      <button onClick={handleUpdate} style={btnGreen}>Sauvegarder</button>
                      <button onClick={() => setEditUser(null)} style={btnGray}>Annuler</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={td}>{user.id}</td>
                    <td style={td}>{user.email}</td>
                    <td style={td}>
                      <span style={{ ...badge, background: user.role === 'admin' ? '#6DBE45' : '#888' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={td}>
                      <button onClick={() => handleEdit(user)} style={btnBlue}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button onClick={() => handleDelete(user.id)} style={btnRed}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' };
const td = { padding: '10px 14px', fontSize: '13px', color: 'var(--text-primary)' };
const badge = { color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '11px' };
const btnBase = { border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', marginRight: '6px', fontSize: '13px' };
const btnBlue = { ...btnBase, background: '#3498db', color: '#fff' };
const btnRed = { ...btnBase, background: '#e74c3c', color: '#fff' };
const btnGreen = { ...btnBase, background: '#6DBE45', color: '#fff' };
const btnGray = { ...btnBase, background: 'var(--bg-input)', color: 'var(--text-secondary)' };
const inputStyle = { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '13px', width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)' };

export default GestionUtilisateurs;
