import React from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';

const siteIcon = new L.DivIcon({
  html: '<i class="bi bi-cone-striped" style="color:#E67E22; font-size:26px;"></i>',
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function MiniMapSite({ lat, lng }) {
  return (
    <div style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee', marginTop: '10px', marginBottom: '10px' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[lat, lng]}
          radius={5000}
          pathOptions={{ color: '#E67E22', fillColor: '#E67E22', fillOpacity: 0.1 }}
        />
        <Marker position={[lat, lng]} icon={siteIcon} />
      </MapContainer>
    </div>
  );
}

export default MiniMapSite;