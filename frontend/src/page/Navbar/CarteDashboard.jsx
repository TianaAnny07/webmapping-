// CarteDashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import MapView from '../../components/MapView';
import FacilityDetailPanel from '../../components/FacilityDetailPanel';
import './CarteDashboard.css';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Centroïde approximatif d'un polygone/multipolygone GeoJSON (moyenne simple
// des sommets — suffisant pour une commune)
function roughCentroid(geometry) {
  const coords = [];
  const collect = (arr) => {
    if (typeof arr[0] === 'number') {
      coords.push(arr);
    } else {
      arr.forEach(collect);
    }
  };
  collect(geometry.coordinates);
  const lon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  return [lat, lon];
}

const MODE_SPEED_KMH = 30; // vitesse moyenne utilisée pour l'estimation du temps de trajet (voiture)
const ROUTE_DETOUR_FACTOR = 1.3; // compense le fait qu'une vraie route n'est jamais en ligne droite
const WHITE_ZONE_MIN = 60; // au-delà, une commune est considérée "non couverte"
const POP_FIELD_LATEST = 'mdg_admpop_adm3_2018_T_TL';

function CarteDashboard({ facilities }) {
  const [query, setQuery] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeMode, setRouteMode] = useState('driving');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Données démographiques réelles par commune — utilisées pour calculer la
  // couverture, la population et le temps de trajet d'une région au clic.
  const [communes, setCommunes] = useState([]);
  useEffect(() => {
    // Place ton fichier dans public/data/communes_population.geojson
    fetch('/data/communes_population.geojson')
      .then((res) => res.json())
      .then((data) => setCommunes(data.features || []))
      .catch((err) => console.error('Erreur chargement communes_population:', err));
  }, []);

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

  const handleRegionClick = (regionData) => {
    setSelectedRegion(regionData);
    setSelectedFacility(null);
    setIsPanelOpen(true);
    if (regionData.facilities && regionData.facilities.length > 0) {
      const avgLat = regionData.facilities.reduce((sum, f) => sum + f.geometry.coordinates[1], 0) / regionData.facilities.length;
      const avgLng = regionData.facilities.reduce((sum, f) => sum + f.geometry.coordinates[0], 0) / regionData.facilities.length;
      setFlyTo({ coords: [avgLat, avgLng], zoom: 8 });
    }
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

  // ===== Calcul RÉEL des statistiques d'une région (remplace Math.random()) =====
  const getRegionStats = (regionData) => {
    const regionFacilities = facilities.filter(f => {
      const p = f.properties;
      return p.adm1Name === regionData.name || p.adm2Name === regionData.name;
    });

    const total = regionFacilities.length;
    const hopitaux = regionFacilities.filter(f => f.properties.healthcare === 'hospital' || f.properties.amenity === 'hospital').length;
    const csb = regionFacilities.filter(f => f.properties.healthcare === 'doctor' || f.properties.healthcare === 'doctors').length;
    const csbi = regionFacilities.filter(f => f.properties.name && f.properties.name.includes('CSB II')).length;
    const cliniques = regionFacilities.filter(f => f.properties.healthcare === 'clinic').length;
    const pharmacies = regionFacilities.filter(f => f.properties.amenity === 'pharmacy').length;

    // Communes réelles de cette région (avec leur vraie population)
    const regionCommunes = communes.filter(
      (c) => (c.properties.ADM1_EN || '').trim().toLowerCase() === regionData.name.trim().toLowerCase()
    );

    let coverage = 0;
    let travelTime = 0;
    let population = 0;

    // La population totale ne dépend que des communes, pas des établissements
    // — elle doit rester correcte même si la région n'a (momentanément)
    // aucun établissement recensé.
    if (regionCommunes.length > 0) {
      population = Math.round(
        regionCommunes.reduce((sum, c) => sum + (c.properties[POP_FIELD_LATEST] || 0), 0)
      );
    }

    if (regionCommunes.length > 0 && regionFacilities.length > 0) {
      let coveredPop = 0;
      let totalPop = 0;
      let totalTimeMin = 0;

      regionCommunes.forEach((commune) => {
        const [lat, lon] = roughCentroid(commune.geometry);

        // Distance de cette commune à l'établissement de la région le plus proche
        let minDistKm = Infinity;
        regionFacilities.forEach((f) => {
          const [flon, flat] = f.geometry.coordinates;
          const d = haversineKm(lat, lon, flat, flon);
          if (d < minDistKm) minDistKm = d;
        });

        const timeMin = ((minDistKm * ROUTE_DETOUR_FACTOR) / MODE_SPEED_KMH) * 60;
        const pop = commune.properties[POP_FIELD_LATEST] || 0;

        totalPop += pop;
        totalTimeMin += timeMin;
        if (timeMin <= WHITE_ZONE_MIN) coveredPop += pop;
      });

      coverage = totalPop > 0 ? Math.round((coveredPop / totalPop) * 100) : 0;
      travelTime = Math.round(totalTimeMin / regionCommunes.length);
    }

    // "Établissements fonctionnels" n'a aucune donnée réelle derrière dans ta
    // base actuelle (pas de champ "opérationnel"/"fermé définitivement"...).
    // Remplacé par une vraie mesure : % actuellement ouvert maintenant,
    // calculé à partir de openingTime/closingTime/is24h qui, eux, existent
    // vraiment dans tes données.
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

    return {
      name: regionData.name,
      total,
      hopitaux,
      csb,
      csbi,
      cliniques,
      pharmacies,
      coverage,
      travelTime,
      population,
      functionalRate
    };
  };

  const selectedStats = selectedRegion ? getRegionStats(selectedRegion) : null;

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

        {/* PANNEAU LATÉRAL DROIT - Sans emojis, avec de vraies icônes */}
        <div className={`carte-right-panel ${isPanelOpen ? 'open' : ''}`}>
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

            {/* Cas 2: Région sélectionnée */}
            {selectedRegion && selectedStats && (
              <div className="carte-region-details">
                <h3 className="carte-region-title">
                  <i className="bi bi-geo-alt-fill" style={{ color: '#6DBE45' }}></i>
                  {selectedStats.name}
                </h3>
                
                {/* Statistiques de couverture */}
                <div className="carte-panel-stats-grid">
                  <div className="carte-panel-stat">
                    <div className="carte-panel-stat-value">{selectedStats.coverage}%</div>
                    <div className="carte-panel-stat-label">
                      <i className="bi bi-percent"></i> Couverture
                    </div>
                  </div>
                  <div className="carte-panel-stat">
                    <div className="carte-panel-stat-value">{selectedStats.travelTime} min</div>
                    <div className="carte-panel-stat-label">
                      <i className="bi bi-clock"></i> Temps de trajet
                    </div>
                  </div>
                </div>

                {/* Établissements de santé */}
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-hospital"></i> Établissements de santé
                  </h4>
                  <div className="carte-panel-list">
                    <div className="carte-panel-list-item">
                      <span className="carte-panel-list-label">
                        <i className="bi bi-building"></i> Total
                      </span>
                      <span className="carte-panel-list-value">{selectedStats.total}</span>
                    </div>
                    {selectedStats.hopitaux > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-hospital"></span> Hôpitaux/CHU
                        </span>
                        <span className="carte-panel-list-value">{selectedStats.hopitaux}</span>
                      </div>
                    )}
                    {selectedStats.csb > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-csb"></span> CSB
                        </span>
                        <span className="carte-panel-list-value">{selectedStats.csb}</span>
                      </div>
                    )}
                    {selectedStats.csbi > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-csbi"></span> CSB II
                        </span>
                        <span className="carte-panel-list-value">{selectedStats.csbi}</span>
                      </div>
                    )}
                    {selectedStats.cliniques > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-clinic"></span> Cliniques
                        </span>
                        <span className="carte-panel-list-value">{selectedStats.cliniques}</span>
                      </div>
                    )}
                    {selectedStats.pharmacies > 0 && (
                      <div className="carte-panel-list-item">
                        <span className="carte-panel-list-label">
                          <span className="dot dot-pharmacy"></span> Pharmacies
                        </span>
                        <span className="carte-panel-list-value">{selectedStats.pharmacies}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Population */}
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-people"></i> Population
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-people-fill"></i> Population totale
                    </span>
                    <span className="carte-panel-list-value">
                      {selectedStats.population >= 1000000 
                        ? `${(selectedStats.population / 1000000).toFixed(1)}M` 
                        : `${(selectedStats.population / 1000).toFixed(0)}k`}
                    </span>
                  </div>
                </div>

                {/* Disponibilité */}
                <div className="carte-panel-section">
                  <h4 className="carte-panel-section-title">
                    <i className="bi bi-check-circle"></i> Disponibilité
                  </h4>
                  <div className="carte-panel-list-item">
                    <span className="carte-panel-list-label">
                      <i className="bi bi-building"></i> Établissements ouverts maintenant
                    </span>
                    <span className="carte-panel-list-value">{selectedStats.functionalRate}%</span>
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