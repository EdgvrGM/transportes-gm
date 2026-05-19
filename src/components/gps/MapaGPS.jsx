import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix de iconos de Leaflet con Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const truckIcon = (activo) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${activo ? "#EAB308" : "#888"};
      border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;">🚚</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions.length]);
  return null;
}

export default function MapaGPS({ positions = [], vinculaciones = {}, onMarkerClick }) {
  const center = positions.length > 0
    ? [positions[0].lat, positions[0].lng]
    : [19.2433, -103.7250];

  return (
    <div style={{ position: "relative", zIndex: 0, width: "100%", height: "100%" }}>
    <MapContainer
      center={center}
      zoom={8}
      style={{ width: "100%", height: "100%", borderRadius: "12px" }}
      scrollWheelZoom={true}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Calles (OSM)">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satélite">
          <TileLayer
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Oscuro">
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>

        {/* Fase futura: capas de Google Maps requieren API key */}
      </LayersControl>

      {positions.map((p) => {
        const camion = vinculaciones[p.id];
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={truckIcon(p.motor)}
            eventHandlers={{ click: () => onMarkerClick?.(p) }}
          >
            <Popup>
              <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
                <strong>{camion ? camion.nombre : p.nombre}</strong><br />
                {camion?.placas && (
                  <><span style={{ color: "#555", fontFamily: "monospace" }}>{camion.placas}</span><br /></>
                )}
                Velocidad: {p.velocidad} km/h<br />
                Estado: {p.motor ? "🟢 En movimiento" : "⚪ Detenido"}<br />
                <span style={{ color: "#888", fontSize: "11px" }}>
                  {new Date(p.ultima_actualizacion).toLocaleTimeString("es-MX")}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <FitBounds positions={positions} />
    </MapContainer>
    </div>
  );
}
