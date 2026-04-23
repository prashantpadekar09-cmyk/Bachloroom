import React, { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createCustomIcon = (isSelected: boolean) =>
  L.divIcon({
    html: renderToStaticMarkup(
      <div className="custom-marker">
        <div className={`marker-pin ${isSelected ? "scale-110 ring-4 ring-amber-500/30" : ""}`}>
          <div className="h-2 w-2 rounded-full bg-slate-900" />
        </div>
        <div className="marker-pulse" />
      </div>,
    ),
    className: "custom-div-icon",
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });

const UserLocationIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg ring-4 ring-blue-500/30">
      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
    </div>,
  ),
  className: "user-location-icon",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  rooms: any[];
  selectedRoomId: string | null;
  onRoomClick: (roomId: string) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  userLocation: [number, number] | null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
}

function BoundsHandler({ onBoundsChange }: { onBoundsChange?: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange?.(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange?.(map.getBounds());
    },
  });

  return null;
}

export default function MapComponent({
  center,
  zoom,
  rooms,
  selectedRoomId,
  onRoomClick,
  onBoundsChange,
  userLocation,
}: MapComponentProps) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater center={center} zoom={zoom} />
      <BoundsHandler onBoundsChange={onBoundsChange} />

      {userLocation && (
        <Marker position={userLocation} icon={UserLocationIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {rooms.map((room) => {
        if (room.lat == null || room.lng == null) return null;

        return (
          <Marker
            key={room.id}
            position={[room.lat, room.lng]}
            icon={createCustomIcon(room.id === selectedRoomId)}
            eventHandlers={{ click: () => onRoomClick(room.id) }}
          >
            <Popup offset={[0, -20]}>
              <div className="p-1">
                <p className="font-bold text-slate-900">{room.title}</p>
                <p className="text-sm text-slate-600">
                  {"\u20B9"}
                  {room.price.toLocaleString()}/{room.billingPeriod}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
