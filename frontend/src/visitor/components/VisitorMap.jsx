

// import React, { useEffect } from 'react';
// import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
// import MarkerClusterGroup from 'react-leaflet-cluster';
// import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
// import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import config from '../../config';
// import { getCustomIcon } from '../utils/facilityDisplay';
// import { bearingDeg, nearestRouteIndex } from '../utils/geo';
// import { travelIconSvg } from '../utils/travelIcons';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

// const userIcon = L.divIcon({
//   className: '',
//   html: `<div style="
//       width: 18px; height: 18px; border-radius: 50%;
//       background: #2563eb; border: 3px solid white;
//       box-shadow: 0 0 0 4px rgba(37,99,235,0.25);
//     "></div>`,
//   iconSize: [18, 18],
//   iconAnchor: [9, 9],
// });

// /** Icône illustrative (piéton / moto / voiture) orientée dans la direction du trajet. */
// function buildNavigatingIcon(mode, rotationDeg) {
//   const svg = travelIconSvg(mode) || travelIconSvg('driving');
//   const size = 40;
//   // On ne fait pivoter que les véhicules (moto/voiture) : un petit bonhomme
//   // qui pivoterait sur le côté aurait l'air "couché", donc il reste debout.
//   const rotation = mode === 'walking' ? 0 : rotationDeg;

//   return L.divIcon({
//     className: '',
//     html: `
//       <div style="
//         width: ${size}px; height: ${size}px;
//         display: flex; align-items: center; justify-content: center;
//         filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));
//       ">
//         <div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease; display: flex;">
//           ${svg}
//         </div>
//       </div>
//     `,
//     iconSize: [size, size],
//     iconAnchor: [size / 2, size / 2],
//   });
// }

// function FlyTo({ coords, zoom }) {
//   const map = useMap();
//   useEffect(() => {
//     if (coords) map.flyTo(coords, zoom || map.getZoom(), { duration: 1.2 });
//   }, [coords, zoom, map]);
//   return null;
// }

// function VisitorMap({ facilities, userPosition, selectedFacility, onSelectFacility, flyTo, route, highlightedIds }) {
//   let userMarkerIcon = userIcon;
//   if (route?.active && userPosition && route.geometry?.length > 1) {
//     const idx = nearestRouteIndex(userPosition[0], userPosition[1], route.geometry);
//     const nextIdx = Math.min(idx + 1, route.geometry.length - 1);
//     const [nLat, nLon] = route.geometry[nextIdx];
//     const rotation = bearingDeg(userPosition[0], userPosition[1], nLat, nLon);
//     userMarkerIcon = buildNavigatingIcon(route.mode, rotation);
//   }

//   return (
//     <MapContainer center={[-18.9249, 47.5185]} zoom={6} style={{ height: '100%', width: '100%' }}>
//       <TileLayer url={config.MAP_TILE_URL} attribution="&copy; OpenStreetMap contributors" />

//       {flyTo && <FlyTo coords={flyTo.coords} zoom={flyTo.zoom} />}

//       {userPosition && <Marker position={userPosition} icon={userMarkerIcon} />}

//       {route && route.geometry && (
//         <Polyline
//           positions={route.geometry}
//           pathOptions={{
//             color: route.active ? '#6DBE45' : '#2563eb',
//             weight: route.active ? 5 : 4,
//             dashArray: route.active ? null : '8 8',
//             opacity: 0.9,
//           }}
//         />
//       )}

//       <MarkerClusterGroup chunkedLoading maxClusterRadius={55}>
//         {facilities.map((feature) => {
//           const [lon, lat] = feature.geometry.coordinates;
//           const p = feature.properties;
//           const isSelected = selectedFacility?.properties?.id === p.id;
//           const isHighlighted = !isSelected && highlightedIds?.has(p.id);
//           const variant = isSelected ? 'selected' : isHighlighted ? 'highlighted' : 'normal';
//           return (
//             <Marker
//               key={p.id}
//               position={[lat, lon]}
//               icon={getCustomIcon(p.healthcare, p.amenity, p.name, variant)}
//               eventHandlers={{ click: () => onSelectFacility(feature) }}
//             />
//           );
//         })}
//       </MarkerClusterGroup>
//     </MapContainer>
//   );
// }

// export default VisitorMap;

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
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

// Par défaut, Leaflet ne dessine le tracé qu'un peu au-delà de l'écran
// visible ("clipPadding" ~10%). Sur un long itinéraire, zoomer fait donc
// disparaître le bout du tracé hors champ tant qu'on n'a pas pané dessus.
// On agrandit largement cette marge pour que le chemin reste bien tracé
// même en zoomant fort.
const routeRenderer = L.svg({ padding: 4 });

function FlyTo({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom || map.getZoom(), { duration: 1.2 });
  }, [coords, zoom, map]);
  return null;
}

function VisitorMap({ facilities, userPosition, selectedFacility, onSelectFacility, flyTo, route, highlightedIds }) {
  let userMarkerIcon = userIcon;
  if (route?.active && userPosition && route.geometry?.length > 1) {
    const idx = nearestRouteIndex(userPosition[0], userPosition[1], route.geometry);
    const nextIdx = Math.min(idx + 1, route.geometry.length - 1);
    const [nLat, nLon] = route.geometry[nextIdx];
    const rotation = bearingDeg(userPosition[0], userPosition[1], nLat, nLon);
    userMarkerIcon = buildNavigatingIcon(route.mode, rotation);
  }

  return (
    <MapContainer center={[-18.9249, 47.5185]} zoom={6} style={{ height: '100%', width: '100%' }} renderer={routeRenderer}>
      <TileLayer url={config.MAP_TILE_URL} attribution="&copy; OpenStreetMap contributors" />

      {flyTo && <FlyTo coords={flyTo.coords} zoom={flyTo.zoom} />}

      {userPosition && <Marker position={userPosition} icon={userMarkerIcon} />}

      {route && route.geometry && (
        <>
          {/* Contour blanc en dessous : le tracé reste net et lisible sur n'importe quel fond de carte */}
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
  );
}

export default VisitorMap;