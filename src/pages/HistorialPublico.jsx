import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/supabaseClient";
import { createUnitIcon } from "@/components/gps/unitIconHelper";
import { WIALON_PROXY_URL, VELOCIDAD_EXCESO, CENTRO_MX } from "@/components/gps/constants";
import { Play, Pause, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function FitInicial({ points }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || points.length < 2) return;
    map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    done.current = true;
  }, [points, map]);
  return null;
}

function SeguirPunto({ punto }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!punto) return;
    if (prev.current?.lat === punto.lat && prev.current?.lng === punto.lng) return;
    prev.current = punto;
    map.panTo([punto.lat, punto.lng], { animate: true, duration: 0.3 });
  }, [punto, map]);
  return null;
}

export default function HistorialPublico() {
  const { token } = useParams();
  const [estado, setEstado] = useState("cargando"); // cargando | valido | expirado | invalido | sindata
  const [sesion, setSesion] = useState(null);
  const [points, setPoints] = useState([]);
  const [uri, setUri]       = useState(null);

  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [velocidad,   setVelocidad]   = useState(1);
  const playRef = useRef(null);

  // Validar token
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("RastreoCompartido")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !data || data.tipo !== "historial") { setEstado("invalido"); return; }
      if (new Date(data.expires_at) <= new Date())      { setEstado("expirado"); return; }
      setSesion(data);
    })();
  }, [token]);

  // Cargar recorrido del rango guardado
  useEffect(() => {
    if (!sesion) return;
    let cancelado = false;
    (async () => {
      try {
        const fromTs = Math.floor(new Date(sesion.historial_desde).getTime() / 1000);
        const toTs   = Math.floor(new Date(sesion.historial_hasta).getTime() / 1000);
        const res = await fetch(
          `${WIALON_PROXY_URL}?action=history&unit=${sesion.wialon_unit_id}&from=${fromTs}&to=${toTs}`
        );
        if (!res.ok) throw new Error("history");
        const data = await res.json();
        if (cancelado) return;
        const pts = data?.points || [];
        if (data?.uri) setUri(data.uri);
        setPoints(pts);
        setEstado(pts.length > 0 ? "valido" : "sindata");
        // Fallback: si el historial no trajo icono, pedirlo a details
        if (!data?.uri) {
          fetch(`${WIALON_PROXY_URL}?action=details&unit=${sesion.wialon_unit_id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelado && d?.uri) setUri(d.uri); })
            .catch(() => {});
        }
      } catch {
        if (!cancelado) setEstado("sindata");
      }
    })();
    return () => { cancelado = true; };
  }, [sesion]);

  // Ticker de reproducción
  const totalPoints = points.length;
  useEffect(() => {
    if (!isPlaying) { clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      setPlaybackIdx((prev) => {
        const next = prev + 1;
        if (next >= totalPoints) { setIsPlaying(false); return prev; }
        return next;
      });
    }, Math.round(100 / velocidad));
    return () => clearInterval(playRef.current);
  }, [isPlaying, totalPoints, velocidad]);

  const distTotal = useMemo(() => {
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      d += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    }
    return d.toFixed(1);
  }, [points]);

  const puntoActual = points[playbackIdx] ?? null;
  const markerIcon = useMemo(() => {
    if (!puntoActual) return null;
    return createUnitIcon(uri, puntoActual.rumbo, puntoActual.motor, sesion?.wialon_nombre, puntoActual.velocidad);
  }, [uri, puntoActual, sesion]);

  const handlePlay = () => {
    if (playbackIdx >= totalPoints - 1) setPlaybackIdx(0);
    setIsPlaying((p) => !p);
  };

  if (estado === "cargando") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Validando enlace...</p>
        </div>
      </div>
    );
  }

  if (estado === "expirado" || estado === "invalido") {
    const exp = estado === "expirado";
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">{exp ? "⏱" : "🚫"}</div>
          <h1 className="text-xl font-bold text-white mb-2">{exp ? "Enlace expirado" : "Enlace inválido"}</h1>
          <p className="text-slate-400 text-sm">
            {exp
              ? "Este enlace de recorrido ya no es válido. Solicita uno nuevo."
              : "No se encontró ningún recorrido con este enlace."}
          </p>
        </div>
      </div>
    );
  }

  const center = points[0] ? [points[0].lat, points[0].lng] : CENTRO_MX;

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Banner superior */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img src="/img/LOGO.PNG" alt="Logo" className="h-7 w-auto" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wide">
              {sesion?.wialon_nombre ?? "Unidad"}
            </p>
            <p className="text-[10px] text-slate-400">
              Transportes GM · Recorrido {sesion ? `${fmtFecha(sesion.historial_desde)} – ${fmtFecha(sesion.historial_hasta)}` : ""}
            </p>
          </div>
        </div>
        {estado === "valido" && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-300 font-bold">{distTotal} km</p>
            <p className="text-[10px] text-slate-500">{totalPoints} puntos</p>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 relative" style={{ zIndex: 0 }}>
        {estado === "sindata" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-slate-900/80 rounded-xl px-5 py-4 text-center max-w-xs">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-slate-300 text-sm">No hay datos de recorrido para este período.</p>
            </div>
          </div>
        ) : (
          <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom={true}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Calles (OSM)">
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satélite">
                <TileLayer attribution="&copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Oscuro">
                <TileLayer attribution="&copy; CARTO" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
            </LayersControl>

            <FitInicial points={points} />
            <SeguirPunto punto={puntoActual} />

            {/* Ruta completa */}
            {points.length >= 2 && (
              <Polyline positions={points.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.7 }} />
            )}

            {/* Inicio (verde) y fin (rojo) */}
            {points.length >= 2 && (
              <>
                <CircleMarker center={[points[0].lat, points[0].lng]} radius={6} pathOptions={{ color: "white", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }} />
                <CircleMarker center={[points.at(-1).lat, points.at(-1).lng]} radius={6} pathOptions={{ color: "white", weight: 2, fillColor: "#ef4444", fillOpacity: 1 }} />
              </>
            )}

            {/* Marcador animado */}
            {puntoActual && markerIcon && (
              <Marker position={[puntoActual.lat, puntoActual.lng]} icon={markerIcon} />
            )}
          </MapContainer>
        )}
      </div>

      {/* Reproductor */}
      {estado === "valido" && (
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-4 py-3">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalPoints - 1)}
            value={playbackIdx}
            onChange={(e) => setPlaybackIdx(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
          {puntoActual && (
            <p className="text-[11px] text-slate-400 text-center mt-1">
              Punto {playbackIdx + 1} / {totalPoints}
              {" · "}
              {new Date(puntoActual.timestamp).toLocaleString("es-MX")}
              {" · "}
              <span className={puntoActual.velocidad > VELOCIDAD_EXCESO ? "text-red-400 font-medium" : "text-slate-300"}>
                {puntoActual.velocidad} km/h
              </span>
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => setPlaybackIdx(0)} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Inicio">
              <ChevronsLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setPlaybackIdx((i) => Math.max(0, i - 10))} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Retroceder 10">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handlePlay} className="p-2 rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition-colors" title={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => setPlaybackIdx((i) => Math.min(totalPoints - 1, i + 10))} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Avanzar 10">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={() => setPlaybackIdx(totalPoints - 1)} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Final">
              <ChevronsRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 ml-3">
              {[1, 2, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setVelocidad(v)}
                  className={`px-2 py-0.5 text-xs rounded font-medium transition-colors border ${
                    velocidad === v
                      ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/40"
                      : "text-slate-400 hover:text-white border-slate-700"
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
