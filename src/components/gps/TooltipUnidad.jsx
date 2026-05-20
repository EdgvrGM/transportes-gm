import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addHours } from "date-fns";
import { supabase } from "@/supabaseClient";
import {
  X, Gauge, Clock, Navigation, Satellite, MapPin,
  Loader2, Copy, Check, Share2, ExternalLink, AlertCircle,
} from "lucide-react";

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";
const WIALON_IMG_BASE  = "https://hst-api.wialon.com";

const DURACIONES = [
  { label: "4h",  horas: 4 },
  { label: "8h",  horas: 8 },
  { label: "24h", horas: 24 },
  { label: "3d",  horas: 72 },
  { label: "7d",  horas: 168 },
];

function tiempoDesde(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)   return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export default function TooltipUnidad({ unidad, onClose, onMouseEnter, onMouseLeave, style }) {
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [duracion, setDuracion] = useState(8);
  const [generando, setGenerando] = useState(false);
  const [linkGenerado, setLinkGenerado] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [errorShare, setErrorShare] = useState(null);

  const copiarCoordenadas = () => {
    const texto = `${unidad.lat.toFixed(4)}, ${unidad.lng.toFixed(4)}`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generarLink = async () => {
    setGenerando(true);
    setErrorShare(null);
    try {
      const token  = generateToken();
      const expira = addHours(new Date(), duracion).toISOString();
      const payload = {
        token,
        wialon_unit_id: parseInt(unidad.id, 10),
        wialon_nombre:  unidad.nombre,
        expires_at:     expira,
      };
      console.log("[RastreoCompartido] insert payload:", payload);
      const { data, error } = await supabase
        .from("RastreoCompartido")
        .insert(payload)
        .select("token")
        .single();
      console.log("[RastreoCompartido] result:", data, error);
      if (error) throw error;
      setLinkGenerado(`${window.location.origin}/rastreo/${data.token}`);
    } catch (err) {
      console.error("[RastreoCompartido] error:", err);
      const msg = err?.code === "42P01"
        ? "La tabla RastreoCompartido no existe. Ejecuta el SQL en Supabase."
        : err?.message ?? "Error al generar el enlace";
      setErrorShare(msg);
    } finally {
      setGenerando(false);
    }
  };

  const copiarLink = () => {
    if (!linkGenerado) return;
    navigator.clipboard.writeText(linkGenerado).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  };

  const toggleShare = () => {
    setShowShare((v) => !v);
    if (showShare) {
      setLinkGenerado(null);
      setLinkCopiado(false);
      setErrorShare(null);
    }
  };

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
            {tiempoDesde(unidad.ultima_actualizacion)} · {new Date(unidad.ultima_actualizacion).toLocaleTimeString("es-MX")}
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
        <div className="border-b border-slate-100 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Compartir enlace de rastreo
          </p>

          {!linkGenerado ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Vigencia del enlace:</p>
              <div className="flex gap-1 mb-3">
                {DURACIONES.map((d) => (
                  <button
                    key={d.horas}
                    onClick={() => setDuracion(d.horas)}
                    className={`flex-1 text-xs py-1 rounded border transition-colors ${
                      duracion === d.horas
                        ? "bg-gm-primary/20 text-yellow-700 dark:text-yellow-400 border-gm-primary/40 font-semibold"
                        : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {errorShare && (
                <div className="flex items-start gap-1.5 mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-600 dark:text-red-400 leading-snug">{errorShare}</p>
                </div>
              )}
              <button
                onClick={generarLink}
                disabled={generando}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-gm-primary text-slate-900 hover:bg-yellow-400 transition-colors disabled:opacity-60"
              >
                {generando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                {generando ? "Generando..." : "Generar enlace"}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-1 font-mono">
                  {linkGenerado}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={copiarLink}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                >
                  {linkCopiado
                    ? <><Check className="w-3 h-3 text-green-500" /> Copiado</>
                    : <><Copy className="w-3 h-3" /> Copiar</>
                  }
                </button>
                <a
                  href={linkGenerado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-gm-primary text-slate-900 hover:bg-yellow-400 transition-colors font-semibold"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir
                </a>
              </div>
              <button
                onClick={() => { setLinkGenerado(null); setLinkCopiado(false); setErrorShare(null); }}
                className="w-full text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                Generar nuevo enlace
              </button>
            </div>
          )}
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
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{unidad.velocidad} km/h</p>
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
          style={{ background: unidad.motor ? "#22c55e" : "#94a3b8" }}
        />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {unidad.motor ? "Motor encendido · En movimiento" : "Motor apagado · Detenido"}
        </span>
      </div>
    </div>
  );
}
