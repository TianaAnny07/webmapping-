import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Routing from './Routing';
import RecommendationLayer from './RecommendationLayer'; // nouveau
import config from '../config';
import api from '../services/api';
import { getTypeLabel, getCustomIcon, isOpenNow } from '../utils/facilityDisplay';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// ===== Coloration des régions par statut de couverture =====
const STATUT_COLORS = {
  Critique: '#e74c3c',
  Prioritaire: '#f39c12',
  Couvert: '#6DBE45',
};
const STATUT_DEFAULT_COLOR = '#7f8c8d';
const MIN_ZOOM_TO_SHOW_COVERAGE = 7; // en dessous de ce niveau, pas de couleur affichée

function FlyToLocation({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom || 10, { duration: 1.5 });
  }, [coords, zoom, map]);
  return null;
}

// Suit le niveau de zoom actuel de la carte pour conditionner l'affichage
// de la coloration des régions.
function ZoomWatcher({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  });
  return null;
}

function MapView({
  flyTo,
  onSelectFacility,
  onSelectRegion,
  onRoute,
  destination: extDestination,
  routeMode: extRouteMode,
  recommandations = [],          // nouveau : sites recommandés (K-Means) pour la région active
  onVoirDetailRecommandation,    // nouveau : callback "Voir le détail" du popup IA
}) {
  const [facilities, setFacilities] = useState([]);
  const [regionsGeoJson, setRegionsGeoJson] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(6);
  const [userPosition, setUserPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeMode, setRouteMode] = useState('driving');

  const effectiveDestination = extDestination !== undefined ? extDestination : destination;
  const effectiveRouteMode = extRouteMode !== undefined ? extRouteMode : routeMode;

  useEffect(() => {
    axios.get(`${config.API_URL}/facilities/geojson`)
      .then((res) => setFacilities(res.data.features || []))
      .catch((err) => {
        console.error('Erreur chargement données:', err);
        setFacilities([]);
      });

    // Polygones de région + statut de couverture, pour la coloration.
    // Utilise le client "api" (avec token JWT auto-attaché) car cette route
    // est protégée côté backend — axios brut n'envoyait pas le token → 401.
    api.get('/zones/classement/regions/geojson')
      .then((res) => setRegionsGeoJson(res.data))
      .catch((err) => {
        console.error('Erreur chargement polygones régions:', err);
        setRegionsGeoJson(null);
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error('Géolocalisation non disponible:', err)
      );
    }
  }, []);

  const handleItineraire = (lat, lon, mode) => {
    if (onRoute) {
      onRoute(lat, lon, mode);
    } else {
      setRouteMode(mode);
      setDestination([lat, lon]);
    }
  };

  // Détecter les clics sur la carte pour les régions
  // ===== INCHANGÉ : c'est ta logique existante, je n'y touche pas =====
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        if (onSelectRegion && facilities.length > 0) {
          const clickedRegion = findRegionAtPoint(lat, lng, facilities);
          if (clickedRegion) {
            onSelectRegion(clickedRegion);
          }
        }
      },
    });
    return null;
  }

  const findRegionAtPoint = (lat, lng, facilities) => {
    const regionMap = {};
    facilities.forEach(f => {
      const region = f.properties.adm1Name;
      if (region && !regionMap[region]) {
        regionMap[region] = [];
      }
      if (region) {
        regionMap[region].push(f);
      }
    });

    let closestRegion = null;
    let maxCount = 0;
    const threshold = 0.5;

    Object.entries(regionMap).forEach(([region, regionFacilities]) => {
      const count = regionFacilities.filter(f => {
        const [flng, flat] = f.geometry.coordinates;
        return Math.abs(flat - lat) < threshold && Math.abs(flng - lng) < threshold;
      }).length;

      if (count > maxCount) {
        maxCount = count;
        closestRegion = region;
      }
    });

    return closestRegion ? { name: closestRegion, facilities: regionMap[closestRegion] || [] } : null;
  };

  const regionStyle = (feature) => {
    const statut = feature?.properties?.statut;
    const color = STATUT_COLORS[statut] || STATUT_DEFAULT_COLOR;
    return {
      fillColor: color,
      color,
      weight: 1.5,
      fillOpacity: 0.28,
    };
  };

  return (
    <MapContainer
      center={[-18.9249, 47.5185]}
      zoom={6}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url={config.MAP_TILE_URL}
        attribution='&copy; OpenStreetMap contributors'
      />

      <ZoomWatcher onZoomChange={setCurrentZoom} />

      {/* Calque de coloration par statut — le clic ouvre le panneau avec les
          vraies stats du polygone (backend), plus besoin du fichier
          communes_population.geojson local.
          N'apparaît qu'à partir d'un certain niveau de zoom. */}
      {regionsGeoJson && currentZoom >= MIN_ZOOM_TO_SHOW_COVERAGE && (
        <GeoJSON
          key="regions-coverage"
          data={regionsGeoJson}
          style={regionStyle}
          onEachFeature={(feature, layer) => {
            const p = feature.properties || {};
            layer.bindTooltip(`${p.region} — ${p.statut} (${p.coveragePercent}%)`, { sticky: true });
            layer.on({
              mouseover: (e) => e.target.setStyle({ fillOpacity: 0.5 }),
              mouseout: (e) => e.target.setStyle({ fillOpacity: 0.28 }),
              click: (e) => {
                // Empêche le clic de "tomber" aussi sur MapClickHandler
                // (qui utilise encore l'ancienne heuristique de proximité)
                L.DomEvent.stopPropagation(e);
                if (onSelectRegion) onSelectRegion(p);
              },
            });
          }}
        />
      )}

      <MapClickHandler />

      {userPosition && effectiveDestination && (
        <Routing
          userPosition={userPosition}
          destination={effectiveDestination}
          mode={effectiveRouteMode}
        />
      )}

      {flyTo && <FlyToLocation coords={flyTo.coords} zoom={flyTo.zoom} />}

      {/* Nouveau : sites recommandés (K-Means) pour la région active,
          avec popup "recommandation IA" au clic. Vide si aucune région
          sélectionnée ou aucune recommandation calculée. */}
      <RecommendationLayer
        recommandations={recommandations}
        onVoirDetail={onVoirDetailRecommandation}
      />

      {/* Légende établissements */}
      <div style={{
        position: 'absolute', bottom: '30px', right: '10px',
        zIndex: 1000, background: 'white', padding: '10px',
        borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: '12px'
      }}>
        <b>Légende</b>
        <div><span style={{ color: '#c0392b' }}>●</span> CHU / CHR</div>
        <div><span style={{ color: '#e74c3c' }}>●</span> Hôpital</div>
        <div><span style={{ color: '#2980b9' }}>●</span> CSB II</div>
        <div><span style={{ color: '#5dade2' }}>●</span> CSB I</div>
        <div><span style={{ color: '#27ae60' }}>●</span> Pharmacie</div>
        <div><span style={{ color: '#8e44ad' }}>●</span> Clinique</div>
        <div><span style={{ color: '#16a085' }}>●</span> Infirmier</div>
        <div><span style={{ color: '#f39c12' }}>●</span> Dentiste</div>
        <div><span style={{ color: '#e91e8c' }}>●</span> Maternité</div>
        <div><span style={{ color: '#7f8c8d' }}>●</span> Autre</div>
      </div>

      {/* Légende couverture régionale */}
      {regionsGeoJson && currentZoom >= MIN_ZOOM_TO_SHOW_COVERAGE && (
        <div style={{
          position: 'absolute', bottom: '30px', left: '10px',
          zIndex: 1000, background: 'white', padding: '10px',
          borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '12px'
        }}>
          <b>Couverture par région</b>
          <div><span style={{ color: STATUT_COLORS.Critique }}>■</span> Critique (&lt;25%)</div>
          <div><span style={{ color: STATUT_COLORS.Prioritaire }}>■</span> Prioritaire (25–49%)</div>
          <div><span style={{ color: STATUT_COLORS.Couvert }}>■</span> Couvert (≥50%)</div>
        </div>
      )}

      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
        {(facilities || []).map((feature, index) => {
        const [lon, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        const open = isOpenNow(props.openingTime, props.closingTime, props.is24h);
        const customIcon = getCustomIcon(props.healthcare, props.amenity, props.name);

        return (
          <Marker key={index} position={[lat, lon]} icon={customIcon}
            eventHandlers={onSelectFacility ? { click: () => onSelectFacility(feature) } : {}}
          >
            {!onSelectFacility && (
              <Popup minWidth={240}>
                <div style={{ fontFamily: 'sans-serif', fontSize: '13px' }}>
                  <b style={{ fontSize: '14px' }}>
                    <i className="bi bi-hospital"></i> {props.name || 'Formation sanitaire'}
                  </b>
                  <hr style={{ margin: '6px 0' }} />
                  <div><i className="bi bi-geo-alt-fill"></i> <b>Région :</b> {props.adm1Name || 'N/A'}</div>
                  <div><i className="bi bi-building"></i> <b>District :</b> {props.adm2Name || 'N/A'}</div>
                  <div><i className="bi bi-house-fill"></i> <b>Commune :</b> {props.adm3Name || 'N/A'}</div>
                  <div><i className="bi bi-tag-fill"></i> <b>Type :</b> {getTypeLabel(props.healthcare, props.amenity, props.name)}</div>
                  {props.phone && <div><i className="bi bi-telephone-fill"></i> <b>Tél :</b> {props.phone}</div>}
                  {props.services && <div><i className="bi bi-capsule"></i> <b>Services :</b> {props.services}</div>}
                  <hr style={{ margin: '6px 0' }} />
                  <div>
                    {props.is24h ? (
                      <span style={{ color: 'green' }}><i className="bi bi-check-circle-fill"></i> Ouvert 24h/24</span>
                    ) : (
                      <>
                        {open === true && <span style={{ color: 'green' }}><i className="bi bi-check-circle-fill"></i> Ouvert maintenant</span>}
                        {open === false && <span style={{ color: 'red' }}><i className="bi bi-x-circle-fill"></i> Fermé maintenant</span>}
                        {open === null && <span style={{ color: 'gray' }}><i className="bi bi-clock"></i> Horaires non renseignés</span>}
                        <div><i className="bi bi-clock-fill"></i> {props.openingTime || 'N/A'} - {props.closingTime || 'N/A'}</div>
                      </>
                    )}
                  </div>
                  <hr style={{ margin: '6px 0' }} />
                  <b><i className="bi bi-signpost-2"></i> Itinéraire :</b>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button onClick={() => handleItineraire(lat, lon, 'walking')} style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}>
                      <i className="bi bi-person-walking"></i> Pied
                    </button>
                    <button onClick={() => handleItineraire(lat, lon, 'cycling')} style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}>
                      <i className="bi bi-bicycle"></i> Moto
                    </button>
                    <button onClick={() => handleItineraire(lat, lon, 'driving')} style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#6DBE45', border: 'none', borderRadius: '4px', color: 'white' }}>
                      <i className="bi bi-car-front-fill"></i> Voiture
                    </button>
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

export default MapView;