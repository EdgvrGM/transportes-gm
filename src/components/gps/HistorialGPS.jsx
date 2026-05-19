import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  LayersControl,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Loader2, Clock, Gauge, Route } from "lucide-react";

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";

// Fix iconos Leaflet + Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

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

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

async function fetchHistory({ unitId, from, to }) {
  const fromTs = Math.floor(new Date(from + "T00:00:00").getTime() / 1000);
  const toTs   = Math.floor(new Date(to   + "T23:59:59").getTime() / 1000);
  const res = await fetch(
    `${WIALON_PROXY_URL}?action=history&unit=${unitId}&from=${fromTs}&to=${toTs}`
  );
  if (!res.ok) throw new Error("Error al obtener historial");
  return res.json();
}

async function fetchUnidades() {
  const { data, error } = await supabase
    .from("UnidadGPS")
    .select("wialon_unit_id, wialon_nombre, Camion(nombre, placas)")
    .eq("activo", true);
  if (error) throw error;
  return data || [];
}

function calcStats(points) {
  if (!points || points.length === 0) return null;
  const velocidades = points.map((p) => p.velocidad);
  const maxVel = Math.max(...velocidades);
  const avgVel = Math.round(velocidades.reduce((a, b) => a + b, 0) / velocidades.length);
  let distKm = 0;
  for (let i = 1; i < points.length; i++) {
    const dLat = points[i].lat - points[i - 1].lat;
    const dLng = points[i].lng - points[i - 1].lng;
    distKm += Math.sqrt(dLat * dLat + dLng * dLng) * 111;
  }
  const durMin = Math.round(
    (new Date(points[points.length - 1].timestamp) - new Date(points[0].timestamp)) / 60000
  );
  return { maxVel, avgVel, distKm: distKm.toFixed(1), durMin };
}

export default function HistorialGPS() {
  const [unitId, setUnitId] = useState("");
  const [from, setFrom] = useState(yesterday);
  const [to, setTo]     = useState(today);
  const [buscar, setBuscar] = useState(false);

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-gps-historial"],
    queryFn: fetchUnidades,
  });

  const { data: historial, isLoading } = useQuery({
    queryKey: ["gps-history", unitId, from, to],
    queryFn: () => fetchHistory({ unitId, from, to }),
    enabled: buscar && !!unitId,
  });

  // Resetear buscar una vez que la query termina (TanStack Query v5 no tiene onSettled en useQuery)
  useEffect(() => {
    if (!isLoading && buscar) setBuscar(false);
  }, [isLoading]);

  const points  = historial?.points || [];
  const stats   = calcStats(points);
  const latlngs = points.map((p) => [p.lat, p.lng]);
  const center  = latlngs.length > 0
    ? latlngs[Math.floor(latlngs.length / 2)]
    : [19.2433, -103.7250];

  const getNombreUnidad = (u) =>
    u.Camion ? `${u.Camion.nombre} (${u.wialon_nombre})` : u.wialon_nombre;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controles de búsqueda */}
      <div className="flex flex-wrap gap-3 items-end bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Unidad
          </label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Seleccionar unidad...</option>
            {unidades.map((u) => (
              <option key={u.wialon_unit_id} value={u.wialon_unit_id}>
                {getNombreUnidad(u)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Desde
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <button
          onClick={() => setBuscar(true)}
          disabled={!unitId || isLoading}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 text-sm font-semibold transition-colors"
        >
          {isLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Search className="w-4 h-4" />}
          Ver ruta
        </button>
      </div>

      {/* Cuerpo: mapa + stats */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Mapa de ruta — wrapper con stacking context aislado */}
        <div className="flex-1 min-h-0" style={{ position: "relative", zIndex: 0 }}>
          <MapContainer
            center={center}
            zoom={latlngs.length > 0 ? 10 : 8}
            style={{ width: "100%", height: "100%", borderRadius: "12px" }}
            scrollWheelZoom={true}
            key={JSON.stringify(center)}
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

            {latlngs.length > 1 && (
              <>
                <Polyline
                  positions={latlngs}
                  pathOptions={{ color: "#EAB308", weight: 4, opacity: 0.85 }}
                />

                {points
                  .filter((_, i) => i % 5 === 0 && i !== 0 && i !== points.length - 1)
                  .map((p, i) => (
                    <CircleMarker
                      key={i}
                      center={[p.lat, p.lng]}
                      radius={5}
                      pathOptions={{ color: "#EAB308", fillColor: "#fff", fillOpacity: 1, weight: 2 }}
                    >
                      <Popup>
                        <div style={{ fontSize: "12px" }}>
                          {p.velocidad} km/h<br />
                          <span style={{ color: "#888" }}>
                            {new Date(p.timestamp).toLocaleTimeString("es-MX")}
                          </span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}

                <Marker position={latlngs[0]} icon={startIcon}>
                  <Popup>
                    <strong>Inicio</strong><br />
                    {new Date(points[0].timestamp).toLocaleString("es-MX")}
                  </Popup>
                </Marker>

                <Marker position={latlngs[latlngs.length - 1]} icon={endIcon}>
                  <Popup>
                    <strong>Fin</strong><br />
                    {new Date(points[points.length - 1].timestamp).toLocaleString("es-MX")}
                  </Popup>
                </Marker>
              </>
            )}

            {latlngs.length === 0 && !isLoading && (
              <div
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)", zIndex: 1000,
                  background: "rgba(255,255,255,0.9)", padding: "16px 24px",
                  borderRadius: "12px", textAlign: "center",
                  fontSize: "14px", color: "#64748b",
                }}
              >
                {unitId
                  ? "Sin datos para el periodo seleccionado"
                  : "Selecciona una unidad para ver su ruta"}
              </div>
            )}
          </MapContainer>
        </div>

        {/* Panel de estadísticas */}
        {stats && (
          <div className="w-64 flex-col gap-3 hidden md:flex">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Resumen de ruta
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Route className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Distancia</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.distKm} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Duración</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {Math.floor(stats.durMin / 60)}h {stats.durMin % 60}m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Gauge className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Vel. máxima</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.maxVel} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Gauge className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Vel. promedio</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{stats.avgVel} km/h</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex-1 overflow-y-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Registros
              </h3>
              <div className="space-y-1">
                {points.filter((_, i) => i % 5 === 0).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800"
                  >
                    <span className="text-xs text-slate-400">
                      {new Date(p.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`text-xs font-medium ${p.velocidad > 80 ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}>
                      {p.velocidad} km/h
                    </span>
                    <span className="text-xs">{p.motor ? "🟢" : "⚪"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
