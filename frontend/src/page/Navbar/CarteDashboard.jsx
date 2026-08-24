// CarteDashboard.jsx
import React, { useState, useMemo } from 'react';
import MapView from '../../components/MapView';
import FacilityDetailPanel from '../../components/FacilityDetailPanel';
import './CarteDashboard.css';

const STATUT_COLORS = {
  Critique: '#e74c3c',
  Prioritaire: '#f39c12',
  Couvert: '#6DBE45',
};

function CarteDashboard({ facilities }) {
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeMode, setRouteMode] = useState('driving');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Statistiques globales
  const totalEtablissements = facilities.length;
  const totalCHU = facilities.filter(f =>
    f.properties.healthcare === 'hospital' ||
    f.properties.amenity === 'hospital'
  ).length;
  const totalCSB = facilities.filter(f =>
    f.properties.healthcare === 'doctor' ||
    f.properties.healthcare === 'doctors'
  ).length;
  const totalPharmacies = facilities.filter(f =>
    f.properties.amenity === 'pharmacy'
  ).length;
  const totalRegions = [...new Set(facilities.map(f => f.properties.adm1Name).filter(Boolean))].length;

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
    const zoom = query.toLowerCase() === (p.adm1Name || '').toLowerCase() ? 8
      : query.toLowerCase() === (p.adm2Name || '').toLowerCase() ? 10 : 13;
    setFlyTo({ coords: [lat, lon], zoom });
    setQuery(p.name || p.adm1Name || '');
    setShowResults(false);
  };

  const handleFacilityClick = (feature) => {
    setSelectedFacility(feature);
    setSelectedRegion(null);
    setIsPanelOpen(true);
    const [lon, lat] = feature.geometry.coordinates;
    setFlyTo({ coords: [lat, lon], zoom: 15 });
  };

  // Reçoit directement les properties du polygone région cliqué sur la carte
  // (region, statut, coveragePercent, avgCarMin, totalPopulation, ...) —
  // ces stats viennent du backend (zones.service.ts), plus de dépendance au
  // fichier communes_population.geojson local (qui n'existait pas).
  const handleRegionClick = (regionProperties) => {
    setSelectedRegion(regionProperties);
    setSelectedFacility(null);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setSelectedFacility(null);
    setSelectedRegion(null);
    setDestination(null);
    setIsPanelOpen(false);
  };

  const handleRoute = (lat, lon, mode) => {
    setRouteMode(mode);
    setDestination([lat, lon]);
  };

  // Répartition par type d'établissement pour la région sélectionnée —
  // filtre sur les données déjà chargées côté client (pas de duplication du
  // calcul de couverture backend), donc ça reste ici.
  const selectedRegionBreakdown = useMemo(() => {
    if (!selectedRegion) return null;
    const regionFacilities = facilities.filter(
      (f) => f.properties.adm1Name === selectedRegion.region
    );

    const total = regionFacilities.length;
    const hopitaux = regionFacilities.filter(f => f.properties.healthcare === 'hospital' || f.properties.amenity === 'hospital').length;
    const csb = regionFacilities.filter(f => f.properties.healthcare === 'doctor' || f.properties.healthcare === 'doctors').length;
    const csbi = regionFacilities.filter(f => f.properties.name && f.properties.name.includes('CSB II')).length;
    const cliniques = regionFacilities.filter(f => f.properties.healthcare === 'clinic').length;
    const pharmacies = regionFacilities.filter(f => f.properties.amenity === 'pharmacy').length;

    // % d'établissements ouverts maintenant — vraie donnée (openingTime/closingTime/is24h)
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openNowCount = regionFacilities.filter((f) => {
      const p = f.properties;
      if (p.is24h) return true;
      if (!p.openingTime || !p.closingTime) return false;
      const [oh, om] = p.openingTime.split(':').map(Number);
      const [ch, cm] = p.closingTime.split(':').map(Number);
      return currentMinutes >= oh * 60 + om && currentMinutes <= ch * 60 + cm;
    }).length;
    const functionalRate = total > 0 ? Math.round((openNowCount / total) * 100) : 0;

    return { total, hopitaux, csb, csbi, cliniques, pharmacies, functionalRate };
  }, [selectedRegion, facilities]);

  return (
    <div className="carte-dashboard">
      {/* Barre de recherche en haut */}
      <div className="carte-search-overlay">
        <div className="carte-search-container">
          <div className="carte-search-box">
            <i className="bi bi-search"></i>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Rechercher une région, un district, un établissement..."
              className="carte-search-input"
            />
            {query && (
              <i
                className="bi bi-x-circle"
                onClick={() => { setQuery(''); setShowResults(false); }}
                style={{ cursor: 'pointer', color: '#999' }}
              />
            )}
          </div>
          {showResults && results.length > 0 && (
            <div className="carte-search-results">
              {results.map((f, i) => {
                const p = f.properties;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(f)}
                    className="carte-search-result-item"
                  >
                    <div className="carte-search-result-name">
                      <i className="bi bi-geo-alt-fill"></i>
                      {p.name || 'Établissement de santé'}
                    </div>
                    <div className="carte-search-result-location">
                      {[p.adm3Name, p.adm2Name, p.adm1Name].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Statistiques en overlay sur la carte */}
      <div className="carte-stats-overlay">
        <div className="carte-stats-grid">
          <div className="carte-stat-item">
            <div className="carte-stat-number">{totalEtablissements}</div>
            <div className="carte-stat-label">Établissements</div>
          </div>
          <div className="carte-stat-item">
            <div className="carte-stat-number">{totalCHU}</div>
            <div className="carte-stat-label">Hôpitaux/CHU</div>
          </div>
          <div className="carte-stat-item">
            <div className="carte-stat-number">{totalCSB}</div>
            <div className="carte-stat-label">CSB</div>
          </div>
          <div className="carte-stat-item">
            <div className="carte-stat-number">{totalPharmacies}</div>
            <div className="carte-stat-label">Pharmacies</div>
          </div>
          <div className="carte-stat-item">
            <div className="carte-stat-number">{totalRegions}</div>
            <div className="carte-stat-label">Régions</div>
          </div>
        </div>
      </div>

      {/* La carte en plein écran */}
      <div className="carte-map-fullscreen">
        <MapView
          flyTo={flyTo}
          onSelectFacility={handleFacilityClick}
          onSelectRegion={handleRegionClick}
          onRoute={handleRoute}
          destination={destination}
          routeMode={routeMode}
        />

        {/* PANNEAU LATÉRAL DROIT */}
        <div
          className={`carte-right-panel ${isPanelOpen ? 'open' : ''} ${
            selectedRegion ? `statut-${selectedRegion.statut?.toLowerCase()}` : ''
          }`}
        >
          <div className="carte-panel-header">
            <h2>
              <i className="bi bi-hospital"></i>
              {selectedFacility ? ' Établissement de santé' : ' Analyse d\'accessibilité'}
            </h2>
            <button className="carte-panel-close" onClick={handleClosePanel}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="carte-panel-content">
            {/* Cas 1: Établissement de santé sélectionné */}
            {selectedFacility && (
              <FacilityDetailPanel
                feature={selectedFacility}
                onClose={handleClosePanel}
                onRoute={handleRoute}
              />
            )}

            {/* Cas 2: Région sélectionnée (polygone cliqué sur la carte) */}
            {selectedRegion && selectedRegionBreakdown && (
              <div className="carte-region-details">
                <h3 className="carte-region-title">
                  <i className="bi bi-geo-alt-fill" style={{ color: '#6DBE45' }}></i>
                  {selectedRegion.region}
                  {selectedRegion.statut === 'Critique' && (
                    <i className="bi bi-exclamation-triangle-fill alert-critique-icon" title="Zone critique"></i>
                  )}
                </h3>

                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                    borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '12px',
                    background: `${STATUT_COLORS[selectedRegion.statut] || '#7f8c8d'}15`,
                    color: STATUT_COLORS[selectedRegion.statut] || '#7f8c8d',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUT_COLORS[selectedRegion.statut] || '#7f8c8d' }} />
                  {selectedRegion.statut}
                </span>

                {/* Statistiques de couverture (backend) */}
                <div className="carte-panel-stats-grid">
                  <div className="carte-panel-stat">
                    <div className="carte-panel-stat-value">{selectedRegion.coveragePercent}%</div>
                    <div className="carte-panel-stat-label">
                      <i className="bi bi-percent"></i> Couverture
                    </div>
                  </div>
                  <div className="carte-panel-stat">
                    <div className="carte-panel-stat-value">{selectedRegion.avgCarMin} min</div>
                    <div className="carte-panel-stat-label">
                      <i className="bi bi-clock"></i> Temps de trajet
                    </div>
                  </div>
                </div>

                {/* Établissements de santé (calcul client, données déjà chargées) */}
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-hospital"></i> Établissements de santé
                  </h4>
                  <div className="carte-panel-list">
                    <div className="carte-panel-list-item">
                      <span className="carte-panel-list-label">
                        <i className="bi bi-building"></i> Total
                      </span>
                      <span className="carte-panel-list-value">{selectedRegionBreakdown.total}</span>
                    </div>
                    {selectedRegionBreakdown.hopitaux > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-hospital"></span> Hôpitaux/CHU
                        </span>
                        <span className="carte-panel-list-value">{selectedRegionBreakdown.hopitaux}</span>
                      </div>
                    )}
                    {selectedRegionBreakdown.csb > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-csb"></span> CSB
                        </span>
                        <span className="carte-panel-list-value">{selectedRegionBreakdown.csb}</span>
                      </div>
                    )}
                    {selectedRegionBreakdown.csbi > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-csbi"></span> CSB II
                        </span>
                        <span className="carte-panel-list-value">{selectedRegionBreakdown.csbi}</span>
                      </div>
                    )}
                    {selectedRegionBreakdown.cliniques > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-clinic"></span> Cliniques
                        </span>
                        <span className="carte-panel-list-value">{selectedRegionBreakdown.cliniques}</span>
                      </div>
                    )}
                    {selectedRegionBreakdown.pharmacies > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-pharmacy"></span> Pharmacies
                        </span>
                        <span className="carte-panel-list-value">{selectedRegionBreakdown.pharmacies}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Population (backend) */}
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-people"></i> Population
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-people-fill"></i> Population totale
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRegion.totalPopulation >= 1000000
                        ? `${(selectedRegion.totalPopulation / 1000000).toFixed(1)}M`
                        : `${(selectedRegion.totalPopulation / 1000).toFixed(0)}k`}
                    </span>
                  </div>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-people"></i> Population non couverte
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRegion.uncoveredPopulation >= 1000000
                        ? `${(selectedRegion.uncoveredPopulation / 1000000).toFixed(1)}M`
                        : `${(selectedRegion.uncoveredPopulation / 1000).toFixed(0)}k`}
                    </span>
                  </div>
                </div>

                {/* Disponibilité (calcul client, vraie donnée) */}
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-check-circle"></i> Disponibilité
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-building"></i> Établissements ouverts maintenant
                    </span>
                    <span className="carte-panel-list-value">{selectedRegionBreakdown.functionalRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarteDashboard;