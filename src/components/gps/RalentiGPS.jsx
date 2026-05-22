import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { Gauge, AlertTriangle, Clock } from "lucide-react";

const RALENTI_UMBRAL_MS = 15 * 60 * 1000;

function formatMinutos(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1)  return "< 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function tiempoRelativo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default function RalentiGPS({ positions = [], ralentiActivo = {} }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const unidadesEnRalenti = positions
    .filter((p) => ralentiActivo[String(p.id)] !== undefined)
    .map((p) => ({
      ...p,
      inicioRalenti: ralentiActivo[String(p.id)],
      duracionMs:    Date.now() - ralentiActivo[String(p.id)],
    }));

  const excesivoCount = Object.entries(ralentiActivo)
    .filter(([, inicio]) => Date.now() - inicio >= RALENTI_UMBRAL_MS).length;

  const hoyInicio = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const { data: alertasHistorial = [] } = useQuery({
    queryKey: ["alertas-ralenti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AlertaGPS")
        .select("*")
        .eq("tipo", "ralenti")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const alertasDeHoy = alertasHistorial.filter((a) => a.created_at >= hoyInicio);
  const minutosHoy   = alertasDeHoy.length * 15;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">En ralentí ahora</p>
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xl font-bold text-foreground">{unidadesEnRalenti.length}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">Ralentí excesivo</p>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xl font-bold text-foreground">{excesivoCount}</span>
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">Minutos en ralentí hoy (aprox.)</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xl font-bold text-foreground">{minutosHoy} min</span>
          </div>
        </div>
      </div>

      {/* Unidades actualmente en ralentí */}
      {unidadesEnRalenti.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Actualmente en ralentí
          </p>
          <div className="space-y-3">
            {unidadesEnRalenti.map((p) => {
              const ms       = p.duracionMs;
              const progreso = Math.min((ms / RALENTI_UMBRAL_MS) * 100, 100);
              const excesivo = ms >= RALENTI_UMBRAL_MS;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-3 ${
                    excesivo
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-foreground uppercase truncate">
                      {p.nombre}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {excesivo && (
                        <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          Alerta enviada
                        </span>
                      )}
                      <span className={`text-xs font-medium ${excesivo ? "text-red-600" : "text-amber-600"}`}>
                        {formatMinutos(ms)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${excesivo ? "bg-red-500" : "bg-amber-400"}`}
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial de alertas */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Historial de alertas
        </p>
        {alertasHistorial.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Gauge className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Sin alertas de ralentí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertasHistorial.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Gauge className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.wialon_nombre}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{a.mensaje}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tiempoRelativo(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
