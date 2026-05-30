import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl, Polyline, CircleMarker, Circle, useMap } from "react-leaflet";
import TooltipUnidad from "@/components/gps/TooltipUnidad";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createUnitIcon } from "@/components/gps/unitIconHelper";
import { PATIO_LAT, PATIO_LNG, PATIO_RADIO_M, CENTRO_MX, VELOCIDAD_EXCESO } from "@/components/gps/constants";

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

// Marcador de exceso de velocidad en la ruta del historial
const excesoIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:15px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));">⚠️</div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Control personalizado de Leaflet: se apila en la misma esquina que el selector
// de capas (por debajo, al agregarse después). Renderiza children vía portal.
function ControlMapa({ position = "topright", children }) {
  const map = useMap();
  const [container] = useState(() => L.DomUtil.create("div"));
  useEffect(() => {
    const Ctl = L.Control.extend({ onAdd: () => container });
    const ctl = new Ctl({ position });
    map.addControl(ctl);
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return () => map.removeControl(ctl);
  }, [map, position, container]);
  return createPortal(children, container);
}

const FILTROS_RUTA = [
  { key: "excesos", label: "Excesos de velocidad", icono: "⚠️" },
  { key: "paradas", label: "Paradas", icono: "🅿️" },
  { key: "contexto", label: "Puntos de ruta", icono: "•" },
];

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
      map.setView(CENTRO_MX, 5);
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
    const zoomDeseado = Math.max(map.getZoom(), 14);
    map.flyTo([unidad.lat, unidad.lng], zoomDeseado, { animate: true, duration: 1 });
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

// Marker de unidad en vivo — memoiza el icono para evitar parpadeo cada 15s
function LiveUnitMarker({ p, camion, onMarkerClick, hoverTimerRef, closeTimerRef, setTooltip, setTooltipCentrado }) {
  const icon = useMemo(
    () => createUnitIcon(p.uri, p.rumbo, p.motor, p.nombre, p.velocidad),
    [p.uri, p.rumbo, p.motor, p.nombre, p.velocidad]
  );

  return (
    <Marker
      position={[p.lat, p.lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (window.innerWidth < 768) {
            setTooltipCentrado(p);
          }
          onMarkerClick?.(p);
        },
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
            <><br /><span className="text-slate-600 dark:text-slate-300" style={{ fontFamily: "monospace", fontSize: "11px" }}>{camion.placas}</span></>
          )}
          <br />
          Velocidad: {p.velocidad} km/h<br />
          Rumbo: {p.rumbo}°<br />
          Estado: {p.motor ? "🟢 En movimiento" : "⚪ Detenido"}<br />
          <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: "11px" }}>
            {new Date(p.ultima_actualizacion).toLocaleTimeString("es-MX")}
          </span>
        </div>
      </Popup>
    </Marker>
  );
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
  const center  = primera ? [primera.lat, primera.lng] : CENTRO_MX;

  const [tooltip, setTooltip] = useState(null);
  const [tooltipCentrado, setTooltipCentrado] = useState(null);
  const [filtrosRuta, setFiltrosRuta] = useState({ excesos: true, paradas: true, contexto: true });
  const [filtrosColapsado, setFiltrosColapsado] = useState(true);
  const closeTimerRef = useRef(null);
  const hoverTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(hoverTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

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

        {/* Geocerca del patio */}
        <Circle
          center={[PATIO_LAT, PATIO_LNG]}
          radius={PATIO_RADIO_M}
          pathOptions={{ color: "#EAB308", fillColor: "#EAB308", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }}
        />

        {/* ── Capa 1: Marcadores en vivo — siempre visibles ── */}
        {positions.map((p) => (
          <RastroUnidad key={`rastro-${p.id}`} historialPos={historialRastro[p.id]} />
        ))}
        {positions.map((p) => {
          if (p.lat === 0 && p.lng === 0) return null;
          return (
            <LiveUnitMarker
              key={p.id}
              p={p}
              camion={vinculaciones[p.id]}
              onMarkerClick={onMarkerClick}
              hoverTimerRef={hoverTimerRef}
              closeTimerRef={closeTimerRef}
              setTooltip={setTooltip}
              setTooltipCentrado={setTooltipCentrado}
            />
          );
        })}

        {/* ── Capa 2: Ruta del historial — superpuesta cuando hay datos ── */}
        {tabActivo === "historial" && histLatlngs.length > 1 && (
          <>
            {/* Filtros de la ruta — debajo del selector de capas, colapsado por defecto */}
            <ControlMapa position="topright">
              {filtrosColapsado ? (
                <button
                  type="button"
                  onClick={() => setFiltrosColapsado(false)}
                  title="Filtros de la ruta"
                  style={{ width: "34px", height: "34px", background: "#fff", border: "none", borderRadius: "8px", boxShadow: "0 1px 5px rgba(0,0,0,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              ) : (
                <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 5px rgba(0,0,0,0.4)", padding: "8px 10px", fontSize: "12px", color: "#1e293b", lineHeight: 1.3 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 800, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b" }}>
                      Filtros de ruta
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiltrosColapsado(true)}
                      title="Ocultar filtros"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "16px", lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                  {FILTROS_RUTA.map((opt) => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "2px 0", whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={filtrosRuta[opt.key]}
                        onChange={(e) => setFiltrosRuta((f) => ({ ...f, [opt.key]: e.target.checked }))}
                        style={{ cursor: "pointer", accentColor: "#185FA5" }}
                      />
                      <span>{opt.icono} {opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </ControlMapa>

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
            {filtrosRuta.paradas && paradas.map((p, pi) => (
              <Marker key={`stop-${pi}`} position={[p.lat, p.lng]} icon={crearIconoParada(p.color)}>
                <Popup>
                  <div style={{ fontSize: "12px", lineHeight: 1.6 }}>
                    <strong>Parada</strong><br />
                    Duración: {formatDuracion(p.durSec)}<br />
                    <span className="text-slate-500 dark:text-slate-400">
                      {new Date(p.inicio).toLocaleTimeString("es-MX")} → {new Date(p.fin).toLocaleTimeString("es-MX")}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Anotaciones: puntos con exceso de velocidad (> VELOCIDAD_EXCESO) + sample de contexto */}
            {(() => {
              const total = historialPuntos.length;
              const MAX_CONTEXT = 50;
              const step = Math.max(10, Math.ceil(total / MAX_CONTEXT));
              const indicesContext = new Set();
              for (let i = step; i < total - 1; i += step) indicesContext.add(i);
              return historialPuntos
                .map((p, i) => ({ p, i }))
                .filter(({ p, i }) => {
                  if (i === 0 || i === total - 1) return false;
                  const esExceso = p.velocidad > VELOCIDAD_EXCESO;
                  if (esExceso) return filtrosRuta.excesos;
                  return filtrosRuta.contexto && indicesContext.has(i);
                })
                .map(({ p, i }) => {
                  const esExceso = p.velocidad > VELOCIDAD_EXCESO;
                  const popup = (
                    <Popup>
                      <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
                        <strong>{new Date(p.timestamp).toLocaleTimeString("es-MX")}</strong><br />
                        {esExceso && (
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>⚠️ Exceso de velocidad<br /></span>
                        )}
                        {p.velocidad} km/h
                      </div>
                    </Popup>
                  );
                  return esExceso ? (
                    <Marker key={`ann-${i}`} position={[p.lat, p.lng]} icon={excesoIcon}>
                      {popup}
                    </Marker>
                  ) : (
                    <CircleMarker
                      key={`ann-${i}`}
                      center={[p.lat, p.lng]}
                      radius={3}
                      pathOptions={{ color: "#64748b", fillColor: "#fff", fillOpacity: 1, weight: 1.5 }}
                    >
                      {popup}
                    </CircleMarker>
                  );
                });
            })()}

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

      {/* Tooltip de unidad en vivo — desktop hover */}
      {tooltip && (
        <TooltipUnidad
          unidad={tooltip.unidad}
          onClose={() => setTooltip(null)}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            left: Math.max(8, Math.min(tooltip.x + 16, window.innerWidth - 328)),
            top:  Math.max(8, Math.min(tooltip.y - 10, window.innerHeight - 408)),
          }}
        />
      )}

      {/* Tooltip centrado — móvil click */}
      {tooltipCentrado && (
        <TooltipUnidad
          unidad={tooltipCentrado}
          onClose={() => setTooltipCentrado(null)}
          centered
        />
      )}
    </div>
  );
}
