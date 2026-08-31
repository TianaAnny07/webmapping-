// src/visitor/components/NearbySuggestions.jsx

import React, { useMemo } from 'react';
import { haversineKm, formatDistance } from '../utils/geo';

function upper(s) {
  return (s || '').toUpperCase();
}

// ===== Règles de catégorisation (ordre important : CHU avant Hôpital,
// CSB II avant CSB I, pour éviter les faux positifs de sous-chaîne) =====
function matchChu(p) {
  const n = upper(p.name);
  return n.includes('CHU') || n.includes('CHR') || n.includes('CHD') || n.includes('CHP');
}
function matchHopital(p) {
  if (matchChu(p)) return false;
  const t = p.healthcare || p.amenity || p.type || '';
  const n = upper(p.name);
  return t === 'hospital' || t === 'hopital' || n.includes('HOPITAL') || n.includes('HÔPITAL');
}
function matchCsb2(p) {
  const n = upper(p.name);
  const t = p.healthcare || p.amenity || p.type || '';
  return n.includes('CSB II') || n.includes('CSB2') || t === 'doctor' || t === 'doctors';
}
function matchCsb1(p) {
  if (matchCsb2(p)) return false;
  const n = upper(p.name);
  const t = p.healthcare || p.amenity || p.type || '';
  return n.includes('CSB I') || n.includes('CSB1') || t === 'csb' || t === 'health_centre';
}
function matchPharmacie(p) {
  const n = upper(p.name);
  const t = p.healthcare || p.amenity || p.type || '';
  return t === 'pharmacy' || t === 'pharmacie' || n.includes('PHARMACIE');
}
function matchClinique(p) {
  const n = upper(p.name);
  const t = p.healthcare || p.amenity || p.type || '';
  return t === 'clinic' || t === 'clinique' || n.includes('CLINIQUE');
}
function matchMaternite(p) {
  const n = upper(p.name);
  const t = p.healthcare || p.amenity || p.type || '';
  return t === 'birthing_centre' || t === 'midwife' || n.includes('MATERNITE') || n.includes('MATERNITÉ');
}

const CATEGORIES = [
  { key: 'chu', label: 'CHU / CHR / CHD', icon: 'bi-hospital-fill', color: '#c0392b', match: matchChu },
  { key: 'hopital', label: 'Hôpital', icon: 'bi-hospital', color: '#e74c3c', match: matchHopital },
  { key: 'csb2', label: 'CSB II / Médecin', icon: 'bi-plus-circle-fill', color: '#2980b9', match: matchCsb2 },
  { key: 'csb1', label: 'CSB I', icon: 'bi-plus-circle', color: '#5dade2', match: matchCsb1 },
  { key: 'pharmacie', label: 'Pharmacie', icon: 'bi-capsule', color: '#27ae60', match: matchPharmacie },
  { key: 'clinique', label: 'Clinique', icon: 'bi-building-fill-cross', color: '#8e44ad', match: matchClinique },
  { key: 'maternite', label: 'Maternité', icon: 'bi-gender-female', color: '#e91e8c', match: matchMaternite },
];

/**
 * Bandeau de suggestion à 3 états :
 * - 'collapsed' : bandeau compact "Bonjour X 👋 · Toucher pour voir le détail"
 * - 'expanded'  : le même bandeau, avec la liste des 7 catégories dépliée en dessous
 * - 'minimized' : réduit à une petite pastille discrète, réouvrable
 * (état 'closed' = rien ne s'affiche, géré par le parent qui ne monte pas le composant)
 */
function NearbySuggestions({
  state, // 'collapsed' | 'expanded' | 'minimized'
  userName,
  facilities,
  position,
  onSelectFacility,
  onExpandToggle,
  onMinimize,
  onReopen,
}) {
  const suggestions = useMemo(() => {
    if (!position || !facilities?.length) return [];
    const [lat, lon] = position;

    return CATEGORIES.map((cat) => {
      let nearest = null;
      let nearestKm = Infinity;
      facilities.forEach((f) => {
        if (!cat.match(f.properties || {})) return;
        const [flon, flat] = f.geometry.coordinates;
        const d = haversineKm(lat, lon, flat, flon);
        if (d < nearestKm) {
          nearestKm = d;
          nearest = f;
        }
      });
      if (!nearest) return null;
      return { ...cat, facility: nearest, distanceKm: nearestKm };
    }).filter(Boolean);
  }, [position, facilities]);

  if (state === 'minimized') {
    return (
      <button className="nearby-pill" onClick={onReopen} aria-label="Rouvrir les suggestions">
        <span className="nearby-pill__wave">👋</span>
      </button>
    );
  }

  const isExpanded = state === 'expanded';

  return (
    <div className="nearby-banner">
      <button className="nearby-banner__header" onClick={onExpandToggle}>
        <div className="nearby-banner__text">
          <div className="nearby-banner__title">
            Bonjour {userName || ''} <span className="nearby-banner__wave">👋</span>
          </div>
          <div className="nearby-banner__subtitle">Toucher pour voir le détail</div>
        </div>
        <div className="nearby-banner__actions">
          <span className="nearby-banner__chevron" aria-label={isExpanded ? 'Réduire' : 'Déplier'}>
            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </span>
          <span
            className="nearby-banner__close"
            role="button"
            aria-label="Minimiser"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
          >
            <i className="bi bi-x-lg"></i>
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="nearby-banner__list">
          {suggestions.length === 0 ? (
            <div className="nearby-banner__empty">
              Aucun établissement trouvé autour de vous pour l'instant.
            </div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.key}
                className="nearby-banner__card"
                onClick={() => onSelectFacility(s.facility)}
              >
                <div className="nearby-banner__card-icon" style={{ background: s.color }}>
                  <i className={`bi ${s.icon}`}></i>
                </div>
                <div className="nearby-banner__card-info">
                  <div className="nearby-banner__card-category">{s.label}</div>
                  <div className="nearby-banner__card-name">
                    {s.facility.properties.name || 'Formation sanitaire'}
                  </div>
                </div>
                <div className="nearby-banner__card-distance">
                  {formatDistance(s.distanceKm * 1000)}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NearbySuggestions;