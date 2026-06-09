import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/supabaseClient";
import { createUnitIcon } from "@/components/gps/unitIconHelper";
import { estaEnRalenti, CENTRO_MX, WIALON_IMG_BASE, POLL_POSITIONS_MS, VELOCIDAD_EXCESO } from "@/components/gps/constants";
import { LogOut, Navigation, MapPin, Play, Pause, Loader2, Truck } from "lucide-react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function haversineKm(a, b) {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function EnfocarUnidad({ unidad }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!unidad) return;
    if (prev.current === unidad.id) return;
    prev.current = unidad.id;
    map.flyTo([unidad.lat, unidad.lng], Math.max(map.getZoom(), 14));
  }, [unidad, map]);
  return null;
}
function SeguirPunto({ punto }) {
  const map = useMap();
  useEffect(() => { if (punto) map.panTo([punto.lat, punto.lng], { animate: true, duration: 0.3 }); }, [punto, map]);
  return null;
}
function FitRuta({ points }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length < 2) return;
    map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    done.current = true;
  }, [points, map]);
  return null;
}

export default function PortalCliente() {
  const [cuenta, setCuenta] = useState(null);
  const [positions, setPositions] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [enfocar, setEnfocar] = useState(null);
  const [modo, setModo] = useState("envivo"); // envivo | historial

  // ── Bootstrap: datos de la cuenta + unidades asignadas ──
  useEffect(() => {
    supabase.functions.invoke("rastreo-cliente", { body: { action: "bootstrap" } })
      .then(({ data }) => { if (data?.cuenta) setCuenta(data.cuenta); });
  }, []);

  // ── Polling de posiciones (solo las del cliente, vía Edge Function) ──
  const fetchPositions = useCallback(async () => {
    const { data } = await supabase.functions.invoke("rastreo-cliente", { body: { action: "positions" } });
    if (Array.isArray(data)) setPositions(data.filter((u) => !(u.lat === 0 && u.lng === 0)));
  }, []);

  useEffect(() => {
    fetchPositions();
    const t = setInterval(fetchPositions, POLL_POSITIONS_MS);
    return () => clearInterval(t);
  }, [fetchPositions]);

  // ── Historial ──
  const minDate = cuenta ? localDateStr(new Date(cuenta.historial_desde)) : localDateStr(new Date());
  const [histUnit, setHistUnit] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [puntos, setPuntos] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);

  useEffect(() => {
    // valores por defecto del rango cuando se conoce la cuenta
    if (cuenta && !desde) {
      setDesde(`${minDate}T00:00`);
      setHasta(`${localDateStr(new Date())}T23:59`);
    }
  }, [cuenta]); // eslint-disable-line

  const cargarHistorial = async () => {
    if (!histUnit) return;
    setHistLoading(true); setPuntos([]); setIdx(0); setPlaying(false);
    const from = Math.floor(new Date(desde).getTime() / 1000);
    const to = Math.floor(new Date(hasta).getTime() / 1000);
    const { data } = await supabase.functions.invoke("rastreo-cliente", {
      body: { action: "history", unit: histUnit, from, to },
    });
    setPuntos(data?.points || []);
    setHistLoading(false);
  };

  const total = puntos.length;
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      setIdx((p) => { const n = p + 1; if (n >= total) { setPlaying(false); return p; } return n; });
    }, 120);
    return () => clearInterval(playRef.current);
  }, [playing, total]);

  const puntoActivo = puntos[idx] ?? null;
  const distTotal = useMemo(() => {
    let d = 0; for (let i = 1; i < puntos.length; i++) d += haversineKm(puntos[i - 1], puntos[i]);
    return d.toFixed(1);
  }, [puntos]);

  const uriPorId = useMemo(() => {
    const m = {}; positions.forEach((p) => { if (p.uri) m[String(p.id)] = p.uri; }); return m;
  }, [positions]);
  const histMarkerIcon = useMemo(() => {
    if (!puntoActivo) return null;
    return createUnitIcon(uriPorId[String(histUnit)], puntoActivo.rumbo, puntoActivo.motor, "", puntoActivo.velocidad);
  }, [puntoActivo, uriPorId, histUnit]);

  const cerrarSesion = () => supabase.auth.signOut().then(() => { window.location.href = "/login"; });

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/img/LOGO.PNG" alt="Logo" className="h-7 w-auto" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white uppercase tracking-wide truncate">{cuenta?.nombre ?? "Portal"}</p>
            <p className="text-[10px] text-slate-400">Transportes GM · Rastreo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button onClick={() => setModo("envivo")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${modo === "envivo" ? "bg-yellow-400 text-slate-900" : "text-slate-300"}`}>
              <Navigation className="w-3.5 h-3.5" /> En vivo
            </button>
            <button onClick={() => setModo("historial")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-l border-slate-700 ${modo === "historial" ? "bg-yellow-400 text-slate-900" : "text-slate-300"}`}>
              <MapPin className="w-3.5 h-3.5" /> Historial
            </button>
          </div>
          <button onClick={cerrarSesion} title="Cerrar sesión" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Panel lateral */}
        <div className="w-72 shrink-0 border-r border-slate-800 bg-slate-900 overflow-y-auto hidden md:block">
          {modo === "envivo" ? (
            <>
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">Mis unidades ({positions.length})</p>
              {positions.map((p) => {
                const ral = estaEnRalenti(p);
                return (
                  <button key={p.id} onClick={() => { setSeleccionada(p); setEnfocar(p); }}
                    className={`w-full text-left p-3 border-b border-slate-800/60 hover:bg-slate-800 flex items-center gap-2.5 ${seleccionada?.id === p.id ? "bg-slate-800" : ""}`}>
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      {p.uri ? <img alt="" src={`${WIALON_IMG_BASE}${p.uri}`} style={{ width: 28, height: 28, objectFit: "contain" }} onError={(e) => { e.target.style.display = "none"; }} /> : <Truck className="w-5 h-5 text-slate-500" />}
                    </div>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ral ? "#EAB308" : p.motor ? "#22c55e" : "#94a3b8" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white uppercase truncate leading-tight">{p.nombre}</p>
                      <p className="text-xs text-slate-400">{ral ? "Ralentí" : p.motor ? `${p.velocidad} km/h · En movimiento` : "Detenido"}</p>
                    </div>
                  </button>
                );
              })}
              {positions.length === 0 && <p className="p-4 text-xs text-slate-500 text-center">Sin unidades con señal en este momento.</p>}
            </>
          ) : (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Unidad</label>
                <select value={histUnit} onChange={(e) => setHistUnit(e.target.value)} className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-white px-2 py-1.5">
                  <option value="">Seleccionar...</option>
                  {positions.map((p) => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Desde</label>
                <input type="datetime-local" min={`${minDate}T00:00`} value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-white px-2 py-1.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Hasta</label>
                <input type="datetime-local" min={`${minDate}T00:00`} value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-white px-2 py-1.5" />
              </div>
              <p className="text-[10px] text-slate-500">El historial disponible es a partir del {minDate}.</p>
              <button onClick={cargarHistorial} disabled={!histUnit || histLoading} className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-yellow-400 text-slate-900 text-xs font-bold disabled:opacity-50">
                {histLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />} Mostrar recorrido
              </button>
              {total > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-300 mb-1">{distTotal} km · {total} puntos</p>
                  <input type="range" min={0} max={Math.max(0, total - 1)} value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="w-full accent-yellow-400" />
                  {puntoActivo && (
                    <p className="text-[11px] text-slate-400 text-center mt-1">
                      {new Date(puntoActivo.timestamp).toLocaleString("es-MX")} · <span className={puntoActivo.velocidad > VELOCIDAD_EXCESO ? "text-red-400" : ""}>{puntoActivo.velocidad} km/h</span>
                    </p>
                  )}
                  <div className="flex justify-center mt-2">
                    <button onClick={() => { if (idx >= total - 1) setIdx(0); setPlaying((p) => !p); }} className="p-2 rounded-lg bg-yellow-400 text-slate-900">
                      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mapa */}
        <div className="flex-1 relative" style={{ zIndex: 0 }}>
          <MapContainer center={CENTRO_MX} zoom={6} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Calles">
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satélite">
                <TileLayer attribution="&copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
            </LayersControl>

            {modo === "envivo" && (
              <>
                <EnfocarUnidad unidad={enfocar} />
                {positions.map((p) => (
                  <Marker key={p.id} position={[p.lat, p.lng]} icon={createUnitIcon(p.uri, p.rumbo, p.motor, p.nombre, p.velocidad)}
                    eventHandlers={{ click: () => setSeleccionada(p) }} />
                ))}
              </>
            )}

            {modo === "historial" && puntos.length >= 2 && (
              <>
                <FitRuta points={puntos} />
                <SeguirPunto punto={puntoActivo} />
                <Polyline positions={puntos.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.7 }} />
                <CircleMarker center={[puntos[0].lat, puntos[0].lng]} radius={6} pathOptions={{ color: "white", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }} />
                <CircleMarker center={[puntos.at(-1).lat, puntos.at(-1).lng]} radius={6} pathOptions={{ color: "white", weight: 2, fillColor: "#ef4444", fillOpacity: 1 }} />
                {puntoActivo && histMarkerIcon && <Marker position={[puntoActivo.lat, puntoActivo.lng]} icon={histMarkerIcon} />}
              </>
            )}
          </MapContainer>

          {/* Detalle de unidad seleccionada (en vivo) */}
          {modo === "envivo" && seleccionada && (
            <div className="absolute bottom-3 left-3 right-3 md:left-auto md:w-72 bg-slate-900/95 border border-slate-700 rounded-xl p-3 z-[400]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-white uppercase truncate">{seleccionada.nombre}</p>
                <button onClick={() => setSeleccionada(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>
              <p className="text-xs text-slate-300">{estaEnRalenti(seleccionada) ? "🟡 Ralentí" : seleccionada.motor ? `🟢 ${seleccionada.velocidad} km/h` : "⚪ Detenido"}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {seleccionada.odometro != null ? `${seleccionada.odometro.toLocaleString()} km · ` : ""}
                {seleccionada.ultima_actualizacion ? new Date(seleccionada.ultima_actualizacion * 1000).toLocaleString("es-MX") : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
