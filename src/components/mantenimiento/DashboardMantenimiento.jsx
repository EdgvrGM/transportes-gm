import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wrench, Clock, CheckCircle2, DollarSign, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ESTADOS = [
  { value: "abierta", label: "Abierta", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
  { value: "en_progreso", label: "En progreso", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { value: "en_espera", label: "En espera", className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-700 dark:border-yellow-800" },
  { value: "completada", label: "Completada", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
];

function estadoInfo(v) { return ESTADOS.find((e) => e.value === v) ?? ESTADOS[0]; }

function formatMXN(value) {
  if (value == null || value === "") return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function kmDesdeServicio(kmActuales, kmAlAbrir) {
  if (kmActuales == null || kmAlAbrir == null) return null;
  return kmActuales - kmAlAbrir;
}

function badgeFlota(kmDelta) {
  if (kmDelta == null) return { label: "Sin datos", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400" };
  if (kmDelta < 0) return { label: "Sin datos", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400" };
  if (kmDelta < 8000) return { label: "Al corriente", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300" };
  if (kmDelta < 10000) return { label: "Próximo", className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-700" };
  return { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300" };
}

export default function DashboardMantenimiento({ onVerOrdenes }) {
  const [wialonUnidades, setWialonUnidades] = useState([]);

  useEffect(() => {
    fetch("https://wialon-proxy.transportesgm.workers.dev?action=positions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWialonUnidades(data);
      })
      .catch(() => {});
  }, []);

  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ["ordenes-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("OrdenTrabajo")
        .select("*, Camion(id, nombre, placas), CatalogoServicio(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones-lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("id, nombre, placas");
      if (error) throw error;
      return data;
    },
  });

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split("T")[0];

  const otAbiertas = ordenes.filter((o) => ["abierta", "en_progreso", "en_espera"].includes(o.estado));
  const otEnTaller = ordenes.filter((o) => o.estado === "en_progreso");
  const otCompletadasMes = ordenes.filter(
    (o) => o.estado === "completada" && o.fecha_salida_real >= inicioMes
  );
  const gastoMes = otCompletadasMes.reduce((acc, o) => acc + (o.costo_total_real ?? 0), 0);

  const ultimasCompletadas = ordenes
    .filter((o) => o.estado === "completada" && o.fecha_salida_real)
    .slice(0, 5);

  const otActivasDestacadas = otAbiertas.slice(0, 5);

  // Estado de flota: last completed OT per camion
  const ultimaPorCamion = {};
  for (const o of ordenes) {
    if (o.estado === "completada" && o.camion_id) {
      if (!ultimaPorCamion[o.camion_id]) ultimaPorCamion[o.camion_id] = o;
    }
  }

  const wialonMap = {};
  for (const u of wialonUnidades) {
    wialonMap[u.id] = u;
  }

  // Match Wialon by camion_id via UnidadGPS
  const [wialonUnitIds, setWialonUnitIds] = useState({});
  useEffect(() => {
    supabase
      .from("UnidadGPS")
      .select("camion_id, wialon_unit_id")
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        for (const row of data) map[row.camion_id] = row.wialon_unit_id;
        setWialonUnitIds(map);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Wrench className="w-5 h-5 text-yellow-500" />}
          label="OTs abiertas"
          value={otAbiertas.length}
          sub="abierta / en espera / en progreso"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="En taller"
          value={otEnTaller.length}
          sub="estado en progreso"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          label="Completadas este mes"
          value={otCompletadasMes.length}
          sub={`desde ${formatFecha(inicioMes)}`}
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-purple-500" />}
          label="Gasto este mes"
          value={formatMXN(gastoMes)}
          sub="OTs completadas"
          valueClass="text-xl"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Estado de la flota */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">Estado de la flota</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Unidad</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Último servicio</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">KM actuales</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">KM desde servicio</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {camiones.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sin unidades</td>
                  </tr>
                )}
                {camiones.map((c) => {
                  const ultimaOT = ultimaPorCamion[c.id];
                  const wialonId = wialonUnitIds[c.id];
                  const wialon = wialonId != null ? wialonMap[wialonId] : null;
                  const kmActuales = wialon?.odometro ?? null;
                  const kmAbrir = ultimaOT?.km_al_abrir ?? null;
                  const delta = kmDesdeServicio(kmActuales, kmAbrir);
                  const badge = badgeFlota(delta);

                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {c.nombre}
                        {c.placas && <span className="ml-1 text-xs text-muted-foreground">({c.placas})</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ultimaOT
                          ? <>{ultimaOT.CatalogoServicio?.nombre ?? ultimaOT.tipo} <span className="text-xs">· {formatFecha(ultimaOT.fecha_salida_real)}</span></>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {kmActuales != null ? `${kmActuales.toLocaleString("es-MX")} km` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {delta != null && delta >= 0 ? `${delta.toLocaleString("es-MX")} km` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Panel derecho: últimas completadas + activas destacadas */}
        <div className="space-y-4">
          {/* Últimas 5 completadas */}
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Últimas 5 completadas</h2>
            </div>
            {ultimasCompletadas.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">Sin OTs completadas aún.</p>
            ) : (
              <ul className="divide-y divide-border">
                {ultimasCompletadas.map((o) => (
                  <li key={o.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {o.Camion?.nombre ?? "—"}
                        {o.Camion?.placas && <span className="ml-1 text-xs text-muted-foreground">({o.Camion.placas})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.CatalogoServicio?.nombre ?? o.tipo}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-sm text-foreground">{formatMXN(o.costo_total_real)}</p>
                      <p className="text-xs text-muted-foreground">{formatFecha(o.fecha_salida_real)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* OTs activas destacadas */}
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">OTs activas</h2>
              {otAbiertas.length > 0 && (
                <button
                  onClick={onVerOrdenes}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Ver todas <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            {otActivasDestacadas.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No hay OTs activas.</p>
            ) : (
              <ul className="divide-y divide-border">
                {otActivasDestacadas.map((o) => {
                  const estado = estadoInfo(o.estado);
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {o.Camion?.nombre ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.CatalogoServicio?.nombre ?? o.tipo} · #{o.numero}
                        </p>
                      </div>
                      <Badge variant="outline" className={`${estado.className} shrink-0`}>{estado.label}</Badge>
                      <Button size="sm" variant="outline" onClick={onVerOrdenes} className="shrink-0 h-7 text-xs">
                        Ver
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, valueClass = "text-2xl" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon}
        {label}
      </div>
      <p className={`font-bold text-foreground ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
