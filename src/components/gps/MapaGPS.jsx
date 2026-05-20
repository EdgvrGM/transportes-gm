import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, Polyline, useMap } from "react-leaflet";
import TooltipUnidad from "@/components/gps/TooltipUnidad";
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

const WIALON_IMG_BASE = "https://hst-api.wialon.com";

function createUnitIcon(uri, rumbo, motor, nombre) {
  const imgUrl = uri ? `${WIALON_IMG_BASE}${uri}` : null;
  const arrowColor = motor ? "#EAB308" : "#94a3b8";

  const rad = (rumbo * Math.PI) / 180;
  const dist = 20;
  const arrowX = 22 + Math.sin(rad) * dist;
  const arrowY = 22 - Math.cos(rad) * dist;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="position:relative;width:44px;height:44px;">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${imgUrl
              ? `<img src="${imgUrl}"
                  style="width:32px;height:32px;object-fit:contain;"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
                />
                <span style="display:none;font-size:20px;">🚚</span>`
              : `<span style="font-size:20px;">🚚</span>`
            }
          </div>
          <!-- Flecha orbitando — solo si está en movimiento -->
          ${motor ? `
          <div style="
            position: absolute;
            left: ${arrowX}px;
            top: ${arrowY}px;
            transform: translate(-50%, -50%) rotate(${rumbo}deg);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 13px solid #EAB308;
            filter: drop-shadow(0 0 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 2px rgba(0,0,0,0.5));
          "></div>` : ''}
        </div>
        <!-- Nombre debajo del icono -->
        <div style="
          margin-top: -8px;
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          text-shadow:
            0 1px 3px rgba(255,255,255,0.9),
            0 -1px 3px rgba(255,255,255,0.9),
            1px 0 3px rgba(255,255,255,0.9),
            -1px 0 3px rgba(255,255,255,0.9),
            0 0 6px rgba(255,255,255,0.7);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        ">${nombre}</div>
      </div>
    `,
    iconSize: [44, 60],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    const validas = positions.filter((p) => p.lat !== 0 && p.lng !== 0);
    if (validas.length > 0) {
      const bounds = L.latLngBounds(validas.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([23.6345, -102.5528], 5);
    }
  }, [positions.length]);
  return null;
}

function RastroUnidad({ historialPos }) {
  if (!historialPos || historialPos.length < 2) return null;
  return (
    <>
      {historialPos.slice(0, -1).map((punto, i) => {
        const siguiente = historialPos[i + 1];
        const opacity = (i + 1) / historialPos.length;
        return (
          <Polyline
            key={i}
            positions={[[punto.lat, punto.lng], [siguiente.lat, siguiente.lng]]}
            pathOptions={{ color: "#3b82f6", weight: 3, opacity: opacity * 0.8 }}
          />
        );
      })}
    </>
  );
}

export default function MapaGPS({ positions = [], vinculaciones = {}, onMarkerClick, historialRastro = {} }) {
  const primera = positions.find((p) => p.lat !== 0 && p.lng !== 0);
  const center  = primera ? [primera.lat, primera.lng] : [19.2433, -103.7250];

  const [tooltip, setTooltip] = useState(null);
  const closeTimerRef = useRef(null);

  const handleMarkerMouseOver = useCallback((p, e) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setTooltip({
      unidad: p,
      x: e.originalEvent.clientX,
      y: e.originalEvent.clientY,
    });
  }, []);

  const handleMarkerMouseOut = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setTooltip(null), 300);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

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
        </LayersControl>

        {positions.map((p) => (
          <RastroUnidad key={`rastro-${p.id}`} historialPos={historialRastro[p.id]} />
        ))}

        {positions.map((p) => {
          if (p.lat === 0 && p.lng === 0) return null;
          const camion = vinculaciones[p.id];
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createUnitIcon(p.uri, p.rumbo, p.motor, p.nombre)}
              eventHandlers={{
                click: () => onMarkerClick?.(p),
                mouseover: (e) => {
                  setTooltip((prev) => {
                    if (prev?.unidad?.id === p.id) return prev;
                    const point = e.containerPoint;
                    const mapContainer = e.target._map.getContainer();
                    const rect = mapContainer.getBoundingClientRect();
                    return {
                      unidad: p,
                      x: rect.left + point.x,
                      y: rect.top + point.y,
                    };
                  });
                },
                mouseout: () => {
                  setTimeout(() => setTooltip(null), 300);
                },
              }}
            >
              <Popup>
                <div style={{ fontSize: "13px", lineHeight: 1.6, minWidth: "160px" }}>
                  <strong>{camion ? camion.nombre : p.nombre}</strong>
                  {camion?.placas && (
                    <><br /><span style={{ color: "#555", fontFamily: "monospace", fontSize: "11px" }}>{camion.placas}</span></>
                  )}
                  <br />
                  Velocidad: {p.velocidad} km/h<br />
                  Rumbo: {p.rumbo}°<br />
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

      {tooltip && (
        <TooltipUnidad
          unidad={tooltip.unidad}
          onClose={() => setTooltip(null)}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            left: Math.min(tooltip.x + 16, window.innerWidth - 340),
            top:  Math.min(tooltip.y - 10, window.innerHeight - 400),
          }}
        />
      )}
    </div>
  );
}
