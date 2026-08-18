import React, { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';

function ClassementZones() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filter24h, setFilter24h] = useState(false);
  const [sortBy, setSortBy] = useState('coveragePercent');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/zones/classement');
        setData(res.data.data || []);
        setMeta(res.data.meta || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.district || '').toLowerCase().includes(q) ||
          (r.region || '').toLowerCase().includes(q)
      );
    }

    if (filterRegion) {
      result = result.filter((r) => r.region === filterRegion);
    }

    if (filterStatut) {
      result = result.filter((r) => r.statut === filterStatut);
    }

    if (filter24h) {
      result = result.filter((r) => r.nb24h > 0);
    }

    result = [...result].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [data, search, filterRegion, filterStatut, filter24h, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return <i className="bi bi-arrow-down-up" style={{ opacity: 0.3, marginLeft: 4, fontSize: '12px' }}></i>;
    return sortOrder === 'asc' 
      ? <i className="bi bi-arrow-up-short" style={{ marginLeft: 4, fontSize: '14px', color: '#6DBE45' }}></i> 
      : <i className="bi bi-arrow-down-short" style={{ marginLeft: 4, fontSize: '14px', color: '#6DBE45' }}></i>;
  };

  const exportCsv = () => {
    const headers = ['District', 'Région', 'Temps moyen (min)', 'Temps moyen à pied (min)', 'Couverture (%)', 'Établissements', '24H/24', 'Score', 'Statut'];
    const rows = filtered.map((r) => [
      r.district,
      r.region,
      r.avgCarMin,
      r.avgWalkMin,
      r.coveragePercent,
      r.nbEtablissements,
      r.nb24h,
      r.score,
      r.statut,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'classement_zones.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score) => {
    if (score < 25) return '#e74c3c';
    if (score < 45) return '#f39c12';
    return '#6DBE45';
  };

  const getTimeColor = (min) => {
    if (min >= 75) return '#e74c3c';
    if (min >= 55) return '#f39c12';
    return '#6DBE45';
  };

  if (loading) {
    return (
      <div className="dash-section-box" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <i className="bi bi-hourglass-split" style={{ fontSize: '32px' }}></i>
        <p style={{ marginTop: '12px' }}>Chargement du classement...</p>
      </div>
    );
  }

  return (
    <div className="dash-section-box">
      {/* ===== HEADER ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="dash-section-heading" style={{ marginBottom: 4, fontSize: '20px' }}>
            <i className="bi bi-trophy-fill" style={{ color: '#f59e0b' }}></i> Classement des zones
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {filtered.length} districts · triés par {sortBy === 'coveragePercent' ? 'couverture' : sortBy === 'avgCarMin' ? 'temps moyen' : sortBy === 'score' ? 'score' : sortBy}
          </div>
        </div>
        <button
          onClick={exportCsv}
          style={{
            background: '#2980b9',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i className="bi bi-download"></i> Exporter
        </button>
      </div>

      {/* ===== FILTRES ===== */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Rechercher un district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 220px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        />

        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            minWidth: 160,
          }}
        >
          <option value="">Toutes les régions</option>
          {(meta?.regions || []).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            minWidth: 150,
          }}
        >
          <option value="">Tous les statuts</option>
          {(meta?.statuts || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filter24h}
            onChange={(e) => setFilter24h(e.target.checked)}
          />
          24H/24 uniquement
        </label>
      </div>

      {/* ===== TABLEAU ===== */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th
                onClick={() => handleSort('district')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                District / Région
                {getSortIcon('district')}
              </th>
              <th
                onClick={() => handleSort('avgCarMin')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                Temps moyen (voiture)
                {getSortIcon('avgCarMin')}
              </th>
              <th
                onClick={() => handleSort('coveragePercent')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                % Couverture pop.
                {getSortIcon('coveragePercent')}
              </th>
              <th
                onClick={() => handleSort('nbEtablissements')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                Établissements
                {getSortIcon('nbEtablissements')}
              </th>
              <th
                onClick={() => handleSort('nb24h')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                24H/24
                {getSortIcon('nb24h')}
              </th>
              <th
                onClick={() => handleSort('score')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                Score
                {getSortIcon('score')}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr
                key={row.district + idx}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* District / Région */}
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.district}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.region}</div>
                </td>

                {/* Temps moyen */}
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 700, color: getTimeColor(row.avgCarMin) }}>
                    {row.avgCarMin} min
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {row.avgWalkMin} min à pied
                  </div>
                </td>

                {/* Couverture pop. */}
                <td style={{ padding: '12px 8px', minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        background: 'var(--border-color)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, row.coveragePercent)}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: getScoreColor(row.coveragePercent + 20),
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 32, textAlign: 'right' }}>
                      {row.coveragePercent}%
                    </span>
                  </div>
                </td>

                {/* Établissements */}
                <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>
                  <div>{row.nbEtablissements}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    OH · {row.nbEtablissements} CSB
                  </div>
                </td>

                {/* 24H/24 */}
                <td style={{ padding: '12px 8px', color: 'var(--text-primary)', textAlign: 'center' }}>
                  {row.nb24h > 0 ? row.nb24h : '—'}
                </td>

                {/* Score */}
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        background: 'var(--border-color)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, row.score)}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: getScoreColor(row.score),
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 24, textAlign: 'right' }}>
                      {row.score}
                    </span>
                  </div>
                </td>

                {/* Statut */}
                <td style={{ padding: '12px 8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        row.statut === 'Critique'
                          ? 'rgba(231,76,60,0.08)'
                          : row.statut === 'Prioritaire'
                          ? 'rgba(243,156,18,0.08)'
                          : 'rgba(109,190,69,0.08)',
                      color:
                        row.statut === 'Critique'
                          ? '#e74c3c'
                          : row.statut === 'Prioritaire'
                          ? '#f39c12'
                          : '#6DBE45',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background:
                          row.statut === 'Critique'
                            ? '#e74c3c'
                            : row.statut === 'Prioritaire'
                            ? '#f39c12'
                            : '#6DBE45',
                      }}
                    />
                    {row.statut}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Aucun résultat pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClassementZones;