import React, { useEffect } from 'react';
import { Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'bootstrap-icons/font/bootstrap-icons.css';

// ===== Icône étoile du terrain proposé =====
const starIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f97316);border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.35)"><i class="bi bi-star-fill" style="color:#fff;font-size:16px"></i></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// ===== COMPLEXE DORÉ TRANSPARENT : plusieurs bâtiments, bordures or, sans fond =====
const buildIcon = L.divIcon({
  className: '',
  html: `
  <style>
    @keyframes cGold{to{stroke-dashoffset:0}}
    @keyframes cPop{to{opacity:1;transform:scale(1)}}
    @keyframes cDrop{0%{opacity:0;transform:translateY(-26px)}60%{opacity:1;transform:translateY(3px)}100%{opacity:1;transform:translateY(0)}}
    @keyframes cGone{to{opacity:0}}
    @keyframes cGlow{0%,100%{opacity:1}50%{opacity:.5}}
    @keyframes cPulse{0%{opacity:.45;transform:scale(.5)}100%{opacity:0;transform:scale(1.9)}}
    @keyframes gShine{0%,100%{filter:drop-shadow(0 0 3px rgba(245,158,11,.55))}50%{filter:drop-shadow(0 0 9px rgba(245,158,11,.95))}}
    .cw2{position:relative;width:220px;height:130px}
    .cw2 svg *{transform-box:fill-box}
    .g-house{animation:gShine 3s ease-in-out 4.2s infinite}
    .g-draw{fill:none;stroke:#f59e0b;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;
      stroke-dasharray:420;stroke-dashoffset:420;animation:cGold 1.2s ease forwards;
      filter:drop-shadow(0 0 3px rgba(245,158,11,.7))}
    .g-d0{stroke-dasharray:230;stroke-dashoffset:230;animation-delay:0s}
    .g-d1{animation-delay:.3s}.g-d2{animation-delay:.9s}.g-d3{animation-delay:1.5s}
    .g-w{opacity:0;transform:scale(.4);transform-origin:50% 50%;
      animation:cPop .35s cubic-bezier(.34,1.56,.64,1) forwards, cGlow 3.2s ease-in-out 4.4s infinite}
    .g-w1{animation-delay:2.3s}.g-w2{animation-delay:2.5s}.g-w3{animation-delay:2.7s}
    .g-w4{animation-delay:2.9s}.g-w5{animation-delay:3.1s}.g-w6{animation-delay:3.3s}
    .g-sign{opacity:0;animation:cDrop .7s cubic-bezier(.34,1.56,.64,1) 3.5s forwards}
    .g-crane{opacity:1;animation:cGone .8s ease 4.4s forwards}
    .g-ring{position:absolute;left:50%;top:88%;width:170px;height:26px;margin-left:-85px;border-radius:50%;
      background:rgba(245,158,11,.3);opacity:0;animation:cPulse 2.2s ease-out 4.6s infinite}
  </style>
  <div class="cw2">
    <div class="g-ring"></div>
    <svg width="220" height="130" viewBox="0 0 220 130">
      <g class="g-house">
        <!-- ligne de sol dorée -->
        <path class="g-draw g-d0" d="M8 122 H212"/>

        <!-- AILE GAUCHE (2 niveaux) -->
        <path class="g-draw g-d1" d="M12 122 V72 h58 v50"/>
        <path class="g-draw g-d1" d="M12 97 h58"/>
        <path class="g-draw g-d1" d="M8 72 h66"/>

        <!-- TOUR CENTRALE (3 niveaux) -->
        <path class="g-draw g-d2" d="M74 122 V32 h72 v90"/>
        <path class="g-draw g-d2" d="M74 92 h72 M74 62 h72"/>
        <path class="g-draw g-d2" d="M70 32 h80"/>

        <!-- AILE DROITE (2 niveaux) -->
        <path class="g-draw g-d3" d="M150 122 V72 h58 v50"/>
        <path class="g-draw g-d3" d="M150 97 h58"/>
        <path class="g-draw g-d3" d="M146 72 h66"/>

        <!-- fenêtres dorées (gauche) -->
        <rect class="g-w g-w1" x="20" y="79" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w2" x="44" y="79" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w3" x="20" y="103" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w4" x="44" y="103" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>

        <!-- fenêtres dorées (centre) -->
        <rect class="g-w g-w1" x="82" y="40" width="14" height="12" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w2" x="104" y="40" width="14" height="12" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w3" x="126" y="40" width="14" height="12" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w4" x="82" y="70" width="14" height="12" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w5" x="104" y="70" width="14" height="12" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w6" x="126" y="70" width="14" height="12" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>

        <!-- porte + auvent (centre) -->
        <rect class="g-w g-w5" x="102" y="104" width="16" height="18" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <path class="g-draw g-d3" d="M96 102 h28"/>

        <!-- fenêtres dorées (droite) -->
        <rect class="g-w g-w2" x="158" y="79" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w3" x="182" y="79" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w5" x="158" y="103" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>
        <rect class="g-w g-w6" x="182" y="103" width="12" height="10" rx="1.5" fill="none" stroke="#fbbf24" stroke-width="1.6"/>

        <!-- enseigne + croix rouge -->
        <g class="g-sign">
          <rect x="96" y="6" width="28" height="24" rx="2.5" fill="none" stroke="#f59e0b" stroke-width="2"/>
          <rect x="106" y="9" width="8" height="18" rx="1.5" fill="#dc2626"/>
          <rect x="101" y="14" width="18" height="8" rx="1.5" fill="#dc2626"/>
        </g>
      </g>

      <!-- grue de chantier (disparaît à la fin) -->
      <g class="g-crane">
        <rect x="196" y="26" width="3.5" height="96" fill="#f59e0b"/>
        <rect x="150" y="23" width="60" height="3.5" fill="#f59e0b"/>
        <rect x="204" y="23" width="8" height="6" fill="#d97706"/>
        <line x1="160" y1="26" x2="160" y2="46" stroke="#b45309" stroke-width="1.2"/>
        <rect x="157" y="46" width="6" height="5" fill="#b45309"/>
      </g>
    </svg>
  </div>`,
  iconSize: [220, 130],
  iconAnchor: [110, 124],
});

// Recentre la carte quand on ouvre un terrain recommandé
function FlyToReco({ reco }) {
  const map = useMap();
  useEffect(() => {
    if (reco) map.flyTo([reco.lat, reco.lng], 14, { duration: 1.2 });
  }, [reco, map]);
  return null;
}

/** À placer DANS le <MapContainer> */
export function RecoMarkers({ reco, simOpen, userPosition }) {
  if (!reco) return null;
  const pos = [reco.lat, reco.lng];
  return (
    <>
      <FlyToReco reco={reco} />
      <Circle
        center={pos}
        radius={5000}
        pathOptions={{ color: simOpen ? '#6DBE45' : '#f59e0b', weight: 2, fillOpacity: 0.08 }}
      />
      <Circle
        center={pos}
        radius={3000}
        pathOptions={{ color: simOpen ? '#6DBE45' : '#f59e0b', weight: 1, dashArray: '6 6', fillOpacity: 0.05 }}
      />
      {!simOpen && <Marker position={pos} icon={starIcon} />}
      {simOpen && <Marker position={pos} icon={buildIcon} />}
      {userPosition && simOpen && (
        <Polyline
          positions={[userPosition, pos]}
          pathOptions={{ color: '#2980b9', weight: 3, dashArray: '8 8' }}
        />
      )}
    </>
  );
}

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

/** Panneau moderne (à rendre HORS de la carte, dans VisitorApp) */
export function RecoTerrainPanel({ recos, index, simOpen, onSim, userPosition, onClose }) {
  const reco = recos?.[index];
  if (!reco) return null;

  return (
    <>
      <style>{`
        .rp-panel{
          position:absolute; top:64px; right:14px; z-index:1200; width:392px; max-height:86vh; overflow-y:auto;
          background:rgba(255,255,255,.96); backdrop-filter:blur(10px);
          border-radius:22px; box-shadow:0 12px 40px rgba(2,6,23,.25);
          font-family:'Segoe UI',system-ui,sans-serif; overflow-x:hidden;
        }
        .rp-header{
          display:flex; align-items:center; gap:12px; padding:16px 18px;
          background:linear-gradient(135deg,#6DBE45 0%,#15803d 100%);
          color:#fff; border-radius:22px 22px 0 0;
        }
        .rp-header-icon{
          width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.2);
          display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;
        }
        .rp-title{font-size:15px;font-weight:800;letter-spacing:.2px}
        .rp-sub{font-size:11px;opacity:.85;margin-top:2px}
        .rp-close{margin-left:auto;border:none;background:rgba(255,255,255,.2);color:#fff;width:30px;height:30px;border-radius:10px;cursor:pointer;font-size:13px}
        .rp-body{padding:16px 18px 18px}
        .rp-loc{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px}
        .rp-loc i{color:#f59e0b;font-size:18px;margin-top:2px}
        .rp-loc b{font-size:14px;color:#0f172a;display:block}
        .rp-loc span{font-size:12px;color:#64748b}
        .rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
        .rp-chip{
          background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;
          display:flex;align-items:center;gap:10px;
        }
        .rp-chip i{font-size:17px;width:22px;text-align:center}
        .rp-chip .v{font-size:13px;font-weight:800;color:#0f172a}
        .rp-chip .l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.4px}
        .rp-note{font-size:12px;color:#475569;background:#f1f5f9;border-radius:12px;padding:10px 12px;margin-bottom:14px;line-height:1.5}
        .rp-sim-box{border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;line-height:1.5}
        .rp-sim-box.off{background:#fffbeb;border:1px solid #fcd34d;color:#92400e}
        .rp-sim-box.on{background:#ecfdf5;border:1px solid #6DBE45;color:#166534}
        .rp-sim-btn{
          width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
          border:none;border-radius:14px;padding:13px;cursor:pointer;
          font-size:14px;font-weight:800;color:#fff;
          background:linear-gradient(135deg,#0f172a,#334155);
          box-shadow:0 6px 18px rgba(15,23,42,.3); transition:transform .15s;
        }
        .rp-sim-btn:active{transform:scale(.98)}
        .rp-sim-btn.on{background:linear-gradient(135deg,#6DBE45,#15803d)}
        .rp-sat{display:block;text-align:center;font-size:11px;color:#94a3b8;margin-top:10px;text-decoration:none}
        .rp-sat:hover{color:#64748b}
      `}</style>

      <div className="rp-panel">
        <div className="rp-header">
          <div className="rp-header-icon"><i className="bi bi-hospital-fill" /></div>
          <div>
            <div className="rp-title">Terrain proposé</div>
            <div className="rp-sub">SantéGéo MG · Recommandation d'implantation</div>
          </div>
          <button className="rp-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className="rp-body">
          <div className="rp-loc">
            <i className="bi bi-geo-alt-fill" />
            <div>
              <b>{reco.quartier || 'Localité à couvrir'}</b>
              <span>{reco.district} · {reco.region}</span>
            </div>
          </div>

          <div className="rp-grid">
            <div className="rp-chip">
              <i className="bi bi-people-fill" style={{ color: '#0ea5e9' }} />
              <div>
                <div className="v">{fmt(reco.populationRayon3km)} hab.</div>
                <div className="l">à couvrir (3 km)</div>
              </div>
            </div>
            <div className="rp-chip">
              <i className="bi bi-car-front-fill" style={{ color: '#f59e0b' }} />
              <div>
                <div className="v">{reco.distancePlusProcheKm ?? '—'} km · {reco.avgCarMin} min</div>
                <div className="l">centre actuel</div>
              </div>
            </div>
            <div className="rp-chip">
              <i className="bi bi-building-fill-check" style={{ color: '#8b5cf6' }} />
              <div>
                <div className="v">{reco.typeEtablissementRecommande}</div>
                <div className="l">type recommandé</div>
              </div>
            </div>
            <div className="rp-chip">
              <i className="bi bi-signpost-2-fill" style={{ color: '#ef4444' }} />
              <div>
                <div className="v">{reco.statut}</div>
                <div className="l">statut de la zone</div>
              </div>
            </div>
          </div>

          <div className="rp-note">
            <i className="bi bi-bullseye" style={{ color: '#6DBE45', marginRight: 6 }} />
            Cercles sur la carte : <b>vert plein</b> = zone d'impact 5 km · <b>pointillé</b> = cœur de zone 3 km.
          </div>

          <div className="rp-note">
            <i className="bi bi-houses-fill" style={{ color: '#64748b', marginRight: 6 }} />
            Communes concernées : {(reco.communesCouvertes || []).slice(0, 4).join(', ')}
            {(reco.communesCouvertes || []).length > 4 ? '…' : ''}
          </div>

          <div className={`rp-sim-box ${simOpen ? 'on' : 'off'}`}>
            {simOpen ? (
              <>
                <b><i className="bi bi-check-circle-fill" style={{ marginRight: 6 }} />Simulation active</b>
                <div style={{ marginTop: 4 }}>
                  +{fmt(reco.populationCouverte)} personnes couvertes · {reco.pourcentageCouverture}% de la
                  population non couverte de la région.
                </div>
              </>
            ) : (
              <>
                <i className="bi bi-info-circle-fill" style={{ marginRight: 6 }} />
                Cette zone est actuellement hors couverture. Lancez la simulation pour voir le bâtiment
                doré se construire et mesurer l'impact.
              </>
            )}
          </div>

          <button className={`rp-sim-btn ${simOpen ? 'on' : ''}`} onClick={onSim}>
            <i className={`bi ${simOpen ? 'bi-stop-fill' : 'bi-hammer'}`} />
            {simOpen ? 'Arrêter la simulation' : "Simuler l'ouverture du centre"}
          </button>

          <a
            className="rp-sat"
            href={`https://www.google.com/maps/@${reco.lat},${reco.lng},18z/data=!3m1!1e3`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-globe-americas" /> vue satellite
          </a>
        </div>
      </div>
    </>
  );
}
