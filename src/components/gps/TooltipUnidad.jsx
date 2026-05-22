import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X, Gauge, Clock, Navigation, Satellite, MapPin,
  Loader2, Copy, Check, Share2,
} from "lucide-react";
import PanelCompartir from "@/components/gps/PanelCompartir";

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";
const WIALON_IMG_BASE  = "https://hst-api.wialon.com";

function tiempoDesde(ts) {
  if (!ts) return "Sin datos";
  const ms = typeof ts === "number" ? ts * 1000 : new Date(ts).getTime();
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 0 || diff > 86400 * 30) return "Sin señal reciente";
  if (diff < 60)    return `hace ${diff}s`;
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
  return `hace ${Math.floor(diff / 86400)} días`;
}


export default function TooltipUnidad({ unidad, onClose, onMouseEnter, onMouseLeave, style }) {
  const [copied,    setCopied]    = useState(false);
  const [showShare, setShowShare] = useState(false);

  const copiarCoordenadas = () => {
    const texto = `${unidad.lat.toFixed(4)}, ${unidad.lng.toFixed(4)}`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleShare = () => setShowShare((v) => !v);

  const { data: detalle, isLoading } = useQuery({
    queryKey: ["gps-details", unidad.id],
    queryFn: async () => {
      const res = await fetch(`${WIALON_PROXY_URL}?action=details&unit=${unidad.id}`);
      if (!res.ok) throw new Error("Error al obtener detalles");
      return res.json();
    },
    staleTime: 30000,
  });

  const handleMouseLeave = () => {
    if (!showShare) onMouseLeave?.();
  };

  const enRalenti = unidad.motor && unidad.velocidad === 0;

  return (
    <div
      style={{ position: "fixed", zIndex: 9999, pointerEvents: "auto", ...style }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          {unidad.uri
            ? <img src={`${WIALON_IMG_BASE}${unidad.uri}`} style={{ width: 36, height: 36, objectFit: "contain" }} />
            : <span style={{ fontSize: 24 }}>🚚</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate uppercase">
            {unidad.nombre}
          </p>
          <p className="text-xs text-slate-400">
            {tiempoDesde(unidad.ultima_actualizacion)} · {new Date(
            typeof unidad.ultima_actualizacion === "number"
              ? unidad.ultima_actualizacion * 1000
              : unidad.ultima_actualizacion
          ).toLocaleTimeString("es-MX")}
          </p>
        </div>

        <button
          onClick={toggleShare}
          title="Compartir rastreo"
          className={`p-1 rounded-lg transition-colors shrink-0 ${
            showShare
              ? "bg-gm-primary/20 text-yellow-600"
              : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
          }`}
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Panel compartir — inline, sin Dialog */}
      {showShare && (
        <div className="border-b border-slate-100 dark:border-slate-700">
          <PanelCompartir unidad={unidad} onClose={() => setShowShare(false)} />
        </div>
      )}

      {/* Dirección */}
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 dark:border-slate-700">
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
          <span className="text-xs text-slate-400">Obteniendo dirección...</span>
        </div>
      ) : detalle?.direccion ? (
        <div className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 flex-1">
            {detalle.direccion}
          </p>
          <button
            onClick={copiarCoordenadas}
            title={copied ? "Copiado" : "Copiar coordenadas"}
            className="shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Copy className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      ) : null}

      {/* Stats en grid */}
      <div className="grid grid-cols-2 gap-0 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 p-3 border-r border-slate-100 dark:border-slate-700">
          <Gauge className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Velocidad</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {enRalenti
                ? <span className="text-yellow-500">Ralentí</span>
                : `${unidad.velocidad} km/h`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3">
          <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Odómetro</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {detalle?.odometro != null
                ? `${detalle.odometro.toLocaleString("es-MX")} km`
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 border-r border-t border-slate-100 dark:border-slate-700">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Horas motor</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {detalle?.horas_motor != null ? `${detalle.horas_motor} h` : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-slate-100 dark:border-slate-700">
          <Satellite className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Satélites</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {unidad.satelites ?? detalle?.satelites ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: enRalenti ? "#EAB308" : unidad.motor ? "#22c55e" : "#94a3b8" }}
        />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {enRalenti
            ? "Motor encendido · Ralentí"
            : unidad.motor
              ? "Motor encendido · En movimiento"
              : "Motor apagado · Detenido"
          }
        </span>
      </div>
    </div>
  );
}
