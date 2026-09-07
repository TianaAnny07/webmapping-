import React from 'react';

function ZoneStatusBanner({ status }) {
  if (!status || !status.statut) return null;
  const isBonneCouverture = status.statut === 'Couvert';

  return (
    <div
      className="visitor-header__zone-status"
      title={status.message}
      style={{
        color: isBonneCouverture ? '#1e7d3c' : '#c0392b',
      }}
    >
      <i className={`bi ${isBonneCouverture ? 'bi-shield-check' : 'bi-shield-exclamation'}`}></i>
      {status.coveragePercent !== null ? `${status.coveragePercent}%` : status.statut}
    </div>
  );
}

export default ZoneStatusBanner;