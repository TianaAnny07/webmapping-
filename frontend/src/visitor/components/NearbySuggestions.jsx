// src/visitor/components/NearbySuggestions.jsx

import React, { useMemo } from 'react';
import { haversineKm } from '../utils/geo';
import { formatDistance } from '../utils/geo';

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

function NearbySuggestions({ facilities, position, onSelectFacility, onClose }) {
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

  return (
    <div className="nearby-suggest-backdrop" onClick={onClose}>
      <div className="nearby-suggest" onClick={(e) => e.stopPropagation()}>
        <div className="nearby-suggest__header">
          <div className="nearby-suggest__title">
            <i className="bi bi-geo-alt-fill"></i>
            Établissements près de vous
          </div>
          <button className="nearby-suggest__close" onClick={onClose} aria-label="Fermer">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="nearby-suggest__sub">
          Le plus proche de chaque catégorie, selon votre position actuelle.
        </div>

        {suggestions.length === 0 ? (
          <div className="nearby-suggest__empty">
            Aucun établissement trouvé autour de vous pour l'instant.
          </div>
        ) : (
          <div className="nearby-suggest__list">
            {suggestions.map((s) => (
              <button
                key={s.key}
                className="nearby-suggest__card"
                onClick={() => onSelectFacility(s.facility)}
              >
                <div className="nearby-suggest__icon" style={{ background: s.color }}>
                  <i className={`bi ${s.icon}`}></i>
                </div>
                <div className="nearby-suggest__info">
                  <div className="nearby-suggest__category">{s.label}</div>
                  <div className="nearby-suggest__name">
                    {s.facility.properties.name || 'Formation sanitaire'}
                  </div>
                </div>
                <div className="nearby-suggest__distance">
                  {formatDistance(s.distanceKm * 1000)}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="nearby-suggest__footer">
          <button className="nearby-suggest__search-link" onClick={onClose}>
            Aucun ne me convient — rechercher moi-même
          </button>
        </div>
      </div>
    </div>
  );
}

export default NearbySuggestions;