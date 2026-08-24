// src/visitor/components/FacilityDetail.jsx

import React from 'react';
import { getTypeLabel, isOpenNow } from '../utils/facilityDisplay';
import { formatDistance, formatDuration } from '../utils/geo';
import { MODE_SPEEDS_KMH } from '../utils/osrm';

const MODES = [
  { key: 'walking', label: 'A pied', icon: 'bi-person-walking' },
  { key: 'cycling', label: 'Moto', icon: 'bi-bicycle' },
  { key: 'driving', label: 'Voiture', icon: 'bi-car-front-fill' },
];

function getFacilityIcon(healthcare, amenity, name, type) {
  const nomUpper = (name || '').toUpperCase();
  const facilityType = type || healthcare || amenity || '';
  
  if (nomUpper.includes('CHU') || nomUpper.includes('CHR') || nomUpper.includes('CHP') || 
      facilityType === 'hospital' || facilityType === 'hopital') {
    return 'bi-hospital-fill';
  }
  
  if (nomUpper.includes('CSB') || facilityType === 'csb' || facilityType === 'health_centre') {
    return 'bi-plus-circle-fill';
  }
  
  if (facilityType === 'clinic' || facilityType === 'clinique' || 
      nomUpper.includes('CENTRE DE SANTE')) {
    return 'bi-building-fill-cross';
  }
  
  if (facilityType === 'pharmacy' || facilityType === 'pharmacie' || 
      nomUpper.includes('PHARMACIE')) {
    return 'bi-capsule';
  }
  
  if (facilityType === 'doctor' || facilityType === 'doctors' || 
      facilityType === 'nurse' || facilityType === 'infirmier') {
    return 'bi-person-fill-cross';
  }
  
  if (facilityType === 'dentist' || facilityType === 'dentiste') {
    return 'bi-emoji-smile-fill';
  }
  
  if (facilityType === 'birthing_centre' || facilityType === 'midwife' || 
      nomUpper.includes('MATERNITE')) {
    return 'bi-gender-female';
  }
  
  if (facilityType === 'emergency' || facilityType === 'urgence' || 
      nomUpper.includes('URGENCE')) {
    return 'bi-activity';
  }
  
  return 'bi-heart-pulse-fill';
}

function getFacilityColor(healthcare, amenity, name, type) {
  const nomUpper = (name || '').toUpperCase();
  const facilityType = type || healthcare || amenity || '';
  
  if (nomUpper.includes('CHU') || nomUpper.includes('CHR') || nomUpper.includes('CHP') || 
      facilityType === 'hospital' || facilityType === 'hopital') {
    return '#6DBE45';
  }
  if (nomUpper.includes('CSB') || facilityType === 'csb') {
    return '#0EA5E9';
  }
  if (facilityType === 'pharmacy' || facilityType === 'pharmacie' || 
      nomUpper.includes('PHARMACIE')) {
    return '#8B5CF6';
  }
  if (facilityType === 'clinic' || facilityType === 'clinique') {
    return '#F59E0B';
  }
  if (facilityType === 'emergency' || facilityType === 'urgence') {
    return '#EF4444';
  }
  return '#6DBE45';
}

function getInfoBadges(p) {
  const badges = [];
  if (p.is24h) badges.push({ icon: 'bi-clock-fill', label: 'Ouvert 24h/24', variant: 'primary' });
  if (p.phone) badges.push({ icon: 'bi-telephone-fill', label: 'Contact telephone', variant: 'info' });
  if (p.services) badges.push({ icon: 'bi-capsule', label: p.services.length > 20 ? p.services.substring(0, 20) + '…' : p.services, variant: 'warning' });
  if (p.emergency || p.healthcare === 'hospital') badges.push({ icon: 'bi-activity', label: 'Urgences', variant: 'emergency' });
  return badges;
}

function FacilityDetail({
  feature,
  onBack,
  routePreview,
  previewLoading,
  onPreviewMode,
  onValidateRoute,
  onCancelPreview,
  navigating,
  onStopNavigation,
  progressPercent = 0,
  distanceRemaining = 0,
  timeRemaining = 0,
  onStartSimulation,
  isSimulating,
  simulationProgress,
  onStopSimulation,
}) {
  const p = feature.properties;
  const open = isOpenNow(p.openingTime, p.closingTime, p.is24h);
  const isThisRouteActive = navigating && navigating.facilityId === p.id;
  
  const facilityType = p.healthcare || p.amenity || p.type || '';
  const heroIcon = getFacilityIcon(p.healthcare, p.amenity, p.name, p.type);
  const heroColor = getFacilityColor(p.healthcare, p.amenity, p.name, p.type);
  const badges = getInfoBadges(p);

  const statusClass = p.is24h ? 'open' : open === true ? 'open' : open === false ? 'closed' : 'unknown';
  const statusLabel = p.is24h
    ? 'Ouvert 24h/24'
    : open === true
    ? `Ouvert · ${p.openingTime}–${p.closingTime}`
    : open === false
    ? `Ferme · reouvre a ${p.openingTime}`
    : 'Horaires non renseignes';

  const getProgressColor = (percent) => {
    if (percent >= 80) return '#22c55e';
    if (percent >= 50) return '#6DBE45';
    if (percent >= 20) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="facility-detail">
      <div className="facility-detail__hero" style={{ 
        background: `linear-gradient(135deg, ${heroColor}, ${heroColor}dd)`
      }}>
        <button className="facility-detail__back" onClick={onBack}>
          <i className="bi bi-arrow-left"></i> Retour
        </button>
        
        <div className="facility-detail__hero-icon">
          <i className={`bi ${heroIcon}`}></i>
        </div>

        <div className="facility-detail__hero-content">
          <div className="facility-detail__hero-avatar" style={{ background: heroColor }}>
            <i className={`bi ${heroIcon}`}></i>
          </div>
          <div className="facility-detail__hero-info">
            <h2 className="facility-detail__hero-title">{p.name || 'Formation sanitaire'}</h2>
            <div className="facility-detail__hero-type">
              <span>{getTypeLabel(p.healthcare, p.amenity, p.name)}</span>
              <span className={`facility-detail__hero-status facility-detail__hero-status--${statusClass}`}>
                <i className={`bi ${statusClass === 'open' ? 'bi-check-circle-fill' : statusClass === 'closed' ? 'bi-x-circle-fill' : 'bi-clock'}`}></i>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isThisRouteActive && (
        <div className="facility-detail__progress-section">
          <div className="facility-detail__progress-header">
            <span>
              <i className="bi bi-arrow-right-circle"></i> Progression du trajet
            </span>
            <span className="facility-detail__progress-percent">{Math.round(progressPercent)}%</span>
          </div>
          <div className="facility-detail__progress-bar">
            <div 
              className="facility-detail__progress-fill" 
              style={{ 
                width: `${Math.min(100, progressPercent)}%`,
                background: `linear-gradient(90deg, ${getProgressColor(progressPercent)}, ${getProgressColor(Math.min(100, progressPercent + 20))})`
              }}
            />
          </div>
          <div className="facility-detail__progress-info">
            <span>
              <i className="bi bi-geo-alt"></i> {Math.round(distanceRemaining)} m restants
            </span>
            <span>
              <i className="bi bi-clock"></i> {Math.round(timeRemaining)} min
            </span>
            <span>
              <i className="bi bi-activity"></i> {navigating?.mode === 'walking' ? 'Pieton' : navigating?.mode === 'cycling' ? 'Moto' : 'Voiture'}
            </span>
          </div>
        </div>
      )}

      <div className="facility-detail__content">
        {badges.length > 0 && (
          <div className="facility-detail__badges">
            {badges.map((b, i) => (
              <span key={i} className={`facility-detail__badge facility-detail__badge--${b.variant}`}>
                <i className={`bi ${b.icon}`}></i> {b.label}
              </span>
            ))}
          </div>
        )}

        <div className="facility-detail__info-section">
          <div className="facility-detail__info-row">
            <div className="facility-detail__info-icon"><i className="bi bi-geo-alt-fill"></i></div>
            <div className="facility-detail__info-content">
              <div className="facility-detail__info-label">Localisation</div>
              <div className="facility-detail__info-value">
                {[p.adm3Name, p.adm2Name, p.adm1Name].filter(Boolean).join(', ') || 'Non renseignee'}
              </div>
            </div>
          </div>
          {p.phone && (
            <div className="facility-detail__info-row">
              <div className="facility-detail__info-icon"><i className="bi bi-telephone-fill"></i></div>
              <div className="facility-detail__info-content">
                <div className="facility-detail__info-label">Telephone</div>
                <div className="facility-detail__info-value">{p.phone}</div>
              </div>
            </div>
          )}
          {p.services && (
            <div className="facility-detail__info-row">
              <div className="facility-detail__info-icon"><i className="bi bi-capsule"></i></div>
              <div className="facility-detail__info-content">
                <div className="facility-detail__info-label">Services</div>
                <div className="facility-detail__info-value">{p.services}</div>
              </div>
            </div>
          )}
          <div className="facility-detail__info-row">
            <div className="facility-detail__info-icon"><i className="bi bi-clock-fill"></i></div>
            <div className="facility-detail__info-content">
              <div className="facility-detail__info-label">Horaires</div>
              <div className="facility-detail__info-value">
                {p.is24h ? '24h/24 - 7j/7' : p.openingTime && p.closingTime ? `${p.openingTime} – ${p.closingTime}` : 'Non renseignes'}
              </div>
            </div>
          </div>
        </div>

        {isThisRouteActive ? (
          <div className="facility-detail__nav-active">
            <div className="facility-detail__nav-summary">
              <span className="nav-pulse"></span>
              Navigation en cours — {formatDistance(navigating.distanceMeters)} · {formatDuration(navigating.durationSeconds)}
              {navigating.mode && ` (${MODE_SPEEDS_KMH[navigating.mode]} km/h)`}
            </div>
            
            {/* ===== BOUTON SIMULATION ===== */}
            <div style={{ marginTop: '10px', marginBottom: '10px' }}>
              <button 
                className="btn-simulate"
                onClick={onStartSimulation}
                disabled={isSimulating}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '10px',
                  background: isSimulating ? '#94a3b8' : '#8B5CF6',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isSimulating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                }}
              >
                {isSimulating ? (
                  <>
                    <i className="bi bi-hourglass-split spin"></i>
                    Simulation en cours... {Math.round(simulationProgress)}%
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-fill"></i>
                    Simuler le trajet (demo)
                  </>
                )}
              </button>
              {isSimulating && (
                <button 
                  onClick={onStopSimulation}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '8px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#fee2e2',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="bi bi-stop-fill"></i>
                  Arreter la simulation
                </button>
              )}
            </div>

            <button className="btn-danger" onClick={onStopNavigation}>
              <i className="bi bi-stop-circle-fill"></i> Arreter la navigation
            </button>
          </div>
        ) : (
          <>
            <div className="facility-detail__section-title">
              <i className="bi bi-signpost-2"></i> Itineraire
            </div>
            <div className="facility-detail__modes">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  className={`mode-btn ${routePreview?.mode === m.key ? 'is-active' : ''}`}
                  onClick={() => onPreviewMode(m.key)}
                >
                  <i className={`bi ${m.icon}`}></i>
                  <span>{m.label}</span>
                  <span className="mode-btn__speed">{MODE_SPEEDS_KMH[m.key]} km/h</span>
                </button>
              ))}
            </div>

            {previewLoading && (
              <div className="facility-detail__preview-loading">
                <i className="bi bi-arrow-repeat spin"></i> Calcul de l'itineraire…
              </div>
            )}

            {routePreview && !previewLoading && (
              <div className="facility-detail__preview">
                <div className="facility-detail__preview-stats">
                  <span><i className="bi bi-arrow-left-right"></i> {formatDistance(routePreview.distanceMeters)}</span>
                  <span><i className="bi bi-clock"></i> {formatDuration(routePreview.durationSeconds)}</span>
                </div>
                <p className="facility-detail__preview-speed">
                  Estimation basee sur une vitesse moyenne de {MODE_SPEEDS_KMH[routePreview.mode]} km/h
                  {routePreview.mode === 'cycling' ? ' (moto)' : routePreview.mode === 'driving' ? ' (voiture)' : ' (a pied)'}.
                </p>
                <p className="facility-detail__preview-hint">
                  Verifiez l'itineraire trace sur la carte, puis validez pour demarrer la navigation.
                </p>
                <div className="facility-detail__preview-actions">
                  <button className="btn-secondary" onClick={onCancelPreview}>Annuler</button>
                  <button className="btn-primary" onClick={onValidateRoute}>
                    <i className="bi bi-check2"></i> Valider l'itineraire
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isThisRouteActive && (
          <div className="facility-detail__stop-container">
            <button className="facility-detail__stop-btn" onClick={onStopNavigation}>
              <i className="bi bi-stop-circle"></i> Arreter la navigation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FacilityDetail;