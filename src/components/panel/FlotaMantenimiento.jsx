import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Truck, ArrowUpRight, AlertTriangle, Settings, Wrench } from "lucide-react";
import { WIALON_PROXY_URL, POLL_POSITIONS_MS } from "@/components/gps/constants";
import { wialonFetch } from "@/lib/wialonFetch";

const INTERVALO_PROXIMO_KM = 1500;

async function fetchPositions(unidadesInactivas = []) {
  const exclude = unidadesInactivas.join(",");
  const url = exclude
    ? `${WIALON_PROXY_URL}?action=positions&exclude=${exclude}`
    : `${WIALON_PROXY_URL}?action=positions`;
  const r = await wialonFetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export default function FlotaMantenimiento() {
  const navigate = useNavigate();

  const { data: camiones = [] } = useQuery({
    queryKey: ["panel-camiones-flota"],
    queryFn: async () => {
      const { data } = await supabase.from("Camion").select("id, nombre, placas, estado");
      return data || [];
    },
  });

  const { data: ordenes = [] } = useQuery({
    queryKey: ["panel-ordenes-flota"],
    queryFn: async () => {
      const { data } = await supabase
        .from("OrdenTrabajo")
        .select("id, camion_id, estado, km_al_abrir, fecha_salida_real, CatalogoServicio(nombre, intervalo_km)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: unidadesGPS = [] } = useQuery({
    queryKey: ["panel-unidades-gps"],
    queryFn: async () => {
      const { data } = await supabase.from("UnidadGPS").select("camion_id, wialon_unit_id");
      return data || [];
    },
  });

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

  const { data: positions = [] } = useQuery({
    queryKey: ["panel-positions", unidadesInactivas],
    queryFn: () => fetchPositions(unidadesInactivas),
    refetchInterval: POLL_POSITIONS_MS,
    staleTime: POLL_POSITIONS_MS / 2,
  });

  const stats = useMemo(() => {
    const camionesEnTallerIds = new Set(
      ordenes.filter((o) => ["abierta", "en_progreso", "en_espera"].includes(o.estado)).map((o) => o.camion_id)
    );

    const inactivos = camiones.filter((c) => c.estado && c.estado !== "activo").length;
    const activos = camiones.filter((c) => !c.estado || c.estado === "activo");
    const enTaller = activos.filter((c) => camionesEnTallerIds.has(c.id)).length;
    const disponibles = activos.length - enTaller;

    const wialonByCamion = {};
    for (const u of unidadesGPS) {
      const pos = positions.find((p) => String(p.id) === String(u.wialon_unit_id));
      if (pos) wialonByCamion[u.camion_id] = pos;
    }

    const ultimaCompletadaPorCamion = {};
    for (const o of ordenes) {
      if (o.estado === "completada" && o.camion_id && !ultimaCompletadaPorCamion[o.camion_id]) {
        ultimaCompletadaPorCamion[o.camion_id] = o;
      }
    }

    const enServicio = activos.filter((c) => {
      const pos = wialonByCamion[c.id];
      return pos && pos.motor && (pos.velocidad || 0) > 5;
    }).length;

    const proximos = activos
      .map((c) => {
        const ultima = ultimaCompletadaPorCamion[c.id];
        const pos = wialonByCamion[c.id];
        if (!ultima || !pos || pos.odometro == null) return null;
        const intervalo = ultima.CatalogoServicio?.intervalo_km;
        if (!intervalo) return null;
        const kmDesde = pos.odometro - (ultima.km_al_abrir || 0);
        const kmFaltantes = intervalo - kmDesde;
        return {
          camion: c,
          servicio: ultima.CatalogoServicio?.nombre || "Servicio",
          kmFaltantes,
          intervalo,
        };
      })
      .filter((x) => x && x.kmFaltantes <= INTERVALO_PROXIMO_KM)
      .sort((a, b) => a.kmFaltantes - b.kmFaltantes)
      .slice(0, 2);

    return { disponibles, enServicio, enTaller, inactivos, proximos };
  }, [camiones, ordenes, unidadesGPS, positions]);

  const tieneProximos = stats.proximos.length > 0;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <Truck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Flota y mantenimiento</h2>
        </div>
        <button
          onClick={() => navigate(createPageUrl("Mantenimiento"))}
          className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400 flex items-center gap-1 transition"
        >
          Abrir mantenimiento <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disponibles</div>
          <div className="text-2xl font-black mt-1 text-foreground">{stats.disponibles}</div>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">En servicio</div>
          <div className="text-2xl font-black mt-1 text-green-500">{stats.enServicio}</div>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">En taller</div>
          <div className={`text-2xl font-black mt-1 ${stats.enTaller > 0 ? "text-orange-500" : "text-foreground"}`}>
            {stats.enTaller}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inactivas</div>
          <div className="text-2xl font-black mt-1 text-muted-foreground">{stats.inactivos}</div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Próximos servicios preventivos
        </div>
        {tieneProximos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.proximos.map((p, i) => {
              const urgente = p.kmFaltantes <= 500;
              const Icon = urgente ? AlertTriangle : Settings;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/40"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      urgente ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">
                      {p.camion.nombre} · {p.servicio}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Faltan{" "}
                      <span className={`font-bold ${urgente ? "text-orange-500" : "text-foreground"}`}>
                        {p.kmFaltantes.toLocaleString("es-MX")} km
                      </span>{" "}
                      (de {p.intervalo.toLocaleString("es-MX")})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="w-4 h-4" />
            Sin servicios preventivos próximos en los siguientes {INTERVALO_PROXIMO_KM.toLocaleString("es-MX")} km.
          </div>
        )}
      </div>
    </section>
  );
}
