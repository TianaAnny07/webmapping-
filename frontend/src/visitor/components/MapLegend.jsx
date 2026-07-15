import React, { useState } from 'react';

const ITEMS = [
  { color: '#c0392b', icon: 'bi-hospital-fill', label: 'CHU / CHR / CHD' },
  { color: '#e74c3c', icon: 'bi-hospital-fill', label: 'Hôpital' },
  { color: '#2980b9', icon: 'bi-person-fill-cross', label: 'CSB II / Médecin' },
  { color: '#5dade2', icon: 'bi-person-fill-cross', label: 'CSB I' },
  { color: '#27ae60', icon: 'bi-capsule', label: 'Pharmacie' },
  { color: '#8e44ad', icon: 'bi-building-fill-cross', label: 'Clinique' },
  { color: '#e91e8c', icon: 'bi-gender-female', label: 'Maternité' },
  { color: '#7f8c8d', icon: 'bi-plus-circle-fill', label: 'Autre formation sanitaire' },
];

function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`map-legend ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="map-legend__list">
          {ITEMS.map((item) => (
            <div className="map-legend__row" key={item.label}>
              <span className="map-legend__dot" style={{ background: item.color }}>
                <i className={`bi ${item.icon}`}></i>
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      <button className="map-legend__toggle" onClick={() => setOpen((v) => !v)}>
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-list-ul'}`}></i>
        {!open && <span>Légende</span>}
      </button>
    </div>
  );
}

export default MapLegend;