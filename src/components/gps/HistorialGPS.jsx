import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import {
  Search, Loader2,
  ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight, X,
} from "lucide-react";

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";

const today     = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

function toDatetimeLocal(date, time) {
  return `${date}T${time}`;
}

async function fetchHistory({ unitId, fromDt, toDt }) {
  const fromTs = Math.floor(new Date(fromDt).getTime() / 1000);
  const toTs   = Math.floor(new Date(toDt).getTime() / 1000);
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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HistorialGPS({ positions = [], onHistorialCargado, onPuntoActivo, onReproduciendo, onIconoUnidad }) {
  const [unitId,     setUnitId]     = useState("");
  const [fromDt,     setFromDt]     = useState(toDatetimeLocal(today, "00:00"));
  const [toDt,       setToDt]       = useState(toDatetimeLocal(today, "23:59"));
  const [fetchCount, setFetchCount] = useState(0);

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-gps-historial"],
    queryFn: fetchUnidades,
  });

  const { data: historial, isFetching } = useQuery({
    queryKey: ["gps-history", unitId, fromDt, toDt, fetchCount],
    queryFn: () => fetchHistory({ unitId, fromDt, toDt }),
    enabled: fetchCount > 0,
  });

  // Sincronizar ícono Wialon de la unidad seleccionada
  useEffect(() => {
    const uri = positions.find((p) => String(p.id) === String(unitId))?.uri ?? null;
    onIconoUnidad?.(uri);
  }, [unitId, positions]);

  const [puntosLocales, setPuntosLocales] = useState([]);
  const [playbackIdx,   setPlaybackIdx]   = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [velocidad,     setVelocidad]     = useState(1);
  const playIntervalRef = useRef(null);

  // Sincronizar puntos locales cuando llegan datos del servidor
  useEffect(() => {
    const pts = historial?.points || [];
    setPuntosLocales(pts);
    onHistorialCargado?.(pts);
    setPlaybackIdx(0);
    setIsPlaying(false);
    onPuntoActivo?.(null);
  }, [historial]);

  // Sincronizar estado de reproducción con el padre
  useEffect(() => {
    onReproduciendo?.(isPlaying);
  }, [isPlaying]);

  // Ticker de reproducción
  const totalPoints = puntosLocales.length;
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(playIntervalRef.current);
      return;
    }
    playIntervalRef.current = setInterval(() => {
      setPlaybackIdx((prev) => {
        const next = prev + 1;
        if (next >= totalPoints) {
          setIsPlaying(false);
          onPuntoActivo?.(null);
          return prev;
        }
        onPuntoActivo?.(next);
        return next;
      });
    }, Math.round(100 / velocidad));
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, totalPoints, velocidad]);

  const points = puntosLocales;

  const distTotal = useMemo(() => {
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      d += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    }
    return d.toFixed(1);
  }, [points]);

  // Rangos rápidos
  const setHoy = () => {
    setFromDt(toDatetimeLocal(today, "00:00"));
    setToDt(toDatetimeLocal(today, "23:59"));
  };
  const setAyer = () => {
    setFromDt(toDatetimeLocal(yesterday, "00:00"));
    setToDt(toDatetimeLocal(yesterday, "23:59"));
  };
  const setSemana = () => {
    const d = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    setFromDt(toDatetimeLocal(d, "00:00"));
    setToDt(toDatetimeLocal(today, "23:59"));
  };
  const setMes = () => {
    const d = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    setFromDt(toDatetimeLocal(d, "00:00"));
    setToDt(toDatetimeLocal(today, "23:59"));
  };

  const handleClear = () => {
    clearInterval(playIntervalRef.current);
    setPuntosLocales([]);
    setPlaybackIdx(0);
    setIsPlaying(false);
    onHistorialCargado?.([]);
    onPuntoActivo?.(null);
  };

  const mostrarRecorrido = () => {
    clearInterval(playIntervalRef.current);
    setPuntosLocales([]);
    setPlaybackIdx(0);
    setIsPlaying(false);
    setFetchCount((c) => c + 1);
  };

  const handlePlay = () => {
    if (playbackIdx >= totalPoints - 1) setPlaybackIdx(0);
    setIsPlaying((p) => !p);
  };

  const getNombreUnidad = (u) =>
    u.Camion ? `${u.Camion.nombre} (${u.wialon_nombre})` : u.wialon_nombre;

  const unidadSeleccionada = unidades.find((u) => String(u.wialon_unit_id) === String(unitId));
  const nombreUnidad = unidadSeleccionada ? getNombreUnidad(unidadSeleccionada) : "";
  const fechaRuta = points.length > 0
    ? new Date(points[0].timestamp).toLocaleDateString("es-MX")
    : null;

  const btnQuick = "flex-1 py-1 text-xs font-medium rounded border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors";
  const ctrlBtn  = "p-1 text-muted-foreground hover:text-foreground transition-colors rounded disabled:opacity-40";

  return (
    <div className="flex flex-col h-full text-sm">
      {/* ── Controles de búsqueda ── */}
      <div className="p-3 border-b border-border space-y-3">
        {/* Unidad */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
            Unidad
          </label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Seleccionar...</option>
            {unidades.map((u) => (
              <option key={u.wialon_unit_id} value={u.wialon_unit_id}>
                {getNombreUnidad(u)}
              </option>
            ))}
          </select>
        </div>

        {/* Botones rápidos */}
        <div className="flex gap-1">
          <button className={btnQuick} onClick={setHoy}>Hoy</button>
          <button className={btnQuick} onClick={setAyer}>Ayer</button>
          <button className={btnQuick} onClick={setSemana}>7d</button>
          <button className={btnQuick} onClick={setMes}>30d</button>
        </div>

        {/* Datetime local inputs */}
        <div className="space-y-1.5">
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">De</label>
            <input
              type="datetime-local"
              value={fromDt}
              onChange={(e) => setFromDt(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">A</label>
            <input
              type="datetime-local"
              value={toDt}
              onChange={(e) => setToDt(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>

        {/* Botón buscar */}
        <button
          onClick={mostrarRecorrido}
          disabled={!unitId || isFetching}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 disabled:bg-muted disabled:text-muted-foreground text-slate-900 text-xs font-semibold transition-colors"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Mostrar recorrido
        </button>
      </div>

      {/* ── Resultado ── */}
      {points.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {/* Fila de resultado */}
          <div className="p-3 border-b border-border">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{nombreUnidad}</p>
                <p className="text-xs text-muted-foreground">{fechaRuta} · {distTotal} km</p>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={Math.max(0, totalPoints - 1)}
              value={playbackIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setPlaybackIdx(idx);
                onPuntoActivo?.(idx);
              }}
              className="w-full accent-yellow-400 mt-2"
            />

            {/* Info del punto actual */}
            {points[playbackIdx] && (
              <p className="text-xs text-muted-foreground text-center mt-0.5">
                Punto {playbackIdx + 1} / {totalPoints}
                {" · "}
                {new Date(points[playbackIdx].timestamp).toLocaleTimeString("es-MX")}
                {" · "}
                <span className={points[playbackIdx].velocidad > 80 ? "text-red-500 font-medium" : ""}>
                  {points[playbackIdx].velocidad} km/h
                </span>
              </p>
            )}

            {/* Controles de reproducción */}
            <div className="flex items-center justify-center gap-1 mt-2">
              <button
                className={ctrlBtn}
                onClick={() => { setPlaybackIdx(0); onPuntoActivo?.(0); }}
                title="Inicio"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                className={ctrlBtn}
                onClick={() => { const i = Math.max(0, playbackIdx - 10); setPlaybackIdx(i); onPuntoActivo?.(i); }}
                title="Retroceder 10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-lg bg-yellow-400/20 text-yellow-600 hover:bg-yellow-400/30 transition-colors"
                onClick={handlePlay}
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                className={ctrlBtn}
                onClick={() => { const i = Math.min(totalPoints - 1, playbackIdx + 10); setPlaybackIdx(i); onPuntoActivo?.(i); }}
                title="Avanzar 10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className={ctrlBtn}
                onClick={() => { const i = totalPoints - 1; setPlaybackIdx(i); onPuntoActivo?.(i); }}
                title="Final"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                className={`${ctrlBtn} ml-1`}
                onClick={handleClear}
                title="Limpiar ruta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de velocidad */}
            <div className="flex items-center justify-center gap-1 mt-2">
              {[1, 2, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setVelocidad(v)}
                  className={`px-2 py-0.5 text-xs rounded font-medium transition-colors border ${
                    velocidad === v
                      ? "bg-gm-primary/20 text-yellow-600 border-gm-primary/40"
                      : "text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder vacío */}
      {points.length === 0 && !isFetching && (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
          {unitId ? "Sin datos para el período seleccionado" : "Selecciona una unidad y un intervalo"}
        </div>
      )}
    </div>
  );
}
