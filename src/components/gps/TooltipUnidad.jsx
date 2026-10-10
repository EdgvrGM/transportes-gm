import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X, Gauge, Clock, Navigation, Satellite, MapPin,
  Loader2, Copy, Check, Share2, Timer,
} from "lucide-react";
import PanelCompartir from "@/components/gps/PanelCompartir";
import {
  WIALON_PROXY_URL, WIALON_IMG_BASE, RALENTI_VEL_MAX, PARADA_RADIO_M, PARADA_VENTANA_H, estaEnRalenti,
} from "@/components/gps/constants";
import { ultimoReporteMs, tiempoDesde, horaReporte, duracion, rumboCardinal } from "@/components/gps/formatoGps";
import { distanciaMetros } from "@/components/panel/panelGeo";
import { wialonFetch } from "@/lib/wialonFetch";

// Recorre el historial hacia atrás hasta el último punto fuera del radio del lugar actual:
// el punto siguiente es la llegada. Un punto suelto fuera del radio con el anterior dentro
// es un salto del GPS estacionado, no una salida.
function llegadaAlLugar(points, lat, lng) {
  const fuera = (p) => p && !(p.lat === 0 && p.lng === 0) && distanciaMetros(p.lat, p.lng, lat, lng) > PARADA_RADIO_M;
  let llegadaMs = null;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (p.lat === 0 && p.lng === 0) continue;
    if (fuera(p) && (i === 0 || fuera(points[i - 1]))) return { llegadaMs, completo: true };
    if (!fuera(p)) llegadaMs = new Date(p.timestamp).getTime();
  }
  return { llegadaMs, completo: false };
}

// Quita del subtítulo lo que ya dice el nombre de Wialon (suele ser "MODELO PLACAS").
function subtituloCamion(camion, nombreUnidad) {
  if (!camion) return [];
  const nombre = (nombreUnidad ?? "").toUpperCase();
  return [camion.nombre, camion.placas].filter((t) => t && !nombre.includes(String(t).toUpperCase()));
}

export default function TooltipUnidad({ unidad, camion, onClose, onMouseEnter, onMouseLeave, style, centered = false }) {
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
      const res = await wialonFetch(`${WIALON_PROXY_URL}?action=details&unit=${unidad.id}`);
      if (!res.ok) throw new Error("Error al obtener detalles");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min — odómetro y horas motor cambian poco
  });

  const detenida = (unidad.velocidad ?? 0) <= RALENTI_VEL_MAX;

  // La llegada no cambia mientras siga ahí; la llave incluye el lugar (~100 m) para que
  // al estacionarse en otro sitio no se reutilice la llegada de la parada anterior.
  const { data: parada, isLoading: cargandoParada } = useQuery({
    queryKey: ["gps-parada", unidad.id, unidad.lat?.toFixed(3), unidad.lng?.toFixed(3)],
    queryFn: async () => {
      const to   = Math.floor(Date.now() / 1000);
      const from = to - PARADA_VENTANA_H * 3600;
      const res = await wialonFetch(`${WIALON_PROXY_URL}?action=history&unit=${unidad.id}&from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Error al obtener historial");
      const { points = [] } = await res.json();
      return llegadaAlLugar(points, unidad.lat, unidad.lng);
    },
    enabled: detenida && !!unidad.lat && !!unidad.lng,
    staleTime: 5 * 60 * 1000,
  });

  const subtitulo = subtituloCamion(camion, unidad.nombre);

  const reporteMs = ultimoReporteMs(unidad);

  const handleMouseLeave = () => {
    if (!showShare) onMouseLeave?.();
  };

  const enRalenti = estaEnRalenti(unidad);

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          {unidad.uri
            ? <img alt={unidad.nombre} src={`${WIALON_IMG_BASE}${unidad.uri}`} style={{ width: 36, height: 36, objectFit: "contain" }} />
            : <span style={{ fontSize: 24 }}>🚚</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate uppercase">
            {unidad.nombre}
          </p>
          {subtitulo.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitulo.join(" · ")}</p>
          )}
          <p className="text-xs text-slate-400">
            Último reporte {tiempoDesde(reporteMs)} · {horaReporte(reporteMs)}
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

      {detenida && <TiempoEnLugar parada={parada} cargando={cargandoParada} />}

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
              {!detenida && (
                <span className="ml-1 text-xs font-medium text-slate-400">{rumboCardinal(unidad.rumbo)}</span>
              )}
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
    </>
  );

  if (centered) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/40 z-[9998]"
          onClick={onClose}
        />
        <div
          style={{ position: "fixed", zIndex: 9999, top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "auto" }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-[min(20rem,calc(100vw-2rem))] max-h-[calc(100vh-6rem)] overflow-y-auto"
        >
          {content}
          <EstadoMotor enRalenti={enRalenti} unidad={unidad} />
        </div>
      </>
    );
  }

  return (
    <div
      style={{ position: "fixed", zIndex: 9999, pointerEvents: "auto", ...style }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 max-h-[calc(100vh-1rem)] overflow-y-auto"
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
      <EstadoMotor enRalenti={enRalenti} unidad={unidad} />
    </div>
  );
}

// La duración se calcula en cada render para que avance con el polling sin volver a pedirla.
function TiempoEnLugar({ parada, cargando }) {
  if (!cargando && !parada?.llegadaMs) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-amber-200/60 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10">
      <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      {cargando ? (
        <span className="text-xs text-slate-500 dark:text-slate-400">Calculando tiempo en este lugar...</span>
      ) : (
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">En este lugar</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {!parada.completo && "Al menos "}
            {duracion(Math.max(0, Date.now() - parada.llegadaMs))}{" "}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">· desde {horaReporte(parada.llegadaMs)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function EstadoMotor({ enRalenti, unidad }) {
  return (
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
  );
}
