import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import config from '../../config';
import { getCustomIcon } from '../utils/facilityDisplay';
import { bearingDeg, nearestRouteIndex } from '../utils/geo';
import { travelIconSvg } from '../utils/travelIcons';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="
      width: 18px; height: 18px; border-radius: 50%;
      background: #2563eb; border: 3px solid white;
      box-shadow: 0 0 0 4px rgba(37,99,235,0.25);
    "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Icônes des points A / B utilisés pour la mesure de distance manuelle
 * (aucun rapport avec la position GPS de l'utilisateur). */
function buildMeasurePointIcon(label, color) {
  return L.divIcon({
    className: '',
    html: `<div style="
        width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
        background: ${color}; border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white; font-weight: 700; font-size: 12px; font-family: sans-serif;
        ">${label}</span>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}
const pointAIcon = buildMeasurePointIcon('A', '#f59e0b');
const pointBIcon = buildMeasurePointIcon('B', '#8b5cf6');

/** Icône illustrative (piéton / moto / voiture) orientée dans la direction du trajet. */
function buildNavigatingIcon(mode, rotationDeg) {
  const svg = travelIconSvg(mode) || travelIconSvg('driving');
  const size = 40;
  const rotation = mode === 'walking' ? 0 : rotationDeg;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));
      ">
        <div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease; display: flex;">
          ${svg}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const routeRenderer = L.svg({ padding: 4 });

function FlyTo({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom || map.getZoom(), { duration: 1.2 });
  }, [coords, zoom, map]);
  return null;
}

function FollowUser({ position, active }) {
  const map = useMap();
  useEffect(() => {
    if (active && position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, active]);
  return null;
}

function MeasureClickCapture({ active, onMapClick }) {
  useMapEvents({
    click(e) {
      if (active) onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/** Récupère l'instance Leaflet et la remonte au parent — fonctionne avec
 * toutes les versions de react-leaflet (useMap() est stable partout,
 * contrairement à whenCreated qui a disparu en v4). */
function MapInstanceSetter({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function VisitorMap({
  facilities,
  userPosition,
  selectedFacility,
  onSelectFacility,
  flyTo,
  route,
  highlightedIds,
  measureActive,
  onMeasureClick,
  measurePointA,
  measurePointB,
  userHeading,
  followHeading = true,
  onRequestLocation,
}) {
  let userMarkerIcon = userIcon;
  if (route?.active && userPosition && route.geometry?.length > 1) {
    const idx = nearestRouteIndex(userPosition[0], userPosition[1], route.geometry);
    const nextIdx = Math.min(idx + 1, route.geometry.length - 1);
    const [nLat, nLon] = route.geometry[nextIdx];
    const rotation = bearingDeg(userPosition[0], userPosition[1], nLat, nLon);
    userMarkerIcon = buildNavigatingIcon(route.mode, rotation);
  }

  const isRotating = !!(route?.active && followHeading && typeof userHeading === 'number');
  const mapRotationDeg = isRotating ? -userHeading : 0;

  const [mapInstance, setMapInstance] = useState(null);

  const handleLocateClick = () => {
    if (!mapInstance) return;
    if (userPosition) {
      mapInstance.flyTo(userPosition, Math.max(mapInstance.getZoom(), 15), { duration: 1 });
    } else {
      onRequestLocation?.();
    }
  };

  return (
    <div
      className="visitor-map-viewport"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div
        className="visitor-map-rotate-wrap"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '160%',
          height: '160%',
          transformOrigin: 'center center',
          transition: 'transform 0.35s ease-out',
          transform: `translate(-50%, -50%) rotate(${mapRotationDeg}deg)`,
        }}
      >
        <MapContainer
          center={[-18.9249, 47.5185]}
          zoom={6}
          style={{ height: '100%', width: '100%', cursor: measureActive ? 'crosshair' : '' }}
          renderer={routeRenderer}
          zoomControl={false}
        >
          <MapInstanceSetter onReady={setMapInstance} />

          <TileLayer url={config.MAP_TILE_URL} attribution="&copy; OpenStreetMap contributors" />

          {flyTo && <FlyTo coords={flyTo.coords} zoom={flyTo.zoom} />}

          <FollowUser position={userPosition} active={!!route?.active} />

          <MeasureClickCapture active={measureActive} onMapClick={onMeasureClick} />

          {userPosition && <Marker position={userPosition} icon={userMarkerIcon} />}

          {route && route.geometry && (
            <>
              <Polyline
                positions={route.geometry}
                pathOptions={{
                  color: '#ffffff',
                  weight: (route.active ? 5 : 4) + 4,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={route.geometry}
                pathOptions={{
                  color: route.active ? '#6DBE45' : '#2563eb',
                  weight: route.active ? 5 : 4,
                  dashArray: route.active ? null : '8 8',
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {measurePointA && measurePointB && (
            <Polyline
              positions={[measurePointA, measurePointB]}
              pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '4 8', opacity: 0.9 }}
            />
          )}
          {measurePointA && <Marker position={measurePointA} icon={pointAIcon} />}
          {measurePointB && <Marker position={measurePointB} icon={pointBIcon} />}

          <MarkerClusterGroup chunkedLoading maxClusterRadius={55}>
            {facilities.map((feature) => {
              const [lon, lat] = feature.geometry.coordinates;
              const p = feature.properties;
              const isSelected = selectedFacility?.properties?.id === p.id;
              const isHighlighted = !isSelected && highlightedIds?.has(p.id);
              const variant = isSelected ? 'selected' : isHighlighted ? 'highlighted' : 'normal';
              return (
                <Marker
                  key={p.id}
                  position={[lat, lon]}
                  icon={getCustomIcon(p.healthcare, p.amenity, p.name, variant)}
                  eventHandlers={{ click: () => onSelectFacility(feature) }}
                />
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Contrôles hors du wrapper tournant, pour rester toujours visibles
         même quand la carte pivote (voir followHeading) */}
      <div className="visitor-map-controls">
        <div className="visitor-map-zoom-group">
          <button
            className="visitor-map-zoom-btn"
            onClick={() => mapInstance?.zoomIn()}
            title="Zoomer"
          >
            +
          </button>
          <button
            className="visitor-map-zoom-btn"
            onClick={() => mapInstance?.zoomOut()}
            title="Dézoomer"
          >
            −
          </button>
        </div>
        <button className="visitor-map-locate-btn" onClick={handleLocateClick} title="Centrer sur ma position">
          <i className="bi bi-crosshair"></i>
        </button>
      </div>
    </div>
  );
}

export default VisitorMap;