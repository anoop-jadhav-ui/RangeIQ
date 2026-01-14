"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Coordinate } from "@/types/route";

// Fix for default marker icons in Next.js
const defaultIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    width: 24px;
    height: 24px;
    background: #007AFF;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const originIcon = L.divIcon({
  className: "custom-marker origin",
  html: `<div style="
    width: 24px;
    height: 24px;
    background: #34C759;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destinationIcon = L.divIcon({
  className: "custom-marker destination",
  html: `<div style="
    width: 24px;
    height: 24px;
    background: #FF3B30;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface RouteMapProps {
  origin?: Coordinate | null;
  destination?: Coordinate | null;
  waypoints?: Coordinate[];
  polyline?: Coordinate[];
  height?: number;
  interactive?: boolean;
  onMapClick?: (coord: Coordinate) => void;
}

export default function RouteMap({
  origin,
  destination,
  waypoints = [],
  polyline,
  height = 300,
  interactive = false,
  onMapClick,
}: RouteMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="bg-ios-gray-6 dark:bg-background-dark-tertiary rounded-ios-md animate-pulse"
      />
    );
  }

  // Calculate map bounds
  const allPoints = [origin, destination, ...waypoints].filter(
    (p): p is Coordinate => p !== null && p !== undefined
  );

  // Default center (Pune, Maharashtra)
  const defaultCenter: [number, number] = [18.5204, 73.8567];

  let center: [number, number] = defaultCenter;
  let zoom = 12;

  if (allPoints.length === 1) {
    center = [allPoints[0].lat, allPoints[0].lng];
    zoom = 14;
  } else if (allPoints.length >= 2) {
    // Calculate center of all points
    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    center = [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];

    // Calculate zoom based on bounds
    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lngDiff = Math.max(...lngs) - Math.min(...lngs);
    const maxDiff = Math.max(latDiff, lngDiff);

    if (maxDiff > 2) zoom = 8;
    else if (maxDiff > 1) zoom = 9;
    else if (maxDiff > 0.5) zoom = 10;
    else if (maxDiff > 0.2) zoom = 11;
    else if (maxDiff > 0.1) zoom = 12;
    else zoom = 13;
  }

  // Create polyline coordinates
  const routeLine: [number, number][] = polyline
    ? polyline.map((p) => [p.lat, p.lng])
    : origin && destination
    ? [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ]
    : [];

  return (
    <div style={{ height }} className="rounded-ios-md overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route line */}
        {routeLine.length >= 2 && (
          <Polyline
            positions={routeLine}
            color="#007AFF"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Origin marker */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>Starting Point</Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destinationIcon}
          >
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* Waypoint markers */}
        {waypoints.map((wp, index) => (
          <Marker key={index} position={[wp.lat, wp.lng]} icon={defaultIcon}>
            <Popup>Waypoint {index + 1}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
