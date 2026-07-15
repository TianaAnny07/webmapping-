import React, { useState, useMemo } from 'react';
import MapView from '../../components/MapView';

function CarteDashboard({ facilities }) {
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const hopitaux = facilities.filter(f => f.properties.healthcare === 'hospital' || f.properties.amenity === 'hospital').length;
  const csb = facilities.filter(f => f.properties.healthcare === 'doctor' || f.properties.healthcare === 'doctors').length;
  const pharmacies = facilities.filter(f => f.properties.amenity === 'pharmacy').length;
  const regions = [...new Set(facilities.map(f => f.properties.adm1Name).filter(Boolean))].length;

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return facilities
      .filter(f => {
        const p = f.properties;
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.adm1Name && p.adm1Name.toLowerCase().includes(q)) ||
          (p.adm2Name && p.adm2Name.toLowerCase().includes(q)) ||
          (p.adm3Name && p.adm3Name.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [query, facilities]);

  const handleSelect = (feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const p = feature.properties;
    // Zoom plus large pour région, plus précis pour établissement
    const zoom = query.toLowerCase() === (p.adm1Name || '').toLowerCase() ? 8
      : query.toLowerCase() === (p.adm2Name || '').toLowerCase() ? 10 : 13;
    setFlyTo({ coords: [lat, lon], zoom });
    setQuery(p.name || p.adm1Name || '');
    setShowResults(false);
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      <h2 className="dash-section-heading">
        <i className="bi bi-map-fill"></i> Carte
      </h2>

      {/* Barre de recherche + KPI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

        {/* Recherche */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '8px 12px', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <i className="bi bi-search" style={{ color: '#888', fontSize: '14px' }}></i>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Rechercher région, district, établissement..."
              style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%', color: '#333' }}
            />
            {query && (
              <i className="bi bi-x" style={{ color: '#aaa', cursor: 'pointer' }} onClick={() => { setQuery(''); setShowResults(false); }}></i>
            )}
          </div>

          {/* Dropdown résultats */}
          {showResults && results.length > 0 && (
            <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden' }}>
              {results.map((f, i) => {
                const p = f.properties;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(f)}
                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0faf0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{ fontWeight: '600', color: '#1a1a2e' }}>
                      <i className="bi bi-geo-alt-fill" style={{ color: '#6DBE45', marginRight: '6px' }}></i>
                      {p.name || 'Formation sanitaire'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      {[p.adm3Name, p.adm2Name, p.adm1Name].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mini KPI */}
        {[
          { label: 'Total FS', value: facilities.length, color: '#6DBE45' },
          { label: 'Hôpitaux', value: hopitaux, color: '#e74c3c' },
          { label: 'CSB', value: csb, color: '#2980b9' },
          { label: 'Pharmacies', value: pharmacies, color: '#27ae60' },
          { label: 'Régions', value: regions, color: '#9b59b6' },
        ].map(item => (
          <div key={item.label} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: item.color }}>{item.value}</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Carte */}
      <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '1px solid #e0e0e0' }} onClick={() => setShowResults(false)}>
        <MapView flyTo={flyTo} />
      </div>

    </div>
  );
}

export default CarteDashboard;
