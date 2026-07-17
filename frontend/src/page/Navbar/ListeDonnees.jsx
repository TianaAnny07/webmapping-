import React, { useState, useMemo } from 'react';
import api from '../../services/api';

function ListeDonnees({ facilities, onRefresh }) {
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Listes uniques pour les filtres
  const types = [...new Set(facilities.map(f => f.properties.healthcare || f.properties.amenity).filter(Boolean))].sort();
  const regions = [...new Set(facilities.map(f => f.properties.adm1Name).filter(Boolean))].sort();

  // Filtrage + recherche
  const filtered = useMemo(() => {
    return facilities.filter(f => {
      const props = f.properties;
      const matchSearch = !search ||
        (props.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (props.adm1Name || '').toLowerCase().includes(search.toLowerCase()) ||
        (props.adm2Name || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || props.healthcare === filterType || props.amenity === filterType;
      const matchRegion = !filterRegion || props.adm1Name === filterRegion;
      return matchSearch && matchType && matchRegion;
    });
  }, [facilities, search, filterType, filterRegion]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet établissement ?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/facilities/${id}`);
      setMessage({ type: 'success', text: 'Établissement supprimé avec succès.' });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (feature) => {
    const props = feature.properties;
    setEditingFacility(props.id);
    setEditForm({
      name: props.name || '',
      amenity: props.amenity || '',
      healthcare: props.healthcare || '',
      adm1Name: props.adm1Name || '',
      adm2Name: props.adm2Name || '',
      adm3Name: props.adm3Name || '',
      phone: props.phone || '',
      services: props.services || '',
      openingTime: props.openingTime || '',
      closingTime: props.closingTime || '',
      openingDays: props.openingDays || '',
      is24h: props.is24h || false,
    });
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/facilities/${editingFacility}`, editForm);
      setMessage({ type: 'success', text: 'Établissement mis à jour avec succès.' });
      setEditingFacility(null);
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' });
    }
  };

  const s = {
    textSecondary: { color: 'var(--text-secondary)' },
    textPrimary: { color: 'var(--text-primary)' },
    border: { border: '1px solid var(--border-color)' },
    bgInput: { background: 'var(--bg-input)' },
    bgCard: { background: 'var(--bg-card)' },
    borderRadius: { borderRadius: '8px' },
  };

  return (
    <div className="dash-section-box">
      <h2 className="dash-section-heading">
        <i className="bi bi-table"></i> Liste des données
      </h2>

      {/* Stats */}
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        <b style={{ color: 'var(--text-primary)' }}>{filtered.length}</b> résultats sur {facilities.length} formations sanitaires
      </p>

      {/* Message */}
      {message && (
        <div style={{
          background: message.type === 'success' ? 'rgba(109,190,69,0.1)' : 'rgba(231,76,60,0.1)',
          color: message.type === 'success' ? '#5aa336' : '#e74c3c',
          border: `1px solid ${message.type === 'success' ? 'rgba(109,190,69,0.3)' : 'rgba(231,76,60,0.3)'}`,
          borderRadius: '8px', padding: '12px', marginBottom: '16px'
        }}>
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i> {message.text}
        </div>
      )}

      {/* Barre recherche + filtres */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-input)', border: '1px solid var(--border-color)',
          borderRadius: '8px', padding: '8px 12px', flex: 2
        }}>
          <i className="bi bi-search" style={{ color: 'var(--text-secondary)' }}></i>
          <input
            type="text"
            placeholder="Rechercher par nom, région, district..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: 'var(--text-primary)' }}
          />
          {search && (
            <i className="bi bi-x-circle" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setSearch('')}></i>
          )}
        </div>

        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', border: '1px solid var(--border-color)',
            borderRadius: '8px', fontSize: '13px', background: 'var(--bg-input)',
            color: 'var(--text-primary)', outline: 'none', flex: 1
          }}
        >
          <option value="">Tous les types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterRegion}
          onChange={e => { setFilterRegion(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '8px 12px', border: '1px solid var(--border-color)',
            borderRadius: '8px', fontSize: '13px', background: 'var(--bg-input)',
            color: 'var(--text-primary)', outline: 'none', flex: 1
          }}
        >
          <option value="">Toutes les régions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {(search || filterType || filterRegion) && (
          <button
            onClick={() => { setSearch(''); setFilterType(''); setFilterRegion(''); setCurrentPage(1); }}
            style={{
              padding: '8px 12px', background: 'rgba(231,76,60,0.1)',
              color: '#e74c3c', border: '1px solid rgba(231,76,60,0.2)',
              borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
            }}
          >
            <i className="bi bi-x-lg"></i> Réinitialiser
          </button>
        )}
      </div>

      {/* Modal modification */}
      {editingFacility && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '12px',
            padding: '24px', width: '500px', maxHeight: '80vh',
            overflowY: 'auto', color: 'var(--text-primary)'
          }}>
            <h3 style={{ marginBottom: '16px' }}>
              <i className="bi bi-pencil-fill"></i> Modifier l'établissement
            </h3>

            {[
              { label: 'Nom', key: 'name' },
              { label: 'Type (amenity)', key: 'amenity' },
              { label: 'Santé (healthcare)', key: 'healthcare' },
              { label: 'Région', key: 'adm1Name' },
              { label: 'District', key: 'adm2Name' },
              { label: 'Commune', key: 'adm3Name' },
              { label: 'Téléphone', key: 'phone' },
              { label: 'Services', key: 'services' },
              { label: 'Heure ouverture', key: 'openingTime' },
              { label: 'Heure fermeture', key: 'closingTime' },
              { label: 'Jours ouverture', key: 'openingDays' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {field.label}
                </label>
                <input
                  type="text"
                  value={editForm[field.key]}
                  onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px',
                    border: '1px solid var(--border-color)', borderRadius: '6px',
                    fontSize: '13px', outline: 'none',
                    background: 'var(--bg-input)', color: 'var(--text-primary)'
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={editForm.is24h}
                  onChange={e => setEditForm({ ...editForm, is24h: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                Ouvert 24h/24
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleUpdate}
                style={{
                  flex: 1, padding: '10px', background: '#6DBE45',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                <i className="bi bi-check-lg"></i> Enregistrer
              </button>
              <button
                onClick={() => setEditingFacility(null)}
                style={{
                  flex: 1, padding: '10px', background: 'var(--bg-input)',
                  color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', cursor: 'pointer'
                }}
              >
                <i className="bi bi-x-lg"></i> Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>#</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Nom</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Type</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Région</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>District</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Statut</th>
              <th style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <i className="bi bi-search" style={{ fontSize: '24px' }}></i>
                  <p style={{ marginTop: '8px' }}>Aucun résultat trouvé</p>
                </td>
              </tr>
            ) : (
              paginated.map((feature, index) => {
                const props = feature.properties;
                return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{props.name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{props.healthcare || props.amenity || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{props.adm1Name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{props.adm2Name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: props.operatorType === 'public' ? 'rgba(109,190,69,0.15)' : 'rgba(41,128,185,0.15)',
                        color: props.operatorType === 'public' ? '#5aa336' : '#2980b9',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px'
                      }}>
                        {props.operatorType || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleEdit(feature)}
                          style={{
                            background: 'rgba(41,128,185,0.1)', color: '#2980b9',
                            border: 'none', padding: '4px 10px', borderRadius: '4px',
                            cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          <i className="bi bi-pencil-fill"></i> Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(props.id)}
                          disabled={deletingId === props.id}
                          style={{
                            background: 'rgba(231,76,60,0.1)', color: '#e74c3c',
                            border: 'none', padding: '4px 10px', borderRadius: '4px',
                            cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          <i className="bi bi-trash-fill"></i> {deletingId === props.id ? '...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px', border: '1px solid var(--border-color)',
              borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              background: currentPage === 1 ? 'var(--bg-input)' : 'var(--bg-card)',
              color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)'
            }}
          >
            <i className="bi bi-chevron-double-left"></i>
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px', border: '1px solid var(--border-color)',
              borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              background: currentPage === 1 ? 'var(--bg-input)' : 'var(--bg-card)',
              color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)'
            }}
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '6px 12px', border: '1px solid var(--border-color)',
                  borderRadius: '6px', cursor: 'pointer',
                  background: currentPage === page ? '#6DBE45' : 'var(--bg-card)',
                  color: currentPage === page ? 'white' : 'var(--text-primary)',
                  fontWeight: currentPage === page ? 'bold' : 'normal'
                }}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px', border: '1px solid var(--border-color)',
              borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              background: currentPage === totalPages ? 'var(--bg-input)' : 'var(--bg-card)',
              color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)'
            }}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px', border: '1px solid var(--border-color)',
              borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              background: currentPage === totalPages ? 'var(--bg-input)' : 'var(--bg-card)',
              color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)'
            }}
          >
            <i className="bi bi-chevron-double-right"></i>
          </button>

          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
            Page {currentPage} sur {totalPages} — {filtered.length} résultats
          </span>
        </div>
      )}
    </div>
  );
}

export default ListeDonnees;