import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* 🔧 Fix default Leaflet icons */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* 🚛 SINGLE truck icon instance */
const truckIcon = new L.Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MarkerItem {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
}

interface MapViewProps {
  center: [number, number];
  zoom: number;
  markers: MarkerItem[];
  collectorLocation?: { lat: number; lng: number };
  taskLocations?: { lat: number; lng: number }[];
  userLocation?: { lat: number; lng: number };
}

/* 🔹 Recenter ONLY ONCE (StrictMode safe) */
const RecenterOnce: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!hasCentered.current) {
      map.setView(position);
      hasCentered.current = true;
    }
  }, [map, position]);

  return null;
};

const MapView: React.FC<MapViewProps> = ({
  center,
  zoom,
  markers,
  collectorLocation,
  taskLocations,
  userLocation,
}) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {markers.map((m) => (
        <Marker
          key={m.id}
          position={m.position}
          icon={truckIcon as L.Icon}
        >
          <Popup>
            <strong>{m.title}</strong>
            <br />
            {m.description}
          </Popup>
        </Marker>
      ))}

      {collectorLocation && (
        <Marker
          position={[collectorLocation.lat, collectorLocation.lng]}
          icon={truckIcon as L.Icon}
        >
          <Popup>Collector Location</Popup>
        </Marker>
      )}

      {taskLocations &&
        taskLocations.map((task, index) => (
          <Marker
            key={`task-${index}`}
            position={[task.lat, task.lng]}
            icon={truckIcon as L.Icon}
          >
            <Popup>Task Location</Popup>
          </Marker>
        ))}

      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={truckIcon as L.Icon}
        >
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {markers.length > 0 && (
        <RecenterOnce position={markers[0].position} />
      )}
    </MapContainer>
  );
};

export default MapView;

