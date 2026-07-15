// import React from 'react';
// import { getTypeLabel, isOpenNow } from '../utils/facilityDisplay';
// import { formatDistance, formatDuration } from '../utils/geo';

// const MODES = [
//   { key: 'walking', label: 'À pied', icon: 'bi-person-walking' },
//   { key: 'cycling', label: 'Moto', icon: 'bi-bicycle' },
//   { key: 'driving', label: 'Voiture', icon: 'bi-car-front-fill' },
// ];

// function FacilityDetail({
//   feature,
//   onBack,
//   routePreview,
//   previewLoading,
//   onPreviewMode,
//   onValidateRoute,
//   onCancelPreview,
//   navigating,
//   onStopNavigation,
// }) {
//   const p = feature.properties;
//   const open = isOpenNow(p.openingTime, p.closingTime, p.is24h);
//   const isThisRouteActive = navigating && navigating.facilityId === p.id;

//   return (
//     <div className="facility-detail">
//       <button className="facility-detail__back" onClick={onBack}>
//         <i className="bi bi-arrow-left"></i> Retour
//       </button>

//       <h2 className="facility-detail__title">{p.name || 'Formation sanitaire'}</h2>
//       <div className="facility-detail__type">{getTypeLabel(p.healthcare, p.amenity, p.name)}</div>

//       <div className="facility-detail__rows">
//         <div className="facility-detail__row">
//           <i className="bi bi-geo-alt-fill"></i>
//           <span>{[p.adm3Name, p.adm2Name, p.adm1Name].filter(Boolean).join(', ') || 'Localisation non renseignée'}</span>
//         </div>
//         {p.phone && (
//           <div className="facility-detail__row">
//             <i className="bi bi-telephone-fill"></i>
//             <span>{p.phone}</span>
//           </div>
//         )}
//         {p.services && (
//           <div className="facility-detail__row">
//             <i className="bi bi-capsule"></i>
//             <span>{p.services}</span>
//           </div>
//         )}
//         <div className="facility-detail__row">
//           {p.is24h ? (
//             <span className="facility-detail__status facility-detail__status--open">
//               <i className="bi bi-check-circle-fill"></i> Ouvert 24h/24
//             </span>
//           ) : open === true ? (
//             <span className="facility-detail__status facility-detail__status--open">
//               <i className="bi bi-check-circle-fill"></i> Ouvert maintenant · {p.openingTime}–{p.closingTime}
//             </span>
//           ) : open === false ? (
//             <span className="facility-detail__status facility-detail__status--closed">
//               <i className="bi bi-x-circle-fill"></i> Fermé · réouvre à {p.openingTime}
//             </span>
//           ) : (
//             <span className="facility-detail__status">
//               <i className="bi bi-clock"></i> Horaires non renseignés
//             </span>
//           )}
//         </div>
//       </div>

//       <hr />

//       {isThisRouteActive ? (
//         <div className="facility-detail__nav-active">
//           <div className="facility-detail__nav-summary">
//             <i className="bi bi-signpost-2-fill"></i>
//             Navigation en cours — {formatDistance(navigating.distanceMeters)} · {formatDuration(navigating.durationSeconds)}
//           </div>
//           <button className="btn-danger" onClick={onStopNavigation}>
//             <i className="bi bi-stop-circle-fill"></i> Arrêter la navigation
//           </button>
//         </div>
//       ) : (
//         <>
//           <div className="facility-detail__section-title">
//             <i className="bi bi-signpost-2"></i> Itinéraire
//           </div>
//           <div className="facility-detail__modes">
//             {MODES.map((m) => (
//               <button
//                 key={m.key}
//                 className={`mode-btn ${routePreview?.mode === m.key ? 'is-active' : ''}`}
//                 onClick={() => onPreviewMode(m.key)}
//               >
//                 <i className={`bi ${m.icon}`}></i> {m.label}
//               </button>
//             ))}
//           </div>

//           {previewLoading && <div className="facility-detail__preview-loading">Calcul de l'itinéraire…</div>}

//           {routePreview && !previewLoading && (
//             <div className="facility-detail__preview">
//               <div className="facility-detail__preview-stats">
//                 <span><i className="bi bi-arrow-left-right"></i> {formatDistance(routePreview.distanceMeters)}</span>
//                 <span><i className="bi bi-clock"></i> {formatDuration(routePreview.durationSeconds)}</span>
//               </div>
//               <p className="facility-detail__preview-hint">
//                 Vérifiez l'itinéraire tracé sur la carte, puis validez pour démarrer la navigation.
//               </p>
//               <div className="facility-detail__preview-actions">
//                 <button className="btn-secondary" onClick={onCancelPreview}>Annuler</button>
//                 <button className="btn-primary" onClick={onValidateRoute}>
//                   <i className="bi bi-check2"></i> Valider l'itinéraire
//                 </button>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// export default FacilityDetail;
import React from 'react';
import { getTypeLabel, isOpenNow } from '../utils/facilityDisplay';
import { formatDistance, formatDuration } from '../utils/geo';
import { MODE_SPEEDS_KMH } from '../utils/osrm';

const MODES = [
  { key: 'walking', label: 'À pied', icon: 'bi-person-walking' },
  { key: 'cycling', label: 'Moto', icon: 'bi-bicycle' },
  { key: 'driving', label: 'Voiture', icon: 'bi-car-front-fill' },
];

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
}) {
  const p = feature.properties;
  const open = isOpenNow(p.openingTime, p.closingTime, p.is24h);
  const isThisRouteActive = navigating && navigating.facilityId === p.id;

  return (
    <div className="facility-detail">
      <button className="facility-detail__back" onClick={onBack}>
        <i className="bi bi-arrow-left"></i> Retour
      </button>

      <h2 className="facility-detail__title">{p.name || 'Formation sanitaire'}</h2>
      <div className="facility-detail__type">{getTypeLabel(p.healthcare, p.amenity, p.name)}</div>

      <div className="facility-detail__rows">
        <div className="facility-detail__row">
          <i className="bi bi-geo-alt-fill"></i>
          <span>{[p.adm3Name, p.adm2Name, p.adm1Name].filter(Boolean).join(', ') || 'Localisation non renseignée'}</span>
        </div>
        {p.phone && (
          <div className="facility-detail__row">
            <i className="bi bi-telephone-fill"></i>
            <span>{p.phone}</span>
          </div>
        )}
        {p.services && (
          <div className="facility-detail__row">
            <i className="bi bi-capsule"></i>
            <span>{p.services}</span>
          </div>
        )}
        <div className="facility-detail__row">
          {p.is24h ? (
            <span className="facility-detail__status facility-detail__status--open">
              <i className="bi bi-check-circle-fill"></i> Ouvert 24h/24
            </span>
          ) : open === true ? (
            <span className="facility-detail__status facility-detail__status--open">
              <i className="bi bi-check-circle-fill"></i> Ouvert maintenant · {p.openingTime}–{p.closingTime}
            </span>
          ) : open === false ? (
            <span className="facility-detail__status facility-detail__status--closed">
              <i className="bi bi-x-circle-fill"></i> Fermé · réouvre à {p.openingTime}
            </span>
          ) : (
            <span className="facility-detail__status">
              <i className="bi bi-clock"></i> Horaires non renseignés
            </span>
          )}
        </div>
      </div>

      <hr />

      {isThisRouteActive ? (
        <div className="facility-detail__nav-active">
          <div className="facility-detail__nav-summary">
            <i className="bi bi-signpost-2-fill"></i>
            Navigation en cours — {formatDistance(navigating.distanceMeters)} · {formatDuration(navigating.durationSeconds)}
            {navigating.mode && ` (${MODE_SPEEDS_KMH[navigating.mode]} km/h)`}
          </div>
          <button className="btn-danger" onClick={onStopNavigation}>
            <i className="bi bi-stop-circle-fill"></i> Arrêter la navigation
          </button>
        </div>
      ) : (
        <>
          <div className="facility-detail__section-title">
            <i className="bi bi-signpost-2"></i> Itinéraire
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

          {previewLoading && <div className="facility-detail__preview-loading">Calcul de l'itinéraire…</div>}

          {routePreview && !previewLoading && (
            <div className="facility-detail__preview">
              <div className="facility-detail__preview-stats">
                <span><i className="bi bi-arrow-left-right"></i> {formatDistance(routePreview.distanceMeters)}</span>
                <span><i className="bi bi-clock"></i> {formatDuration(routePreview.durationSeconds)}</span>
              </div>
              <p className="facility-detail__preview-speed">
                Estimation basée sur une vitesse moyenne de {MODE_SPEEDS_KMH[routePreview.mode]} km/h
                {routePreview.mode === 'cycling' ? ' (moto)' : routePreview.mode === 'driving' ? ' (voiture)' : ' (à pied)'}.
              </p>
              <p className="facility-detail__preview-hint">
                Vérifiez l'itinéraire tracé sur la carte, puis validez pour démarrer la navigation.
              </p>
              <div className="facility-detail__preview-actions">
                <button className="btn-secondary" onClick={onCancelPreview}>Annuler</button>
                <button className="btn-primary" onClick={onValidateRoute}>
                  <i className="bi bi-check2"></i> Valider l'itinéraire
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FacilityDetail;