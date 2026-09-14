import { useState } from 'react';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Injection unique des keyframes de pulsation (une seule fois, même si plusieurs markers)
const PULSE_STYLE_ID = 'site-icon-pulse-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(PULSE_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = PULSE_STYLE_ID;
  style.innerHTML = `
    @keyframes site-icon-pulse {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.4);
        opacity: 0.3;
      }
    }
  `;
  document.head.appendChild(style);
}

const siteIcon = new L.DivIcon({
  html: `<div style="position: relative; width: 40px; height: 40px;">
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(230, 126, 34, 0.25);
      border: 2px solid rgba(230, 126, 34, 0.4);
      animation: site-icon-pulse 1.5s ease-in-out infinite;
    "></div>
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #E67E22;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    ">
      <i class="bi bi-lightbulb-fill" style="color:white; font-size: 14px;"></i>
    </div>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const STATUT_BADGE = {
  Critique: { bg: '#fdecea', color: '#e74c3c' },
  Prioritaire: { bg: '#fef5e7', color: '#f39c12' },
};

function RecommendationLayer({ recommandations = [], onVoirDetail }) {
  const [openId, setOpenId] = useState(null);

  if (!recommandations || recommandations.length === 0) return null;

  return (
    <>
      {recommandations.map((rec) => {
        const badge = STATUT_BADGE[rec.statut] || { bg: '#f0f0f0', color: '#7f8c8d' };
        return (
          <Marker
            key={rec.id}
            position={[rec.lat, rec.lng]}
            icon={siteIcon}
            eventHandlers={{ click: () => setOpenId(rec.id) }}
          >
            {openId === rec.id && (
              <Popup minWidth={240} onClose={() => setOpenId(null)}>
                <div style={{ fontFamily: 'sans-serif', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <i className="bi bi-stars" style={{ color: '#378ADD' }}></i>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#378ADD' }}>
                      Recommandation
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      Zone {rec.statut}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>{rec.texte}</p>
                  {onVoirDetail && (
                    <button
                      onClick={() => onVoirDetail(rec)}
                      style={{
                        width: '100%', padding: '6px', cursor: 'pointer',
                        background: '#6DBE45', border: 'none', borderRadius: '4px',
                        color: 'white', fontSize: '12px',
                      }}
                    >
                      <i className="bi bi-geo-alt-fill"></i> Voir le détail
                    </button>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
}

export default RecommendationLayer;
