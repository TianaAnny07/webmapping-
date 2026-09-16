// CarteDashboard.jsx
import React, { useState, useMemo } from 'react';
import MapView from '../../components/MapView';
import FacilityDetailPanel from '../../components/FacilityDetailPanel';
import MiniMapSite from '../../components/MiniMapSite';
import api from '../../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './CarteDashboard.css';

const STATUT_COLORS = {
  Critique: '#e74c3c',
  Prioritaire: '#f39c12',
  Couvert: '#6DBE45',
};

function CarteDashboard({ facilities, isVisible = true }) {
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeMode, setRouteMode] = useState('driving');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [recommandations, setRecommandations] = useState([]);
  const [selectedRecommandation, setSelectedRecommandation] = useState(null);
    const [loadingRecommandations, setLoadingRecommandations] = useState(false);
  const [confirmReco, setConfirmReco] = useState(null);
  const [skipConfirm, setSkipConfirm] = useState(() => localStorage.getItem('reco-confirm-skip') === '1');

  // Ouvre la vue utilisateur, avec petit écran d'autorisation si besoin
  const openUserView = (url) => {
    if (localStorage.getItem('reco-confirm-skip') === '1') { window.open(url, '_blank'); return; }
    setConfirmReco(url);
  };

  const confirmOpen = () => {
    if (document.getElementById('reco-skip-check')?.checked) {
      localStorage.setItem('reco-confirm-skip', '1');
    }
    window.open(confirmReco, '_blank');
    setConfirmReco(null);
  };

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
    setSelectedRecommandation(null);
    setIsPanelOpen(true);
    const [lon, lat] = feature.geometry.coordinates;
    setFlyTo({ coords: [lat, lon], zoom: 15 });
  };

  const handleRegionClick = async (regionProperties) => {
    setSelectedRegion(regionProperties);
    setSelectedFacility(null);
    setSelectedRecommandation(null);
    setIsPanelOpen(true);

    const regionName = regionProperties.region || regionProperties.name;
    if (!regionName) {
      setRecommandations([]);
      return;
    }
    setLoadingRecommandations(true);
    try {
      const res = await api.get('/recommandations/implantation', {
        params: { region: regionName, k: 3 },
      });
      setRecommandations(res.data);
    } catch (err) {
      console.error('Erreur recommandations implantation:', err);
      setRecommandations([]);
    } finally {
      setLoadingRecommandations(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedFacility(null);
    setSelectedRegion(null);
    setSelectedRecommandation(null);
    setDestination(null);
    setIsPanelOpen(false);
    setRecommandations([]);
  };

  const handleRoute = (lat, lon, mode) => {
    setRouteMode(mode);
    setDestination([lat, lon]);
  };

  const handleVoirDetailRecommandation = (rec) => {
    setFlyTo({ coords: [rec.lat, rec.lng], zoom: 13 });
    setSelectedRecommandation(rec);
    setIsPanelOpen(true);
  };

  const handleExportPdf = async () => {
    const element = document.getElementById('fiche-site-recommande');
    if (!element) return;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`site-recommande-${selectedRecommandation?.id || ''}.pdf`);
  };

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

      <div className="carte-map-fullscreen">
        <MapView
          flyTo={flyTo}
          onSelectFacility={handleFacilityClick}
          onSelectRegion={handleRegionClick}
          onRoute={handleRoute}
          destination={destination}
          routeMode={routeMode}
          recommandations={recommandations}
         onVoirDetailRecommandation={handleVoirDetailRecommandation}
          isVisible={isVisible}
        />

        <div
          className={`carte-right-panel ${isPanelOpen ? 'open' : ''} ${
            selectedRegion ? `statut-${selectedRegion.statut?.toLowerCase()}` : ''
          }`}
        >
          <div className="carte-panel-header">
            <h2>
              <i className="bi bi-hospital"></i>
              {selectedFacility
                ? ' Établissement de santé'
                : selectedRecommandation
                ? ' Site recommandé'
                : ' Analyse d\'accessibilité'}
            </h2>
            <button className="carte-panel-close" onClick={handleClosePanel}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="carte-panel-content">
            {selectedFacility && (
              <FacilityDetailPanel
                feature={selectedFacility}
                onClose={handleClosePanel}
                onRoute={handleRoute}
              />
            )}

            {selectedRecommandation && (
              <div className="carte-region-details" id="fiche-site-recommande">
                <button
                  onClick={() => setSelectedRecommandation(null)}
                  style={{ background: 'none', border: 'none', color: '#6DBE45', cursor: 'pointer', padding: 0, marginBottom: '10px', fontSize: '13px' }}
                >
                  <i className="bi bi-arrow-left"></i> Retour à la région
                </button>

                <h3 className="carte-region-title">
                  <i className="bi bi-cone-striped" style={{ color: '#E67E22' }}></i>
                  Site recommandé n°{selectedRecommandation.id}
                </h3>

                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                    borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '12px',
                    background: '#fdecea', color: '#e74c3c',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e74c3c' }} />
                  Zone {selectedRecommandation.statut}
                </span>

                <p style={{ fontSize: '13px', lineHeight: 1.6, background: '#f8f9fa', padding: '10px', borderRadius: '6px' }}>
                  <i className="bi bi-info-circle-fill" style={{ color: '#378ADD' }}></i>{' '}
                  Ce terrain est identifié comme emplacement recommandé pour la construction d'un
                  nouvel établissement de santé, afin de réduire la distance d'accès aux soins pour
                  les populations environnantes.
                </p>

                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-geo-alt-fill"></i> Localisation
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-signpost"></i> Quartier / Fokontany
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRecommandation.quartier || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-signpost-split"></i> District
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRecommandation.district || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-crosshair"></i> Coordonnées GPS
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRecommandation.lat.toFixed(5)}, {selectedRecommandation.lng.toFixed(5)}
                    </span>
                  </div>

                                    <MiniMapSite lat={selectedRecommandation.lat} lng={selectedRecommandation.lng} />

                  
                    <button
                      onClick={() => {
                        const i = Math.max(0, recommandations.indexOf(selectedRecommandation));
                        const top = recommandations.slice(0, 3);
                        const url = `${window.location.origin}/app#reco=${encodeURIComponent(
                          JSON.stringify(top),
                        )}&i=${Math.min(i, Math.max(0, top.length - 1))}`;
                                                openUserView(url);
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: '#6DBE45', color: '#fff', border: 'none', borderRadius: 10,
                        padding: '11px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                      }}
                    >
                                            <i className="bi bi-geo-alt-fill"></i> Visualiser dans SantéGéo MG
                    </button>

                    {/* Petit écran d'autorisation avant d'entrer côté utilisateur */}
                    {confirmReco && (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: 380, boxShadow: '0 12px 40px rgba(0,0,0,.3)' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                            <i className="bi bi-shield-lock-fill" style={{ fontSize: 22, color: '#6DBE45' }}></i>
                            <b style={{ fontSize: 15, color: '#0f172a' }}>Autorisation requise</b>
                          </div>
                          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>
                            Vous allez ouvrir la vue utilisateur avec le terrain recommandé
                            {selectedRecommandation ? ` (${selectedRecommandation.quartier || selectedRecommandation.district || ''} · ${selectedRecommandation.region || ''})` : ''}.
                            Cette vue est réservée aux comptes autorisés.
                          </p>
                          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#64748b', marginBottom: 14, cursor: 'pointer' }}>
                            <input type="checkbox" id="reco-skip-check" defaultChecked={skipConfirm} />
                            Ne plus me le demander
                          </label>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setConfirmReco(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, color: '#334155' }}>Annuler</button>
                            <button onClick={confirmOpen} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#6DBE45', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>OK, entrer</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <a href={`https://www.google.com/maps/@${selectedRecommandation.lat},${selectedRecommandation.lng},18z/data=!3m1!1e3`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="carte-panel-external-link"
                    style={{ fontSize: 11 }}
                  >
                    <i className="bi bi-globe-americas"></i> (vue satellite Google)
                  </a>
                </div>
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-signpost-2"></i> Temps de trajet estimé
                  </h4>
                  <div className="carte-panel-stats-grid">
                    <div className="carte-panel-stat">
                      <div className="carte-panel-stat-value">{selectedRecommandation.avgCarMin} min</div>
                      <div className="carte-panel-stat-label"><i className="bi bi-car-front-fill"></i> En voiture</div>
                    </div>
                    <div className="carte-panel-stat">
                      <div className="carte-panel-stat-value">{selectedRecommandation.avgWalkMin} min</div>
                      <div className="carte-panel-stat-label"><i className="bi bi-person-walking"></i> À pied</div>
                    </div>
                  </div>
                </div>

                <div className="carte-panel-stats-grid">
                  <div className="carte-panel-stat">
                    <div className="carte-panel-stat-value">{selectedRecommandation.pourcentageCouverture}%</div>
                    <div className="carte-panel-stat-label">
                      <i className="bi bi-percent"></i> Population couverte
                    </div>
                  </div>
                  <div className="carte-panel-stat">
                    <div className="carte-panel-stat-value">
                      {selectedRecommandation.distancePlusProcheKm ?? '—'} km
                    </div>
                    <div className="carte-panel-stat-label">
                      <i className="bi bi-signpost-2"></i> Centre existant le plus proche
                    </div>
                  </div>
                </div>

                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-people"></i> Population
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-people-fill"></i> Population desservie estimée
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRecommandation.populationCouverte.toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-geo-alt-fill"></i> Commune la plus proche
                    </span>
                    <span className="carte-panel-list-value">{selectedRecommandation.communePlusProche}</span>
                  </div>
                </div>

                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-building-add"></i> À propos du terrain
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-hospital"></i> Structure suggérée
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRecommandation.typeEtablissementRecommande}
                    </span>
                  </div>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-people"></i> Population dans un rayon de 3 km
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedRecommandation.populationRayon3km.toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-list-ul"></i> Communes couvertes ({selectedRecommandation.communesCouvertes.length})
                  </h4>
                  <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
                    {selectedRecommandation.communesCouvertes.join(', ')}
                  </p>
                </div>

                <button onClick={handleExportPdf} className="carte-panel-export-btn">
                  <i className="bi bi-file-earmark-pdf"></i> Exporter en PDF
                </button>
              </div>
            )}

            {selectedRegion && selectedRegionBreakdown && !selectedRecommandation && (
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

                {loadingRecommandations && (
                  <div className="carte-panel-section" style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div className="mini-spinner" />
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px' }}>
                      Calcul des sites recommandés...
                    </p>
                  </div>
                )}
                {!loadingRecommandations && recommandations.length > 0 && (
                  <div className="carte-panel-section">
                    <h4 className="carte-panel-section-title">
                      <i className="bi bi-stars"></i> Sites recommandés ({recommandations.length})
                    </h4>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px' }}>
                      Cliquez sur <i className="bi bi-cone-striped" style={{ color: '#E67E22' }}></i> sur la carte pour voir le détail de chaque site.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarteDashboard;