import React from 'react';

function LocationConfirm({ onAccept, onCancel }) {
  return (
    <div className="location-confirm-backdrop" onClick={onCancel}>
      <div className="location-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="location-confirm__icon">
          <i className="bi bi-geo-alt-fill"></i>
        </div>
        <div className="location-confirm__text">
          <strong>Activer votre position ?</strong>
          <span>Voulez-vous activer votre position depuis cet appareil ?</span>
        </div>
        <div className="location-confirm__actions">
          <button className="btn-secondary" onClick={onCancel}>Non merci</button>
          <button className="btn-primary" onClick={onAccept}>Autoriser</button>
        </div>
      </div>
    </div>
  );
}

export default LocationConfirm;
