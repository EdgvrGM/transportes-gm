import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl, Polyline, CircleMarker, useMap } from "react-leaflet";
import TooltipUnidad from "@/components/gps/TooltipUnidad";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createUnitIcon } from "@/components/gps/unitIconHelper";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;
const TRIP_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

// ── Iconos de historial ───────────────────────────────────────────────────────
const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;">🚦</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const endIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#EAB308;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;">🏁</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function crearIconoParada(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:${color};box-shadow:0 2px 6px rgba(0,0,0,0.3);">P</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// ── Lógica de segmentación de viajes ─────────────────────────────────────────
function segmentarViajes(points) {
  if (points.length < 2) return { segmentos: [], paradas: [] };
  const segmentos = [], paradas = [];
  let colorIdx = 0, segActual = [points[0]], i = 1;

  while (i < points.length) {
    if (points[i].velocidad < 5) {
      const iStart = i;
      while (i < points.length && points[i].velocidad < 5) i++;
      const tStart = new Date(points[iStart].timestamp).getTime();
      const tEnd   = i < points.length
        ? new Date(points[i].timestamp).getTime()
        : new Date(points[i - 1].timestamp).getTime();
      const durSec = (tEnd - tStart) / 1000;

      if (durSec >= 180) {
        segActual.push(points[iStart]);
        if (segActual.length >= 2) {
          segmentos.push({ points: segActual, color: TRIP_COLORS[colorIdx % TRIP_COLORS.length] });
          colorIdx++;
        }
        paradas.push({
          lat:    points[iStart].lat,
          lng:    points[iStart].lng,
          durSec,
          inicio: points[iStart].timestamp,
          fin:    i < points.length ? points[i].timestamp : points[i - 1].timestamp,
          color:  TRIP_COLORS[(colorIdx - 1 + TRIP_COLORS.length) % TRIP_COLORS.length],
        });
        segActual = i < points.length ? [points[i]] : [];
        if (i < points.length) i++;
      } else {
        for (let j = iStart; j < i; j++) segActual.push(points[j]);
      }
    } else {
      segActual.push(points[i]);
      i++;
    }
  }
  if (segActual.length >= 2) {
    segmentos.push({ points: segActual, color: TRIP_COLORS[colorIdx % TRIP_COLORS.length] });
  }
  return { segmentos, paradas };
}

function formatDuracion(seg) {
  if (seg < 60) return `${Math.round(seg)}s`;
  if (seg < 3600) return `${Math.floor(seg / 60)} min`;
  return `${Math.floor(seg / 3600)}h ${Math.floor((seg % 3600) / 60)}min`;
}

// ── Componentes internos del mapa ─────────────────────────────────────────────
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

function BoundsController({ positions, histLatlngs, tabActivo }) {
  const map = useMap();

  useEffect(() => {
    if (tabActivo !== "envivo") return;
    const validas = positions.filter((p) => p.lat !== 0 && p.lng !== 0);
    if (validas.length > 0) {
      map.fitBounds(L.latLngBounds(validas.map((p) => [p.lat, p.lng])), { padding: [50, 50] });
    } else {
      map.setView([23.6345, -102.5528], 5);
    }
  }, [positions.length]);

  useEffect(() => {
    if (tabActivo !== "historial" || histLatlngs.length < 2) return;
    map.fitBounds(L.latLngBounds(histLatlngs), { padding: [40, 40] });
  }, [histLatlngs.length, tabActivo]);

  return null;
}

function EnfocarUnidad({ unidad, onEnfocado }) {
  const map = useMap();
  useEffect(() => {
    if (!unidad || (unidad.lat === 0 && unidad.lng === 0)) return;
    map.flyTo([unidad.lat, unidad.lng], 14, { animate: true, duration: 1 });
    onEnfocado();
  }, [unidad]);
  return null;
}

function SeguimientoAuto({ punto, reproduciendo }) {
  const map = useMap();
  useEffect(() => {
    if (reproduciendo && punto) {
      map.panTo([punto.lat, punto.lng], { animate: true, duration: 0.3 });
    }
  }, [punto]);
  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MapaGPS({
  positions = [],
  vinculaciones = {},
  onMarkerClick,
  historialRastro = {},
  historialPuntos = [],
  puntoReproduccion = null,
  reproduciendo = false,
  iconoUnidad = null,
  tabActivo = "envivo",
  unidadEnfocada = null,
  onEnfocado,
}) {
  const primera = positions.find((p) => p.lat !== 0 && p.lng !== 0);
  const center  = primera ? [primera.lat, primera.lng] : [19.2433, -103.7250];

  const [tooltip, setTooltip] = useState(null);
  const closeTimerRef = useRef(null);
  const hoverTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Historial: segmentación de viajes
  const { segmentos, paradas } = useMemo(() => segmentarViajes(historialPuntos), [historialPuntos]);
  const histLatlngs = useMemo(() => historialPuntos.map((p) => [p.lat, p.lng]), [historialPuntos]);
  const puntoActivo = historialPuntos[puntoReproduccion ?? -1] ?? null;

  return (
    <div style={{ position: "relative", zIndex: 0, width: "100%", height: "100%" }}>
      <MapContainer
        center={center}
        zoom={8}
        style={{ width: "100%", height: "100%", borderRadius: "0" }}
        scrollWheelZoom={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Calles (OSM)">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Oscuro">
            <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
        </LayersControl>

        <BoundsController positions={positions} histLatlngs={histLatlngs} tabActivo={tabActivo} />
        <SeguimientoAuto punto={puntoActivo} reproduciendo={reproduciendo} />
        <EnfocarUnidad unidad={unidadEnfocada} onEnfocado={onEnfocado} />

        {/* ── Capa 1: Marcadores en vivo — siempre visibles ── */}
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
                  clearTimeout(hoverTimerRef.current);
                  const point = e.containerPoint;
                  const rect  = e.target._map.getContainer().getBoundingClientRect();
                  hoverTimerRef.current = setTimeout(() => {
                    setTooltip((prev) => {
                      if (prev?.unidad?.id === p.id) return prev;
                      return { unidad: p, x: rect.left + point.x, y: rect.top + point.y };
                    });
                  }, 500);
                },
                mouseout: () => {
                  clearTimeout(hoverTimerRef.current);
                  closeTimerRef.current = setTimeout(() => setTooltip(null), 300);
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

        {/* ── Capa 2: Ruta del historial — superpuesta cuando hay datos ── */}
        {tabActivo === "historial" && histLatlngs.length > 1 && (
          <>
            {/* Polylines: split cuando hay punto activo, segmentadas si no */}
            {puntoActivo ? (
              <>
                <Polyline
                  positions={historialPuntos.slice(0, (puntoReproduccion ?? 0) + 1).map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: "#3b82f6", weight: 4, opacity: 1 }}
                />
                <Polyline
                  positions={historialPuntos.slice(puntoReproduccion ?? 0).map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: "#6b7280", weight: 3, opacity: 0.4 }}
                />
              </>
            ) : (
              <>
                {segmentos.map((seg, si) => (
                  <Polyline
                    key={`seg-${si}`}
                    positions={seg.points.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }}
                  />
                ))}
                {segmentos.length === 0 && (
                  <Polyline positions={histLatlngs} pathOptions={{ color: TRIP_COLORS[0], weight: 4, opacity: 0.9 }} />
                )}
              </>
            )}

            {/* Marcadores de parada */}
            {paradas.map((p, pi) => (
              <Marker key={`stop-${pi}`} position={[p.lat, p.lng]} icon={crearIconoParada(p.color)}>
                <Popup>
                  <div style={{ fontSize: "12px", lineHeight: 1.6 }}>
                    <strong>Parada</strong><br />
                    Duración: {formatDuracion(p.durSec)}<br />
                    <span style={{ color: "#888" }}>
                      {new Date(p.inicio).toLocaleTimeString("es-MX")} → {new Date(p.fin).toLocaleTimeString("es-MX")}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Anotaciones de velocidad cada 10 puntos */}
            {historialPuntos
              .filter((_, i) => i % 10 === 0 && i !== 0 && i !== historialPuntos.length - 1)
              .map((p, i) => (
                <CircleMarker
                  key={`ann-${i}`}
                  center={[p.lat, p.lng]}
                  radius={p.velocidad > 80 ? 7 : 4}
                  pathOptions={{
                    color:       p.velocidad > 80 ? "#ef4444" : "#64748b",
                    fillColor:   p.velocidad > 80 ? "#ef4444" : "#fff",
                    fillOpacity: 1,
                    weight:      2,
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
                      <strong>{new Date(p.timestamp).toLocaleTimeString("es-MX")}</strong><br />
                      {p.velocidad} km/h
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {/* Inicio y fin */}
            <Marker position={histLatlngs[0]} icon={startIcon}>
              <Popup>
                <strong>Inicio</strong><br />
                {new Date(historialPuntos[0].timestamp).toLocaleString("es-MX")}
              </Popup>
            </Marker>
            <Marker position={histLatlngs[histLatlngs.length - 1]} icon={endIcon}>
              <Popup>
                <strong>Fin</strong><br />
                {new Date(historialPuntos[historialPuntos.length - 1].timestamp).toLocaleString("es-MX")}
              </Popup>
            </Marker>

            {/* Marcador animado de reproducción */}
            {puntoActivo && (
              <Marker
                position={[puntoActivo.lat, puntoActivo.lng]}
                icon={createUnitIcon(iconoUnidad, puntoActivo.rumbo, puntoActivo.velocidad > 2, "")}
                zIndexOffset={1000}
              >
                <Tooltip permanent direction="top" offset={[0, -28]}>
                  <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                    {new Date(puntoActivo.timestamp).toLocaleTimeString("es-MX")}
                    {" · "}
                    <span style={{ color: puntoActivo.velocidad > 80 ? "#ef4444" : "inherit" }}>
                      {puntoActivo.velocidad} km/h
                    </span>
                  </span>
                </Tooltip>
              </Marker>
            )}
          </>
        )}
      </MapContainer>

      {/* Tooltip de unidad en vivo */}
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
