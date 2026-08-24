
import React from 'react';
import { getTypeLabel, typeColor } from '../utils/facilityDisplay';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './facility-panel.css';

function FacilityDetailPanel({ feature, onClose, onRoute }) {
  const p = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;
  const typeLabel = getTypeLabel(p.healthcare, p.amenity, p.name);
  const accent = typeColor(p.healthcare, p.amenity, p.name);
  const open = p.is24h ? true : p.openingTime && p.closingTime ? null : null;

  const services = (p.services || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const stocks = Array.isArray(p.stocks) ? p.stocks : [];

  const handleRoute = (mode) => {
    if (onRoute) onRoute(lat, lon, mode);
  };

  const handleContact = () => {
    if (p.phone) window.open(`tel:${p.phone}`, '_self');
  };

  return (
    <div className="facility-panel--inline">
      {/* Banner avec la photo */}
      <div className="facility-panel--inline__hero" style={{ background: accent }}>
        {p.photoUrl ? (
          <img
            src={p.photoUrl}
            alt={p.name || 'Établissement'}
            className="facility-panel--inline__hero-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="facility-panel--inline__hero-placeholder">
            <i className="bi bi-hospital" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.6)' }}></i>
          </div>
        )}
        <div className="facility-panel--inline__hero-overlay">
          <span className="facility-panel--inline__badge">{typeLabel}</span>
        </div>
      </div>

      <div className="facility-panel--inline__body">
        <h3 className="facility-panel--inline__name">{p.name || 'Formation sanitaire'}</h3>
        <div className="facility-panel--inline__location">
          <i className="bi bi-geo-alt-fill"></i>
          {[p.adm3Name, p.adm2Name, p.adm1Name].filter(Boolean).join(' · ')}
        </div>

        {/* Actions */}
        <div className="facility-panel--inline__actions">
          <button className="facility-panel--inline__btn facility-panel--inline__btn--primary" onClick={() => handleRoute('driving')}>
            <i className="bi bi-car-front-fill"></i> Itinéraire
          </button>
          <button
            className={`facility-panel--inline__btn facility-panel--inline__btn--secondary ${p.phone ? '' : 'facility-panel--inline__btn--disabled'}`}
            onClick={handleContact}
            disabled={!p.phone}
          >
            <i className="bi bi-telephone-fill"></i> Contacter
          </button>
        </div>

        {/* Horaires */}
        <div className="facility-panel--inline__card">
          <div className="facility-panel--inline__card-title">
            <i className="bi bi-clock-fill"></i> Horaires
          </div>
          <div className="facility-panel--inline__card-body">
            {p.is24h ? (
              <span className="facility-panel--inline__status facility-panel--inline__status--open">
                <i className="bi bi-check-circle-fill"></i> Ouvert 24h/24
              </span>
            ) : (
              <>
                {open === true && (
                  <span className="facility-panel--inline__status facility-panel--inline__status--open">
                    <i className="bi bi-check-circle-fill"></i> Ouvert maintenant
                  </span>
                )}
                {open === false && (
                  <span className="facility-panel--inline__status facility-panel--inline__status--closed">
                    <i className="bi bi-x-circle-fill"></i> Fermé maintenant
                  </span>
                )}
                {open === null && (
                  <span className="facility-panel--inline__status facility-panel--inline__status--unknown">
                    <i className="bi bi-clock"></i> Horaires non renseignés
                  </span>
                )}
                <div className="facility-panel--inline__hours">
                  {p.openingTime || '--'} - {p.closingTime || '--'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Capacité */}
        {p.bedsCount !== undefined && p.occupancyRate !== undefined && (
          <div className="facility-panel--inline__card">
            <div className="facility-panel--inline__card-title">
              <i className="bi bi-hospital"></i> Capacité
            </div>
            <div className="facility-panel--inline__capacity">
              <div>
                <div className="facility-panel--inline__big-number">{p.bedsCount}</div>
                <div className="facility-panel--inline__label">lits</div>
              </div>
              <div>
                <div className="facility-panel--inline__big-number">{p.occupancyRate}%</div>
                <div className="facility-panel--inline__label">taux d'occupation</div>
              </div>
            </div>
          </div>
        )}

        {/* Spécialités */}
        {services.length > 0 && (
          <div className="facility-panel--inline__section">
            <div className="facility-panel--inline__section-title">Spécialités disponibles</div>
            <div className="facility-panel--inline__tags">
              {services.map((s, i) => (
                <span key={i} className="facility-panel--inline__tag">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Stocks */}
        {stocks.length > 0 && (
          <div className="facility-panel--inline__section">
            <div className="facility-panel--inline__section-title">Stocks essentiels ({stocks.length})</div>
            <div className="facility-panel--inline__stocks">
              {stocks.map((item, i) => {
                const status = (item.status || '').toLowerCase();
                const dotClass =
                  status === 'ok' || status === 'en stock' || status === 'disponible'
                    ? 'facility-panel--inline__dot--green'
                    : status === 'low' || status === 'faible' || status === 'attention'
                      ? 'facility-panel--inline__dot--orange'
                      : 'facility-panel--inline__dot--red';

                return (
                  <div key={i} className="facility-panel--inline__stock">
                    <span className={`facility-panel--inline__dot ${dotClass}`}></span>
                    <span>{item.name || `Produit ${i + 1}`}</span>
                    <span className="facility-panel--inline__stock-status">{(item.status || '').toString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FacilityDetailPanel;