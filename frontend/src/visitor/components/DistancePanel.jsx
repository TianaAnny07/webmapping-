import React from 'react';
import { formatDistance, formatDuration } from '../utils/geo';
import './DistancePanel.css';
 
/**
 * Petit panneau flottant affiché au-dessus de la carte pendant le mode
 * "mesurer une distance". Il guide l'utilisateur (cliquer point A, puis B)
 * et affiche les résultats (distance à vol d'oiseau + distance réelle par
 * la route, au choix). Aucune géolocalisation n'est utilisée ici : les
 * deux points viennent uniquement des clics sur la carte.
 */
function DistancePanel({
  pointA,
  pointB,
  straightLineKm,
  route,
  loading,
  error,
  onComputeRoute,
  onReset,
  onClose,
}) {
  let statusText = 'Cliquez sur la carte pour placer le point A.';
  if (pointA && !pointB) statusText = 'Cliquez sur la carte pour placer le point B.';
  if (pointA && pointB) statusText = 'Points placés. Choisissez un mode pour la distance réelle.';
 
  return (
    <div className="distance-panel">
      <div className="distance-panel__header">
        <span>
          <i className="bi bi-rulers"></i> Mesurer une distance
        </span>
        <button className="distance-panel__close" onClick={onClose} aria-label="Fermer">
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
 
      <p className="distance-panel__status">{statusText}</p>
 
      {pointA && pointB && (
        <>
          <div className="distance-panel__result">
            <i className="bi bi-arrow-left-right"></i>
            <span>Distance à vol d'oiseau : <strong>{straightLineKm.toFixed(1)} km</strong></span>
          </div>
 
          <div className="distance-panel__modes">
            <button disabled={loading} onClick={() => onComputeRoute('walking')}>
              <i className="bi bi-person-walking"></i> À pied
            </button>
            <button disabled={loading} onClick={() => onComputeRoute('cycling')}>
              <i className="bi bi-scooter"></i> Moto
            </button>
            <button disabled={loading} onClick={() => onComputeRoute('driving')}>
              <i className="bi bi-car-front-fill"></i> Voiture
            </button>
          </div>
 
          {loading && (
            <p className="distance-panel__loading">
              <i className="bi bi-arrow-repeat spin"></i> Calcul de l'itinéraire…
            </p>
          )}
 
          {error && <p className="distance-panel__error">{error}</p>}
 
          {route && !loading && (
            <div className="distance-panel__result distance-panel__result--route">
              <i className="bi bi-signpost-split"></i>
              <span>
                Par la route : <strong>{formatDistance(route.distanceMeters)}</strong>
                {' — '}
                {formatDuration(route.durationSeconds)}
              </span>
            </div>
          )}
        </>
      )}
 
      <button className="distance-panel__reset" onClick={onReset}>
        <i className="bi bi-arrow-counterclockwise"></i> Recommencer
      </button>
    </div>
  );
}
 
export default DistancePanel;
 