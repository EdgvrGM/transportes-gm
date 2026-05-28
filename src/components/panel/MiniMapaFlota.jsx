import { useMemo, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createUnitIcon } from "@/components/gps/unitIconHelper";
import { CENTRO_MX } from "@/components/gps/constants";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function FitToUnits({ positions }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length < 1 || fitted.current) return;
    const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: false });
    fitted.current = true;
  }, [positions, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function MarkerUnidad({ pos }) {
  const icon = useMemo(
    () => createUnitIcon(pos.uri, pos.rumbo, pos.motor, pos.nombre, pos.velocidad),
    [pos.uri, pos.rumbo, pos.motor, pos.nombre, pos.velocidad]
  );
  return (
    <Marker position={[pos.lat, pos.lng]} icon={icon}>
      <Tooltip direction="top" offset={[0, -22]} className="!bg-card !border !border-border !text-foreground !rounded-lg !shadow-lg">
        <div className="font-bold text-sm">{pos.nombre}</div>
        <div className="text-xs text-muted-foreground">
          {pos.motor ? `${pos.velocidad ?? 0} km/h` : "Motor apagado"}
        </div>
      </Tooltip>
    </Marker>
  );
}

export default function MiniMapaFlota({ positions = [], isLoading = false, height = 280 }) {
  const validas = useMemo(
    () => positions.filter((p) => p.lat !== 0 && p.lng !== 0),
    [positions]
  );

  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border bg-muted/30"
      style={{ position: "relative", zIndex: 0, width: "100%", height: `${height}px` }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            Cargando flota…
          </div>
        </div>
      )}

      <MapContainer
        center={CENTRO_MX}
        zoom={5}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution={isDark ? "&copy; CARTO" : "&copy; OpenStreetMap"}
          url={
            isDark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />

        <InvalidateSize />

        {validas.map((pos) => (
          <MarkerUnidad key={pos.id} pos={pos} />
        ))}

        <FitToUnits positions={validas} />
      </MapContainer>

      <div className="absolute top-3 left-3 z-[400] bg-card border border-border rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm pointer-events-none">
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          Unidades visibles
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            <span className="font-semibold">En ruta</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="font-semibold">Detenidas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="font-semibold">En patio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

