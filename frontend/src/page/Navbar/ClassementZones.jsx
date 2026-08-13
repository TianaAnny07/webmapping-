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
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

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
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return <i className="bi bi-arrow-down-up" style={{ opacity: 0.3, marginLeft: 4 }}></i>;
    return sortOrder === 'asc' ? <i className="bi bi-arrow-up-short" style={{ marginLeft: 4 }}></i> : <i className="bi bi-arrow-down-short" style={{ marginLeft: 4 }}></i>;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 className="dash-section-heading" style={{ marginBottom: 4 }}>
            <i className="bi bi-trophy-fill"></i> Classement des zones
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {filtered.length} districts · triés par {sortBy === 'score' ? 'score' : sortBy === 'coveragePercent' ? 'couverture' : sortBy}
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

      {/* Filtres */}
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
      {/* Tableau */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              {[
                { key: 'district', label: 'District / Région' },
                { key: 'avgCarMin', label: 'Temps moyen (voiture)' },
                { key: 'coveragePercent', label: '% Couverture pop.' },
                { key: 'nbEtablissements', label: 'Établissements' },
                { key: 'nb24h', label: '24H/24' },
                { key: 'score', label: 'Score' },
                { key: 'statut', label: 'Statut' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
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
                  {col.label}
                  {getSortIcon(col.key)}
                </th>
              ))}
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
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.district}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.region}</div>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 700, color: getTimeColor(row.avgCarMin) }}>{row.avgCarMin} min</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.avgWalkMin} min à pied</div>
                </td>
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
                          width: `${row.coveragePercent}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: getScoreColor(100 - row.coveragePercent + 20),
                        }}
                      />
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: 32, textAlign: 'right' }}>
                      {row.coveragePercent}%
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{row.nbEtablissements}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{row.nb24h}</td>
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