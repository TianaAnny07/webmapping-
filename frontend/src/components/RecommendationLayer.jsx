import { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const siteIcon = new L.DivIcon({
  html: '<i class="bi bi-cone-striped" style="color:#E67E22; font-size:34px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></i>',
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