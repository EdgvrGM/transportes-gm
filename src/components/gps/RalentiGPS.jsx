import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { Gauge, AlertTriangle, Clock, List, BarChart2, Truck } from "lucide-react";

const RALENTI_UMBRAL_MS  = 15 * 60 * 1000;
const RALENTI_EXCESIVO_S = 15 * 60;
const WIALON_IMG_BASE    = "https://hst-api.wialon.com";

function formatMinutos(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1)  return "< 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function fmtHora(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

export default function RalentiGPS({ positions = [], ralentiActivo = {} }) {
  const [, setTick]            = useState(0);
  const [vistaHistorial, setVistaHistorial] = useState("resumen");
  const [filtroUnidad, setFiltroUnidad]     = useState("");
  const [filtroRango,  setFiltroRango]      = useState("hoy");

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

  const hoyInicio = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const ayerInicio = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const hace7dias = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const mesInicio = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const baseDesde = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 31); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const { data: historial = [] } = useQuery({
    queryKey: ["ralenti-historial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("RalentiHistorial")
        .select("id, wialon_unit_id, wialon_nombre, inicio_ralenti, fin_ralenti, duracion_segundos")
        .gte("inicio_ralenti", baseDesde)
        .order("inicio_ralenti", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // KPI: tiempo total hoy (historial cerrado + unidades actualmente en ralentí)
  const registrosHoy = useMemo(
    () => historial.filter((r) => r.inicio_ralenti >= hoyInicio),
    [historial, hoyInicio]
  );
  const segundosHistorial = registrosHoy.reduce((acc, r) => acc + r.duracion_segundos, 0);
  const segundosActivo    = Object.values(ralentiActivo).reduce((acc, inicio) => {
    const desde = Math.max(inicio, new Date(hoyInicio).getTime());
    const duracion = (Date.now() - desde) / 1000;
    return acc + (duracion >= 240 ? duracion : 0);
  }, 0);
  const msHoy = (segundosHistorial + segundosActivo) * 1000;

  // Unidades únicas para el select
  const unidades = useMemo(
    () => [...new Set(historial.map((r) => r.wialon_nombre))].sort(),
    [historial]
  );

  // Mapa de wialon_unit_id → uri para íconos
  const uriPorUnitId = useMemo(() => {
    const map = {};
    positions.forEach((p) => { if (p.uri) map[String(p.id)] = p.uri; });
    return map;
  }, [positions]);

  // Historial filtrado por unidad y rango (100% frontend)
  const historialFiltrado = useMemo(() => {
    let items = historial;
    if (filtroUnidad) items = items.filter((r) => r.wialon_nombre === filtroUnidad);
    items = items.filter((r) => {
      const t = r.inicio_ralenti;
      if (filtroRango === "hoy")   return t >= hoyInicio;
      if (filtroRango === "ayer")  return t >= ayerInicio && t < hoyInicio;
      if (filtroRango === "7dias") return t >= hace7dias;
      if (filtroRango === "mes")   return t >= mesInicio;
      return true;
    });
    return items;
  }, [historial, filtroUnidad, filtroRango, hoyInicio, ayerInicio, hace7dias, mesInicio]);

  // Agrupación por unidad para vista Resumen
  const resumenPorUnidad = useMemo(() => {
    const map = {};
    for (const r of historialFiltrado) {
      if (!map[r.wialon_nombre])
        map[r.wialon_nombre] = {
          nombre: r.wialon_nombre,
          segundos: 0,
          eventos: 0,
          uri: uriPorUnitId[String(r.wialon_unit_id)] ?? null,
          lastDate: r.inicio_ralenti,
        };
      map[r.wialon_nombre].segundos += r.duracion_segundos;
      map[r.wialon_nombre].eventos++;
    }
    return Object.values(map).sort((a, b) => b.segundos - a.segundos);
  }, [historialFiltrado, uriPorUnitId]);

  const maxSegundos        = resumenPorUnidad[0]?.segundos ?? 1;
  const totalSegsFiltrados = historialFiltrado.reduce((a, r) => a + r.duracion_segundos, 0);

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
          <p className="text-xs text-muted-foreground mb-1">Tiempo total en ralentí hoy</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xl font-bold text-foreground">{formatMinutos(msHoy)}</span>
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
                  <div className="flex flex-col gap-1 mb-2">
                    <span className="text-sm font-bold text-foreground uppercase">{p.nombre}</span>
                    <div className="flex items-center gap-1.5">
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

      {/* Historial */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Historial
        </p>

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filtroUnidad}
            onChange={(e) => setFiltroUnidad(e.target.value)}
            className="w-full min-w-0 text-xs rounded-lg border border-border bg-background text-foreground px-2 py-1.5 focus:outline-none truncate"
          >
            <option value="">Todas las unidades</option>
            {unidades.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select
            value={filtroRango}
            onChange={(e) => setFiltroRango(e.target.value)}
            className="w-full min-w-0 text-xs rounded-lg border border-border bg-background text-foreground px-2 py-1.5 focus:outline-none"
          >
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="mes">Este mes</option>
          </select>
        </div>

        {/* Toggle Resumen / Eventos */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setVistaHistorial("resumen")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
              vistaHistorial === "resumen"
                ? "bg-accent text-accent-foreground"
                : "bg-background text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Resumen
          </button>
          <button
            onClick={() => setVistaHistorial("eventos")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors border-l border-border ${
              vistaHistorial === "eventos"
                ? "bg-accent text-accent-foreground"
                : "bg-background text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Eventos
          </button>
        </div>

        {/* Texto resumen sobre datos filtrados */}
        {historialFiltrado.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {historialFiltrado.length} evento{historialFiltrado.length !== 1 ? "s" : ""} · {formatMinutos(totalSegsFiltrados * 1000)} totales
          </p>
        )}

        {/* Estado vacío */}
        {historialFiltrado.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Gauge className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Sin registros para este filtro</p>
          </div>
        ) : vistaHistorial === "resumen" ? (
          /* Vista Resumen */
          <div className="space-y-2">
            {resumenPorUnidad.map((u) => (
              <div key={u.nombre} className="rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors duration-150 overflow-hidden">
                {/* Header: fecha del evento más reciente */}
                <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex justify-center">
                  <span className="text-xs text-muted-foreground capitalize">
                    {fmtFecha(u.lastDate)}
                  </span>
                </div>
                {/* Body: ícono + nombre + métricas */}
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {u.uri ? (
                      <img
                        src={`${WIALON_IMG_BASE}${u.uri}`}
                        className="w-5 h-5 object-contain"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground uppercase leading-tight line-clamp-2">
                      {u.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-amber-600">
                        {formatMinutos(u.segundos * 1000)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {u.eventos} evento{u.eventos !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Vista Eventos */
          <div className="space-y-2">
            {historialFiltrado.map((r) => {
              const excesivo = r.duracion_segundos >= RALENTI_EXCESIVO_S;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors duration-150 overflow-hidden">
                  {/* Header: fecha y rango horario */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
                    <span className="text-xs text-muted-foreground capitalize">
                      {fmtFecha(r.inicio_ralenti)}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {fmtHora(r.inicio_ralenti)} → {fmtHora(r.fin_ralenti)}
                    </span>
                  </div>
                  {/* Body: ícono + nombre + métricas */}
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {uriPorUnitId[String(r.wialon_unit_id)] ? (
                        <img
                          src={`${WIALON_IMG_BASE}${uriPorUnitId[String(r.wialon_unit_id)]}`}
                          className="w-5 h-5 object-contain"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground uppercase leading-tight line-clamp-2">
                        {r.wialon_nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-amber-600">
                          {formatMinutos(r.duracion_segundos * 1000)}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                          excesivo
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                            : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                        }`}>
                          {excesivo ? "Excesivo" : "Normal"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
