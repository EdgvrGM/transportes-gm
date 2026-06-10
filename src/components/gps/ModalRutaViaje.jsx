import { useState, useEffect, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { wialonFetch } from "@/lib/wialonFetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import MapaGPS from "@/components/gps/MapaGPS";

export default function ModalRutaViaje({ viaje, onClose }) {
  const [puntos, setPuntos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [iconoUnidad, setIconoUnidad] = useState(null);
  const [seguir, setSeguir] = useState(false);
  const playIntervalRef = useRef(null);

  useEffect(() => {
    if (!viaje?.id) return;
    setCargando(true);
    setPlaybackIdx(0);
    setIsPlaying(false);
    setPuntos([]);
    setIconoUnidad(null);
    setSeguir(false);

    supabase
      .from("ViajeRuta")
      .select("puntos")
      .eq("viaje_id", viaje.id)
      .single()
      .then(({ data }) => {
        setPuntos(data?.puntos || []);
        setCargando(false);
      });

    if (viaje.camion_id) {
      supabase
        .from("UnidadGPS")
        .select("wialon_unit_id")
        .eq("camion_id", viaje.camion_id)
        .single()
        .then(({ data: unidadData }) => {
          if (!unidadData?.wialon_unit_id) return;
          wialonFetch(
            `https://wialon-proxy.transportesgm.workers.dev?action=details&unit=${unidadData.wialon_unit_id}`
          )
            .then((r) => r.json())
            .then((detail) => { if (detail?.uri) setIconoUnidad(detail.uri); })
            .catch(() => {});
        });
    }
  }, [viaje?.id]);

  useEffect(() => {
    if (!isPlaying) {
      clearInterval(playIntervalRef.current);
      return;
    }
    playIntervalRef.current = setInterval(() => {
      setPlaybackIdx((prev) => {
        const next = prev + 1;
        if (next >= puntos.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, Math.round(100 / velocidad));
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, puntos.length, velocidad]);

  const puntoActual = puntos[playbackIdx] ?? null;

  const getEficienciaColor = (kmPorLitro) => {
    if (!kmPorLitro) return "text-muted-foreground";
    if (kmPorLitro > 2.25) return "text-green-600 dark:text-green-400";
    if (kmPorLitro >= 2.0) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleClose = () => {
    setIsPlaying(false);
    clearInterval(playIntervalRef.current);
    onClose();
  };

  return (
    <Dialog open={!!viaje} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[1.5rem]">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="text-lg font-black">
            {viaje?.ruta_ida || "Ruta GPS"}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted-foreground">
            {viaje?.camion_nombre}
            {viaje?.camion_placas ? ` · ${viaje.camion_placas}` : ""}
            {viaje?.fecha
              ? ` · ${new Date(viaje.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {/* Mapa */}
          <div style={{ position: "relative", zIndex: 0 }} className="flex-1 min-h-0">
            {cargando ? (
              <div className="flex h-full items-center justify-center bg-muted/20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : puntos.length === 0 ? (
              <div className="flex h-full items-center justify-center bg-muted/20 text-muted-foreground text-sm">
                Sin puntos GPS guardados para este viaje
              </div>
            ) : (
              <MapaGPS
                positions={[]}
                vinculaciones={{}}
                historialPuntos={puntos}
                puntoReproduccion={seguir || isPlaying ? playbackIdx : null}
                reproduciendo={seguir || isPlaying}
                iconoUnidad={iconoUnidad}
                tabActivo="historial"
              />
            )}
          </div>

          {/* Barra de controles inferior */}
          <div className={`shrink-0 border-t border-border bg-card transition-opacity duration-200 ${cargando || puntos.length === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}>

            {/* ── DESKTOP: fila única ── */}
            <div className="hidden md:flex items-center gap-4 px-5 py-3">

              <div className="shrink-0 w-20 flex flex-col items-start">
                <p className="text-2xl font-black text-foreground leading-none tabular-nums">
                  {puntoActual?.velocidad ?? 0}
                  <span className="text-xs font-bold text-muted-foreground ml-1">km/h</span>
                </p>
                <p className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                  {puntoActual
                    ? new Date(puntoActual.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "—"}
                </p>
              </div>

              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold tabular-nums px-0.5">
                  <span>{playbackIdx + 1}</span>
                  <span>{puntos.length}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, puntos.length - 1)}
                  value={playbackIdx}
                  onChange={(e) => { setPlaybackIdx(Number(e.target.value)); setIsPlaying(false); setSeguir(true); }}
                  className="w-full accent-yellow-400"
                  disabled={puntos.length === 0}
                />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => { setPlaybackIdx(0); setIsPlaying(false); }} disabled={puntos.length === 0}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button className="flex-1 h-7 rounded-xl font-black shadow-sm"
                    onClick={() => setIsPlaying(!isPlaying)} disabled={puntos.length === 0}>
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="icon" className="h-7 w-10 rounded-lg shrink-0 shadow-sm"
                    onClick={() => { setIsPlaying(false); setSeguir(true); setPlaybackIdx((p) => Math.max(0, p - 1)); }}
                    disabled={puntos.length === 0 || playbackIdx === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" className="h-7 w-10 rounded-lg shrink-0 shadow-sm"
                    onClick={() => { setIsPlaying(false); setSeguir(true); setPlaybackIdx((p) => Math.min(puntos.length - 1, p + 1)); }}
                    disabled={puntos.length === 0 || playbackIdx === puntos.length - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-1.5 pl-4 border-l border-border">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Velocidad</p>
                <div className="flex gap-1">
                  {[1, 2, 5, 10].map((v) => (
                    <button key={v} onClick={() => setVelocidad(v)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${velocidad === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                      {v}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="shrink-0 flex gap-5 pl-4 border-l border-border items-center">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Eficiencia</p>
                  <p className={`text-2xl font-black ${getEficienciaColor(viaje?.km_por_litro)} leading-none tabular-nums`}>
                    {viaje?.km_por_litro ? Number(viaje.km_por_litro).toFixed(1) : "—"}
                    <span className="text-xs font-bold text-muted-foreground ml-1">km/L</span>
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1">
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {viaje?.kilometros_total ? Number(viaje.kilometros_total).toLocaleString("es-MX") : "—"}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground">km</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {viaje?.litros_combustible ? Number(viaje.litros_combustible).toLocaleString("es-MX") : "—"}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground">lt</p>
                  </div>
                </div>
              </div>

              {puntos.length > 0 && (
                <div className="shrink-0 flex gap-4 pl-4 border-l border-border">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inicio</p>
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {puntos[0]?.timestamp ? new Date(puntos[0].timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fin</p>
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {puntos[puntos.length - 1]?.timestamp ? new Date(puntos[puntos.length - 1].timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── MOBILE: 3 filas ── */}
            <div className="flex md:hidden flex-col gap-2 px-4 pt-3 pb-3">

              {/* Fila 1: Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold tabular-nums px-0.5">
                  <span>{playbackIdx + 1}</span>
                  <span>{puntos.length}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, puntos.length - 1)}
                  value={playbackIdx}
                  onChange={(e) => { setPlaybackIdx(Number(e.target.value)); setIsPlaying(false); setSeguir(true); }}
                  className="w-full accent-yellow-400"
                  disabled={puntos.length === 0}
                />
              </div>

              {/* Fila 2: km/h + botones + velocidad */}
              <div className="flex items-center gap-2">
                <div className="shrink-0 w-[72px]">
                  <p className="text-2xl font-black text-foreground leading-none tabular-nums">
                    {puntoActual?.velocidad ?? 0}
                    <span className="text-xs font-bold text-muted-foreground ml-1">km/h</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                    {puntoActual
                      ? new Date(puntoActual.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "—"}
                  </p>
                </div>
                <div className="flex flex-1 gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => { setPlaybackIdx(0); setIsPlaying(false); }} disabled={puntos.length === 0}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button className="flex-1 h-8 rounded-xl font-black shadow-sm"
                    onClick={() => setIsPlaying(!isPlaying)} disabled={puntos.length === 0}>
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="icon" className="h-8 w-11 rounded-lg shrink-0 shadow-sm"
                    onClick={() => { setIsPlaying(false); setSeguir(true); setPlaybackIdx((p) => Math.max(0, p - 1)); }}
                    disabled={puntos.length === 0 || playbackIdx === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" className="h-8 w-11 rounded-lg shrink-0 shadow-sm"
                    onClick={() => { setIsPlaying(false); setSeguir(true); setPlaybackIdx((p) => Math.min(puntos.length - 1, p + 1)); }}
                    disabled={puntos.length === 0 || playbackIdx === puntos.length - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="shrink-0 flex gap-1 pl-2 border-l border-border">
                  {[1, 2, 5, 10].map((v) => (
                    <button key={v} onClick={() => setVelocidad(v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${velocidad === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                      {v}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Fila 3: Estadísticas */}
              <div className="flex items-center justify-between border-t border-border/50 pt-2">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Eficiencia</p>
                  <p className={`text-xl font-black ${getEficienciaColor(viaje?.km_por_litro)} leading-none tabular-nums`}>
                    {viaje?.km_por_litro ? Number(viaje.km_por_litro).toFixed(1) : "—"}
                    <span className="text-xs font-bold text-muted-foreground ml-1">km/L</span>
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1">
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {viaje?.kilometros_total ? Number(viaje.kilometros_total).toLocaleString("es-MX") : "—"}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground">km</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-sm font-black text-foreground tabular-nums">
                      {viaje?.litros_combustible ? Number(viaje.litros_combustible).toLocaleString("es-MX") : "—"}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground">lt</p>
                  </div>
                </div>
                {puntos.length > 0 && (
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inicio</p>
                      <p className="text-sm font-black text-foreground tabular-nums">
                        {puntos[0]?.timestamp ? new Date(puntos[0].timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fin</p>
                      <p className="text-sm font-black text-foreground tabular-nums">
                        {puntos[puntos.length - 1]?.timestamp ? new Date(puntos[puntos.length - 1].timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
