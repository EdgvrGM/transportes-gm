import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/supabaseClient";
import { Radar, Map, BellRing, Gauge, ArrowUpRight } from "lucide-react";
import MiniMapaFlota from "./MiniMapaFlota";
import { estaEnPatio } from "./panelGeo";
import {
  WIALON_PROXY_URL,
  POLL_POSITIONS_MS,
  POLL_ALERTAS_MS,
  VELOCIDAD_ALERTA,
} from "@/components/gps/constants";

const SIN_SENAL_MS = 30 * 60 * 1000;

async function fetchPositions(unidadesInactivas = []) {
  const exclude = unidadesInactivas.join(",");
  const url = exclude
    ? `${WIALON_PROXY_URL}?action=positions&exclude=${exclude}`
    : `${WIALON_PROXY_URL}?action=positions`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("No se pudieron cargar posiciones");
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

const COUNTER_VARIANTS = {
  green: "hover:border-green-500/40 hover:bg-green-500/5",
  orange: "hover:border-orange-500/40 hover:bg-orange-500/5",
  blue: "hover:border-blue-500/40 hover:bg-blue-500/5",
  zinc: "hover:border-muted-foreground/40 hover:bg-muted/30",
};

function Counter({ count, label, variant, dotClass, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border transition ${COUNTER_VARIANTS[variant]}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`}></span>
      <span className="text-lg font-black leading-none text-foreground">{count}</span>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </button>
  );
}

export default function EstadoFlota() {
  const navigate = useNavigate();

  const { data: unidadesInactivas = [] } = useQuery({
    queryKey: ["panel-unidades-inactivas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("UnidadGPS")
        .select("wialon_unit_id")
        .eq("activo", false);
      return (data || []).map((u) => u.wialon_unit_id);
    },
  });

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["panel-positions", unidadesInactivas],
    queryFn: () => fetchPositions(unidadesInactivas),
    refetchInterval: POLL_POSITIONS_MS,
    staleTime: POLL_POSITIONS_MS / 2,
  });

  const { data: alertasNoLeidas = 0 } = useQuery({
    queryKey: ["panel-alertas-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("AlertaGPS")
        .select("*", { count: "exact", head: true })
        .eq("leida", false);
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: POLL_ALERTAS_MS,
  });

  const stats = useMemo(() => {
    const now = Date.now();
    let enRuta = 0, detenidas = 0, enPatio = 0, sinSenal = 0;
    let exceso = null;

    for (const p of positions) {
      const ultMs = (p.ultima_actualizacion || 0) * 1000;
      const offline = !p.lat && !p.lng;
      const desactualizado = ultMs && now - ultMs > SIN_SENAL_MS;

      if (offline || desactualizado) {
        sinSenal++;
        continue;
      }
      if (estaEnPatio(p.lat, p.lng)) {
        enPatio++;
        continue;
      }
      if (p.motor && (p.velocidad || 0) > 5) {
        enRuta++;
        if ((p.velocidad || 0) > VELOCIDAD_ALERTA && (!exceso || p.velocidad > exceso.velocidad)) {
          exceso = p;
        }
      } else {
        detenidas++;
      }
    }

    return { enRuta, detenidas, enPatio, sinSenal, exceso };
  }, [positions]);

  const abrirGPS = () => navigate(createPageUrl("RastreoGPS"));

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
      {/* Header con título + contadores compactos + botón GPS */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight text-foreground">Estado de Flota</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                En vivo
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-1 flex-wrap lg:flex-nowrap lg:justify-center">
          <Counter count={stats.enRuta} label="En ruta" variant="green" dotClass="bg-green-500 animate-pulse" onClick={abrirGPS} />
          <Counter count={stats.detenidas} label="Detenidas" variant="orange" dotClass="bg-orange-500" onClick={abrirGPS} />
          <Counter count={stats.enPatio} label="En patio" variant="blue" dotClass="bg-blue-500" onClick={abrirGPS} />
          <Counter count={stats.sinSenal} label="Sin señal" variant="zinc" dotClass="bg-muted-foreground/60" onClick={abrirGPS} />
        </div>

        <button
          onClick={abrirGPS}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gm-primary text-zinc-900 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition shadow-sm"
        >
          <Map className="w-3.5 h-3.5" /> Abrir GPS
        </button>
      </div>

      {/* Mini mapa */}
      <MiniMapaFlota positions={positions} isLoading={isLoading} height={300} />

      {/* Alertas vivas */}
      <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-border">
        {alertasNoLeidas > 0 && (
          <button
            onClick={abrirGPS}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
          >
            <BellRing className="w-3.5 h-3.5" />
            {alertasNoLeidas} {alertasNoLeidas === 1 ? "alerta sin leer" : "alertas sin leer"}
          </button>
        )}

        {stats.exceso && (
          <button
            onClick={abrirGPS}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition"
          >
            <Gauge className="w-3.5 h-3.5" />
            {stats.exceso.nombre} · {Math.round(stats.exceso.velocidad)} km/h
          </button>
        )}

        {alertasNoLeidas === 0 && !stats.exceso && (
          <span className="text-xs text-muted-foreground italic">
            Sin alertas activas
          </span>
        )}

        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
          <ArrowUpRight className="w-3 h-3" />
          {positions.length} unidades sincronizadas
        </span>
      </div>
    </section>
  );
}
