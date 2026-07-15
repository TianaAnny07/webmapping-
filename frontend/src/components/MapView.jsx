


// import { useEffect, useState } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// import L from 'leaflet';
// import axios from 'axios';
// import 'leaflet/dist/leaflet.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';
// import Routing from './Routing';
// import config from '../config';

// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

// function getTypeLabel(healthcare, amenity, name) {
//   const nomUpper = (name || '').toUpperCase();
//   if (nomUpper.includes('CHU')) return 'Centre Hospitalier Universitaire';
//   if (nomUpper.includes('CHR')) return 'Centre Hospitalier Régional';
//   if (nomUpper.includes('CHP')) return 'Centre Hospitalier de District';
//   if (nomUpper.includes('CSB II') || nomUpper.includes('CSB 2')) return 'Centre de Santé de Base II';
//   if (nomUpper.includes('CSB I') || nomUpper.includes('CSB 1')) return 'Centre de Santé de Base I';

//   const type = healthcare || amenity || '';
//   const labels = {
//     'hospital': 'Hôpital',
//     'doctor': 'Centre de Santé de Base',
//     'doctors': 'Centre de Santé de Base',
//     'nurse': 'Poste de santé',
//     'pharmacy': 'Pharmacie',
//     'clinic': 'Clinique',
//     'dentist': 'Cabinet dentaire',
//     'birthing_centre': 'Maternité',
//     'midwife': 'Maternité',
//     'community_health_worker': 'Agent de santé communautaire',
//     'laboratory': "Laboratoire d'analyses",
//     'alternative': 'Médecine alternative',
//     'counselling': 'Centre de conseil',
//     'blood_bank': 'Banque de sang',
//     'optometrist': 'Opticien',
//     'paediatrics': 'Pédiatrie',
//     'centre': 'Centre de santé',
//     'yes': 'Formation sanitaire',
//     'health_post': 'Poste de santé',
//   };
//   return labels[type] || 'Formation sanitaire';
// }

// function getCustomIcon(healthcare, amenity, name) {
//   const nomUpper = (name || '').toUpperCase();
//   const type = healthcare || amenity || '';

//   let color = '#7f8c8d';
//   let icon = 'bi-plus-circle-fill';

//   if (nomUpper.includes('CHU') || nomUpper.includes('CHR') || nomUpper.includes('CHP')) {
//     color = '#c0392b';
//     icon = 'bi-hospital-fill';
//   } else if (type === 'hospital') {
//     color = '#e74c3c';
//     icon = 'bi-hospital-fill';
//   } else if (nomUpper.includes('CSB II') || nomUpper.includes('CSB 2')) {
//     color = '#2980b9';
//     icon = 'bi-person-fill-cross';
//   } else if (nomUpper.includes('CSB I') || nomUpper.includes('CSB 1')) {
//     color = '#5dade2';
//     icon = 'bi-person-fill-cross';
//   } else if (type === 'pharmacy') {
//     color = '#27ae60';
//     icon = 'bi-capsule';
//   } else if (type === 'doctor' || type === 'doctors') {
//     color = '#2980b9';
//     icon = 'bi-person-fill-cross';
//   } else if (type === 'clinic') {
//     color = '#8e44ad';
//     icon = 'bi-building-fill-cross';
//   } else if (type === 'nurse') {
//     color = '#16a085';
//     icon = 'bi-heart-pulse-fill';
//   } else if (type === 'dentist') {
//     color = '#f39c12';
//     icon = 'bi-emoji-smile-fill';
//   } else if (type === 'birthing_centre' || type === 'midwife') {
//     color = '#e91e8c';
//     icon = 'bi-gender-female';
//   }

//   return L.divIcon({
//     className: '',
//     html: `
//       <div style="
//         background: ${color};
//         width: 28px;
//         height: 28px;
//         border-radius: 50% 50% 50% 0;
//         transform: rotate(-45deg);
//         border: 2px solid white;
//         box-shadow: 0 2px 5px rgba(0,0,0,0.3);
//         display: flex;
//         align-items: center;
//         justify-content: center;
//       ">
//         <i class="bi ${icon}" style="
//           transform: rotate(45deg);
//           color: white;
//           font-size: 13px;
//         "></i>
//       </div>
//     `,
//     iconSize: [28, 28],
//     iconAnchor: [14, 28],
//     popupAnchor: [0, -30],
//   });
// }

// function FlyToLocation({ coords, zoom }) {
//   const map = useMap();
//   useEffect(() => {
//     if (coords) map.flyTo(coords, zoom || 10, { duration: 1.5 });
//   }, [coords, zoom, map]);
//   return null;
// }

// function isOpenNow(openingTime, closingTime, is24h) {
//   if (is24h) return true;
//   if (!openingTime || !closingTime) return null;
//   const now = new Date();
//   const [openH, openM] = openingTime.split(':').map(Number);
//   const [closeH, closeM] = closingTime.split(':').map(Number);
//   const currentMinutes = now.getHours() * 60 + now.getMinutes();
//   const openMinutes = openH * 60 + openM;
//   const closeMinutes = closeH * 60 + closeM;
//   return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
// }

// function MapView({ flyTo }) {
//   const [facilities, setFacilities] = useState([]);
//   const [userPosition, setUserPosition] = useState(null);
//   const [destination, setDestination] = useState(null);
//   const [routeMode, setRouteMode] = useState('driving');

//   useEffect(() => {
//     axios.get(`${config.API_URL}/facilities/geojson`)
//       .then((res) => setFacilities(res.data.features || []))
//       .catch((err) => {
//         console.error('Erreur chargement données:', err);
//         setFacilities([]);
//       });

//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
//         (err) => console.error('Géolocalisation non disponible:', err)
//       );
//     }
//   }, []);

//   const handleItineraire = (lat, lon, mode) => {
//     setRouteMode(mode);
//     setDestination([lat, lon]);
//   };

//   return (
//     <MapContainer
//       center={[-18.9249, 47.5185]}
//       zoom={6}
//       style={{ height: '100vh', width: '100%' }}
//     >
//       <TileLayer
//         url={config.MAP_TILE_URL}
//         attribution='&copy; OpenStreetMap contributors'
//       />

//       {userPosition && destination && (
//         <Routing
//           userPosition={userPosition}
//           destination={destination}
//           mode={routeMode}
//         />
//       )}

//       {flyTo && <FlyToLocation coords={flyTo.coords} zoom={flyTo.zoom} />}

//       {/* Légende */}
//       <div style={{
//         position: 'absolute', bottom: '30px', right: '10px',
//         zIndex: 1000, background: 'white', padding: '10px',
//         borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
//         fontSize: '12px'
//       }}>
//         <b>Légende</b>
//         <div><span style={{ color: '#c0392b' }}>●</span> CHU / CHR</div>
//         <div><span style={{ color: '#e74c3c' }}>●</span> Hôpital</div>
//         <div><span style={{ color: '#2980b9' }}>●</span> CSB II</div>
//         <div><span style={{ color: '#5dade2' }}>●</span> CSB I</div>
//         <div><span style={{ color: '#27ae60' }}>●</span> Pharmacie</div>
//         <div><span style={{ color: '#8e44ad' }}>●</span> Clinique</div>
//         <div><span style={{ color: '#16a085' }}>●</span> Infirmier</div>
//         <div><span style={{ color: '#f39c12' }}>●</span> Dentiste</div>
//         <div><span style={{ color: '#e91e8c' }}>●</span> Maternité</div>
//         <div><span style={{ color: '#7f8c8d' }}>●</span> Autre</div>
//       </div>

//       {(facilities || []).map((feature, index) => {
//         const [lon, lat] = feature.geometry.coordinates;
//         const props = feature.properties;
//         const open = isOpenNow(props.openingTime, props.closingTime, props.is24h);
//         const customIcon = getCustomIcon(props.healthcare, props.amenity, props.name);

//         return (
//           <Marker key={index} position={[lat, lon]} icon={customIcon}>
//             <Popup minWidth={240}>
//               <div style={{ fontFamily: 'sans-serif', fontSize: '13px' }}>
//                 <b style={{ fontSize: '14px' }}>
//                   <i className="bi bi-hospital"></i> {props.name || 'Formation sanitaire'}
//                 </b>
//                 <hr style={{ margin: '6px 0' }} />

//                 <div><i className="bi bi-geo-alt-fill"></i> <b>Région :</b> {props.adm1Name || 'N/A'}</div>
//                 <div><i className="bi bi-building"></i> <b>District :</b> {props.adm2Name || 'N/A'}</div>
//                 <div><i className="bi bi-house-fill"></i> <b>Commune :</b> {props.adm3Name || 'N/A'}</div>
//                 <div><i className="bi bi-tag-fill"></i> <b>Type :</b> {getTypeLabel(props.healthcare, props.amenity, props.name)}</div>

//                 {props.phone && (
//                   <div><i className="bi bi-telephone-fill"></i> <b>Tél :</b> {props.phone}</div>
//                 )}

//                 {props.services && (
//                   <div><i className="bi bi-capsule"></i> <b>Services :</b> {props.services}</div>
//                 )}

//                 <hr style={{ margin: '6px 0' }} />

//                 <div>
//                   {props.is24h ? (
//                     <span style={{ color: 'green' }}>
//                       <i className="bi bi-check-circle-fill"></i> Ouvert 24h/24 — Tous les jours
//                     </span>
//                   ) : (
//                     <>
//                       <div>
//                         {open === true && (
//                           <span style={{ color: 'green' }}>
//                             <i className="bi bi-check-circle-fill"></i> Ouvert maintenant
//                           </span>
//                         )}
//                         {open === false && (
//                           <span style={{ color: 'red' }}>
//                             <i className="bi bi-x-circle-fill"></i> Fermé maintenant
//                           </span>
//                         )}
//                         {open === null && (
//                           <span style={{ color: 'gray' }}>
//                             <i className="bi bi-clock"></i> Horaires non renseignés
//                           </span>
//                         )}
//                       </div>
//                       <div><i className="bi bi-clock-fill"></i> {props.openingTime || 'N/A'} - {props.closingTime || 'N/A'}</div>
//                       <div><i className="bi bi-calendar3"></i> {props.openingDays || 'N/A'}</div>
//                     </>
//                   )}
//                 </div>

//                 <hr style={{ margin: '6px 0' }} />

//                 <b><i className="bi bi-signpost-2"></i> Itinéraire :</b>
//                 <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
//                   <button
//                     onClick={() => handleItineraire(lat, lon, 'walking')}
//                     style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
//                   >
//                     <i className="bi bi-person-walking"></i> Pied
//                   </button>
//                   <button
//                     onClick={() => handleItineraire(lat, lon, 'cycling')}
//                     style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
//                   >
//                     <i className="bi bi-bicycle"></i> Moto
//                   </button>
//                   <button
//                     onClick={() => handleItineraire(lat, lon, 'driving')}
//                     style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#6DBE45', border: 'none', borderRadius: '4px', color: 'white' }}
//                   >
//                     <i className="bi bi-car-front-fill"></i> Voiture
//                   </button>
//                 </div>
//               </div>
//             </Popup>
//           </Marker>
//         );
//       })}
//     </MapContainer>
//   );
// }

// export default MapView;

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Routing from './Routing';
import config from '../config';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function getTypeLabel(healthcare, amenity, name) {
  const nomUpper = (name || '').toUpperCase();
  if (nomUpper.includes('CHU')) return 'Centre Hospitalier Universitaire';
  if (nomUpper.includes('CHR')) return 'Centre Hospitalier Régional';
  if (nomUpper.includes('CHP')) return 'Centre Hospitalier de District';
  if (nomUpper.includes('CSB II') || nomUpper.includes('CSB 2')) return 'Centre de Santé de Base II';
  if (nomUpper.includes('CSB I') || nomUpper.includes('CSB 1')) return 'Centre de Santé de Base I';

  const type = healthcare || amenity || '';
  const labels = {
    'hospital': 'Hôpital',
    'doctor': 'Centre de Santé de Base',
    'doctors': 'Centre de Santé de Base',
    'nurse': 'Poste de santé',
    'pharmacy': 'Pharmacie',
    'clinic': 'Clinique',
    'dentist': 'Cabinet dentaire',
    'birthing_centre': 'Maternité',
    'midwife': 'Maternité',
    'community_health_worker': 'Agent de santé communautaire',
    'laboratory': "Laboratoire d'analyses",
    'alternative': 'Médecine alternative',
    'counselling': 'Centre de conseil',
    'blood_bank': 'Banque de sang',
    'optometrist': 'Opticien',
    'paediatrics': 'Pédiatrie',
    'centre': 'Centre de santé',
    'yes': 'Formation sanitaire',
    'health_post': 'Poste de santé',
  };
  return labels[type] || 'Formation sanitaire';
}

function getCustomIcon(healthcare, amenity, name) {
  const nomUpper = (name || '').toUpperCase();
  const type = healthcare || amenity || '';

  let color = '#7f8c8d';
  let icon = 'bi-plus-circle-fill';

  if (nomUpper.includes('CHU') || nomUpper.includes('CHR') || nomUpper.includes('CHP')) {
    color = '#c0392b';
    icon = 'bi-hospital-fill';
  } else if (type === 'hospital') {
    color = '#e74c3c';
    icon = 'bi-hospital-fill';
  } else if (nomUpper.includes('CSB II') || nomUpper.includes('CSB 2')) {
    color = '#2980b9';
    icon = 'bi-person-fill-cross';
  } else if (nomUpper.includes('CSB I') || nomUpper.includes('CSB 1')) {
    color = '#5dade2';
    icon = 'bi-person-fill-cross';
  } else if (type === 'pharmacy') {
    color = '#27ae60';
    icon = 'bi-capsule';
  } else if (type === 'doctor' || type === 'doctors') {
    color = '#2980b9';
    icon = 'bi-person-fill-cross';
  } else if (type === 'clinic') {
    color = '#8e44ad';
    icon = 'bi-building-fill-cross';
  } else if (type === 'nurse') {
    color = '#16a085';
    icon = 'bi-heart-pulse-fill';
  } else if (type === 'dentist') {
    color = '#f39c12';
    icon = 'bi-emoji-smile-fill';
  } else if (type === 'birthing_centre' || type === 'midwife') {
    color = '#e91e8c';
    icon = 'bi-gender-female';
  }

  return L.divIcon({
    className: '',
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="bi ${icon}" style="
          transform: rotate(45deg);
          color: white;
          font-size: 13px;
        "></i>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function FlyToLocation({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom || 10, { duration: 1.5 });
  }, [coords, zoom, map]);
  return null;
}

function isOpenNow(openingTime, closingTime, is24h) {
  if (is24h) return true;
  if (!openingTime || !closingTime) return null;
  const now = new Date();
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function MapView({ flyTo }) {
  const [facilities, setFacilities] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeMode, setRouteMode] = useState('driving');

  useEffect(() => {
    axios.get(`${config.API_URL}/facilities/geojson`)
      .then((res) => setFacilities(res.data.features || []))
      .catch((err) => {
        console.error('Erreur chargement données:', err);
        setFacilities([]);
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error('Géolocalisation non disponible:', err)
      );
    }
  }, []);

  const handleItineraire = (lat, lon, mode) => {
    setRouteMode(mode);
    setDestination([lat, lon]);
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

      {userPosition && destination && (
        <Routing
          userPosition={userPosition}
          destination={destination}
          mode={routeMode}
        />
      )}

      {flyTo && <FlyToLocation coords={flyTo.coords} zoom={flyTo.zoom} />}

      {/* Légende */}
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

      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
        {(facilities || []).map((feature, index) => {
        const [lon, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        const open = isOpenNow(props.openingTime, props.closingTime, props.is24h);
        const customIcon = getCustomIcon(props.healthcare, props.amenity, props.name);

        return (
          <Marker key={index} position={[lat, lon]} icon={customIcon}>
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

                {props.phone && (
                  <div><i className="bi bi-telephone-fill"></i> <b>Tél :</b> {props.phone}</div>
                )}

                {props.services && (
                  <div><i className="bi bi-capsule"></i> <b>Services :</b> {props.services}</div>
                )}

                <hr style={{ margin: '6px 0' }} />

                <div>
                  {props.is24h ? (
                    <span style={{ color: 'green' }}>
                      <i className="bi bi-check-circle-fill"></i> Ouvert 24h/24 — Tous les jours
                    </span>
                  ) : (
                    <>
                      <div>
                        {open === true && (
                          <span style={{ color: 'green' }}>
                            <i className="bi bi-check-circle-fill"></i> Ouvert maintenant
                          </span>
                        )}
                        {open === false && (
                          <span style={{ color: 'red' }}>
                            <i className="bi bi-x-circle-fill"></i> Fermé maintenant
                          </span>
                        )}
                        {open === null && (
                          <span style={{ color: 'gray' }}>
                            <i className="bi bi-clock"></i> Horaires non renseignés
                          </span>
                        )}
                      </div>
                      <div><i className="bi bi-clock-fill"></i> {props.openingTime || 'N/A'} - {props.closingTime || 'N/A'}</div>
                      <div><i className="bi bi-calendar3"></i> {props.openingDays || 'N/A'}</div>
                    </>
                  )}
                </div>

                <hr style={{ margin: '6px 0' }} />

                <b><i className="bi bi-signpost-2"></i> Itinéraire :</b>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleItineraire(lat, lon, 'walking')}
                    style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <i className="bi bi-person-walking"></i> Pied
                  </button>
                  <button
                    onClick={() => handleItineraire(lat, lon, 'cycling')}
                    style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    <i className="bi bi-bicycle"></i> Moto
                  </button>
                  <button
                    onClick={() => handleItineraire(lat, lon, 'driving')}
                    style={{ flex: 1, padding: '4px', cursor: 'pointer', background: '#6DBE45', border: 'none', borderRadius: '4px', color: 'white' }}
                  >
                    <i className="bi bi-car-front-fill"></i> Voiture
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

export default MapView;