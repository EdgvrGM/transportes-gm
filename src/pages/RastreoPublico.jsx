import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/supabaseClient";
import { createUnitIcon } from "@/components/gps/unitIconHelper";
import { differenceInMinutes, differenceInSeconds } from "date-fns";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";
const REFRESH_MS = 15000;

function formatExpiry(expiraEn) {
  const mins = differenceInMinutes(new Date(expiraEn), new Date());
  if (mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function RastreoPublico() {
  const { token } = useParams();
  const [sesion, setSesion] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | valido | expirado | invalido
  const [posicion, setPosicion] = useState(null);
  const [rastro, setRastro] = useState([]);
  const [expiryLabel, setExpiryLabel] = useState("");
  const mapRef = useRef(null);
  const intervalRef = useRef(null);

  // Validar token
  useEffect(() => {
    async function validar() {
      const { data, error } = await supabase.rpc("rastreo_por_token", { p_token: token });
      const row = Array.isArray(data) ? data[0] : null;

      if (error || !row) {
        setEstado("invalido");
        return;
      }

      if (new Date(row.expires_at) <= new Date()) {
        setEstado("expirado");
        return;
      }

      setSesion(row);
      setEstado("valido");
    }
    validar();
  }, [token]);

  // Countdown de expiración
  useEffect(() => {
    if (!sesion) return;
    const update = () => {
      const label = formatExpiry(sesion.expires_at);
      if (!label) { setEstado("expirado"); return; }
      setExpiryLabel(label);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [sesion]);

  // Fetch posición en vivo
  const fetchPosicion = useCallback(async () => {
    if (!sesion) return;
    try {
      const res = await fetch(`${WIALON_PROXY_URL}?action=positions&token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const all = await res.json();
      const unit = all.find((u) => String(u.id) === String(sesion.wialon_unit_id));
      if (!unit || (unit.lat === 0 && unit.lng === 0)) return;
      setPosicion(unit);
      setRastro((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.lat !== unit.lat || last.lng !== unit.lng) {
          return [...prev, { lat: unit.lat, lng: unit.lng }].slice(-20);
        }
        return prev;
      });
      if (mapRef.current) {
        mapRef.current.panTo([unit.lat, unit.lng], { animate: true, duration: 0.5 });
      }
    } catch (_) {}
  }, [sesion]);

  useEffect(() => {
    if (estado !== "valido") return;
    fetchPosicion();
    intervalRef.current = setInterval(fetchPosicion, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [estado, fetchPosicion]);

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

  if (estado === "expirado") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">⏱</div>
          <h1 className="text-xl font-bold text-white mb-2">Enlace expirado</h1>
          <p className="text-slate-400 text-sm">Este enlace de rastreo ya no es válido. Solicita uno nuevo.</p>
        </div>
      </div>
    );
  }

  if (estado === "invalido") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-white mb-2">Enlace inválido</h1>
          <p className="text-slate-400 text-sm">No se encontró ningún rastreo con este enlace.</p>
        </div>
      </div>
    );
  }

  const center = posicion ? [posicion.lat, posicion.lng] : [23.6345, -102.5528];

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
            <p className="text-[10px] text-slate-400">Transportes GM · Rastreo en vivo</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {posicion && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-300 font-bold">{posicion.velocidad} km/h</p>
              <p className="text-[10px] text-slate-500">
                {posicion.motor ? "En movimiento" : "Detenido"}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-[10px] text-slate-400">15s · expira en {expiryLabel}</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative" style={{ zIndex: 0 }}>
        {!posicion && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-slate-900/80 rounded-xl px-4 py-3 text-center">
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-300 text-xs">Obteniendo posición...</p>
            </div>
          </div>
        )}
        <MapContainer
          center={center}
          zoom={14}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
          ref={mapRef}
        >
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

          {/* Rastro */}
          {rastro.length >= 2 && (
            rastro.slice(0, -1).map((p, i) => {
              const next = rastro[i + 1];
              const opacity = (i + 1) / rastro.length;
              return (
                <Polyline
                  key={i}
                  positions={[[p.lat, p.lng], [next.lat, next.lng]]}
                  pathOptions={{ color: "#3b82f6", weight: 3, opacity: opacity * 0.8 }}
                />
              );
            })
          )}

          {/* Marcador unidad */}
          {posicion && (
            <Marker
              position={[posicion.lat, posicion.lng]}
              icon={createUnitIcon(posicion.uri, posicion.rumbo, posicion.motor, posicion.nombre)}
            >
              <Popup>
                <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
                  <strong>{posicion.nombre}</strong><br />
                  {posicion.velocidad} km/h · {posicion.motor ? "🟢 En movimiento" : "⚪ Detenido"}<br />
                  <span style={{ color: "#888", fontSize: "11px" }}>
                    {new Date(posicion.ultima_actualizacion).toLocaleTimeString("es-MX")}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
