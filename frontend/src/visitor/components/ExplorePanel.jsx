import React from 'react';
import { getTypeLabel } from '../utils/facilityDisplay';
import { formatDistance } from '../utils/geo';

function FacilityRow({ feature, onSelect, distanceKm }) {
  const p = feature.properties;
  return (
    <button className="explore-row" onClick={() => onSelect(feature)}>
      <div className="explore-row__icon">
        <i className="bi bi-hospital"></i>
      </div>
      <div className="explore-row__info">
        <div className="explore-row__name">{p.name || 'Formation sanitaire'}</div>
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
}) {
  const list = tab === 'nearby' ? nearbyResults : searchResults;

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
          Tous
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

      {tab === 'nearby' && geoError && (
        <div className="explore-empty">{geoError}</div>
      )}

      {tab === 'nearby' && nearbyLoading && (
        <div className="explore-empty">Recherche des établissements proches…</div>
      )}

      <div className="explore-list">
        {list.length === 0 && !nearbyLoading && (
          <div className="explore-empty">
            {tab === 'nearby'
              ? 'Activez la géolocalisation pour voir les établissements les plus proches.'
              : 'Aucun établissement trouvé.'}
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
