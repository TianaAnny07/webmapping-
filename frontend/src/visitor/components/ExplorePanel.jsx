import React, { useState, useMemo, useEffect } from 'react';
import { getTypeLabel, isOpenNow } from '../utils/facilityDisplay';
import { formatDistance } from '../utils/geo';

const FACILITY_TYPES = [
  { value: 'hospital', label: 'Hôpital' },
  { value: 'clinic', label: 'Clinique' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'doctor', label: 'CSB (Médecin)' },
  { value: 'nurse', label: 'Poste de santé' },
  { value: 'dentist', label: 'Dentiste' },
  { value: 'birthing_centre', label: 'Maternité' },
];

function FacilityRow({ feature, onSelect, distanceKm }) {
  const p = feature.properties;
  const open = isOpenNow(p.openingTime, p.closingTime, p.is24h);

  const statusClass = p.is24h ? 'open' : open === true ? 'open' : open === false ? 'closed' : 'unknown';
  const statusIcon = statusClass === 'open' ? 'bi-check-circle-fill' : statusClass === 'closed' ? 'bi-x-circle-fill' : 'bi-clock';
  const statusLabel = p.is24h ? 'Ouvert 24h/24' : open === true ? 'Ouvert' : open === false ? 'Fermé' : 'N/A';

  return (
    <button className="explore-row" onClick={() => onSelect(feature)}>
      <div className="explore-row__icon">
        <i className="bi bi-hospital"></i>
      </div>
      <div className="explore-row__info">
        <div className="explore-row__name">
          {p.name || 'Formation sanitaire'}
          <span className={`explore-row__status-badge explore-row__status-badge--${statusClass}`}>
            <i className={`bi ${statusIcon}`}></i> {statusLabel}
          </span>
        </div>
        <div className="explore-row__meta">
          {getTypeLabel(p.healthcare, p.amenity, p.name)}
          {p.adm2Name ? ` · ${p.adm2Name}` : ''}
        </div>
      </div>
      {distanceKm != null && (
        <div className="explore-row__distance">{formatDistance(distanceKm * 1000)}</div>
      )}
      <i className="bi bi-chevron-right explore-row__chevron"></i>
    </button>
  );
}

function ExplorePanel({
  query,
  onQueryChange,
  tab,
  onTabChange,
  searchResults,
  nearbyResults,
  nearbyLoading,
  onSelectFacility,
  onRequestNearby,
  geoError,
  userRegion, // région détectée via reverse geocoding (ou null si position pas encore activée)
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  // Filtre "ma région" actif par défaut dès qu'on connaît la région ;
  // l'utilisateur peut le désactiver pour revoir tout Madagascar.
  const [useRegionFilter, setUseRegionFilter] = useState(true);

  // Dès qu'une nouvelle région est détectée (nouvelle activation de
  // position), on réactive le filtre par défaut.
  useEffect(() => {
    if (userRegion) setUseRegionFilter(true);
  }, [userRegion]);

  const applyCommonFilters = (results) => {
    let out = results;

    if (typeFilter !== 'all') {
      out = out.filter((f) => {
        const type = f.properties.healthcare || f.properties.amenity || '';
        const nameUpper = (f.properties.name || '').toUpperCase();
        if (typeFilter === 'doctor') {
          return type === 'doctor' || type === 'doctors' || nameUpper.includes('CSB');
        }
        return type === typeFilter;
      });
    }

    if (openNowOnly) {
      out = out.filter((f) => {
        const open = isOpenNow(f.properties.openingTime, f.properties.closingTime, f.properties.is24h);
        return open === true;
      });
    }

    return out;
  };

  const filteredSearchResults = useMemo(() => {
    let results = searchResults;

    // Filtre région : uniquement les établissements de la région détectée
    if (userRegion && useRegionFilter) {
      const target = userRegion.trim().toLowerCase();
      results = results.filter(
        (f) => (f.properties.adm1Name || '').trim().toLowerCase() === target
      );
    }

    return applyCommonFilters(results);
  }, [searchResults, typeFilter, openNowOnly, userRegion, useRegionFilter]);

  const filteredNearbyResults = useMemo(() => {
    return applyCommonFilters(nearbyResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyResults, typeFilter, openNowOnly]);

  const list = tab === 'nearby' ? filteredNearbyResults : filteredSearchResults;

  const hasActiveFilters = typeFilter !== 'all' || openNowOnly;

  const clearFilters = () => {
    setTypeFilter('all');
    setOpenNowOnly(false);
  };

  return (
    <div className="explore-panel">
      <div className="explore-search">
        <i className="bi bi-search"></i>
        <input
          type="text"
          placeholder="Rechercher un établissement de santé…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button className="explore-search__clear" onClick={() => onQueryChange('')}>
            <i className="bi bi-x-circle-fill"></i>
          </button>
        )}
      </div>

      <div className="explore-tabs">
        <button
          className={`explore-tab ${tab === 'search' ? 'is-active' : ''}`}
          onClick={() => onTabChange('search')}
        >
          <i className="bi bi-grid-fill"></i> Tous
        </button>
        <button
          className={`explore-tab ${tab === 'nearby' ? 'is-active' : ''}`}
          onClick={() => {
            onTabChange('nearby');
            onRequestNearby();
          }}
        >
          <i className="bi bi-geo-alt-fill"></i> Près de moi
        </button>
      </div>

      {/* Filtres */}
      <div className="explore-filters">
        <select
          className="explore-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Tous les types</option>
          {FACILITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <button
          className={`explore-filter-toggle ${openNowOnly ? 'is-active' : ''}`}
          onClick={() => setOpenNowOnly((v) => !v)}
          title="Afficher uniquement les établissements ouverts maintenant"
        >
          <i className="bi bi-clock-fill"></i>
          <span>Ouverts maintenant</span>
        </button>
        {hasActiveFilters && (
          <button className="explore-filter-clear" onClick={clearFilters} title="Effacer les filtres">
            <i className="bi bi-x-circle-fill"></i>
          </button>
        )}
      </div>

      {/* Bandeau filtre région — uniquement sur l'onglet "Tous", si la
          région est connue */}
      {tab === 'search' && userRegion && (
        <div className="explore-region-banner">
          <div className="explore-region-banner__text">
            <i className="bi bi-signpost-2-fill"></i>
            {useRegionFilter ? (
              <span>Établissements de la région <strong>{userRegion}</strong></span>
            ) : (
              <span>Affichage de <strong>toute Madagascar</strong></span>
            )}
          </div>
          <button
            className="explore-region-banner__toggle"
            onClick={() => setUseRegionFilter((v) => !v)}
          >
            {useRegionFilter ? 'Voir tout' : `Revenir à ${userRegion}`}
          </button>
        </div>
      )}

      {tab === 'nearby' && geoError && (
        <div className="explore-empty">{geoError}</div>
      )}

      {tab === 'nearby' && nearbyLoading && (
        <div className="explore-empty">
          <i className="bi bi-arrow-repeat spin"></i> Recherche des établissements proches…
        </div>
      )}

      <div className="explore-list">
        {list.length === 0 && !nearbyLoading && (
          <div className="explore-empty">
            <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }}></i>
            {tab === 'nearby'
              ? 'Activez la géolocalisation pour voir les établissements les plus proches.'
              : tab === 'search' && userRegion && useRegionFilter
              ? `Aucun établissement trouvé dans la région ${userRegion} avec ces filtres.`
              : 'Aucun établissement trouvé avec ces filtres.'}
          </div>
        )}
        {list.map((item) => (
          <FacilityRow
            key={item.properties.id}
            feature={item}
            distanceKm={item.properties.__distanceKm}
            onSelect={onSelectFacility}
          />
        ))}
      </div>
    </div>
  );
}

export default ExplorePanel;