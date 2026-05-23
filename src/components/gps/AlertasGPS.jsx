import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { Bell, BellOff, Filter, CheckCheck, AlertTriangle, Clock, MapPin, Gauge } from "lucide-react";

const TIPOS = [
  { value: "",          label: "Todos los tipos" },
  { value: "velocidad", label: "Velocidad excesiva" },
  { value: "parada",    label: "Parada prolongada" },
  { value: "zona",      label: "Salida de zona" },
  { value: "ralenti",   label: "Ralentí excesivo" },
  { value: "geocerca",  label: "Geocerca" },
];

const TIPO_CONFIG = {
  velocidad: {
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
    label: "Velocidad",
  },
  parada: {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: Clock,
    label: "Parada",
  },
  zona: {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: MapPin,
    label: "Zona",
  },
  ralenti: {
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
    icon: Gauge,
    label: "Ralentí",
  },
  geocerca: {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: MapPin,
    label: "Geocerca",
  },
};

function mapearGeocerca(ev) {
  return {
    id:            ev.id,
    tipo:          "geocerca",
    wialon_nombre: ev.wialon_nombre,
    mensaje:       `${ev.wialon_nombre} ${ev.tipo === "entrada" ? "entró al patio" : "salió del patio"}`,
    leida:         ev.leida ?? false,
    created_at:    ev.created_at,
  };
}

async function fetchAlertas({ tipo, soloNoLeidas }) {
  if (tipo === "geocerca") {
    let q = supabase
      .from("EventoGeocerca")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (soloNoLeidas) q = q.eq("leida", false);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapearGeocerca);
  }

  if (tipo === "") {
    let qAlertas   = supabase.from("AlertaGPS").select("*").order("created_at", { ascending: false }).limit(50);
    let qGeocerca  = supabase.from("EventoGeocerca").select("*").order("created_at", { ascending: false }).limit(20);
    if (soloNoLeidas) {
      qAlertas  = qAlertas.eq("leida", false);
      qGeocerca = qGeocerca.eq("leida", false);
    }
    const [alertasRes, geocercaRes] = await Promise.all([qAlertas, qGeocerca]);
    if (alertasRes.error) throw alertasRes.error;

    const alertas   = alertasRes.data || [];
    const geocercas = (geocercaRes.data || []).map(mapearGeocerca);
    return [...alertas, ...geocercas]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
  }

  let q = supabase
    .from("AlertaGPS")
    .select("*")
    .eq("tipo", tipo)
    .order("created_at", { ascending: false })
    .limit(50);
  if (soloNoLeidas) q = q.eq("leida", false);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function fetchConteoNoLeidas() {
  const [alertasRes, geocercaRes] = await Promise.all([
    supabase.from("AlertaGPS").select("*", { count: "exact", head: true }).eq("leida", false),
    supabase.from("EventoGeocerca").select("*", { count: "exact", head: true }).eq("leida", false),
  ]);
  if (alertasRes.error) throw alertasRes.error;
  return (alertasRes.count || 0) + (geocercaRes.count || 0);
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

export default function AlertasGPS() {
  const queryClient = useQueryClient();
  const [tipo, setTipo]                 = useState("");
  const [soloNoLeidas, setSoloNoLeidas] = useState(true);

  useEffect(() => {
    const corte = new Date();
    corte.setDate(corte.getDate() - 10);
    supabase.from("AlertaGPS").delete().lt("created_at", corte.toISOString()).then(() => {});
  }, []);

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ["alertas-gps", tipo, soloNoLeidas],
    queryFn: () => fetchAlertas({ tipo, soloNoLeidas }),
    refetchInterval: 30000,
  });

  const { data: noLeidas = 0 } = useQuery({
    queryKey: ["alertas-gps-count"],
    queryFn: fetchConteoNoLeidas,
    refetchInterval: 30000,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["alertas-gps"] });
    queryClient.invalidateQueries({ queryKey: ["alertas-gps-count"] });
  };

  const marcarLeidaMutation = useMutation({
    mutationFn: async ({ id, tipo }) => {
      const tabla = tipo === "geocerca" ? "EventoGeocerca" : "AlertaGPS";
      const { error, count } = await supabase
        .from(tabla)
        .update({ leida: true }, { count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (count === 0) throw new Error(`Sin permiso para actualizar ${tabla}`);
    },
    onSuccess: invalidar,
    onError: (err) => console.error("[AlertasGPS] marcar leída:", err.message),
  });

  const marcarTodasMutation = useMutation({
    mutationFn: async () => {
      const [r1, r2] = await Promise.all([
        supabase.from("AlertaGPS").update({ leida: true }).eq("leida", false),
        supabase.from("EventoGeocerca").update({ leida: true }).eq("leida", false),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: invalidar,
  });

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            {noLeidas > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {noLeidas > 0
                ? `${noLeidas} alerta${noLeidas > 1 ? "s" : ""} sin leer`
                : "Todo al día"}
            </p>
            <p className="text-xs text-slate-400">
              {alertas.length} alertas en total · Actualiza cada 30s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por tipo */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Toggle solo no leídas */}
          <button
            onClick={() => setSoloNoLeidas((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              soloNoLeidas
                ? "bg-yellow-400 text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <BellOff className="w-3.5 h-3.5" />
            Solo no leídas
          </button>

          {/* Marcar todas leídas */}
          {noLeidas > 0 && (
            <button
              onClick={() => marcarTodasMutation.mutate()}
              disabled={marcarTodasMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            Cargando alertas...
          </div>
        ) : alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
            <Bell className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No hay alertas para los filtros seleccionados</p>
          </div>
        ) : (
          alertas.map((alerta) => {
            const cfg  = TIPO_CONFIG[alerta.tipo] ?? TIPO_CONFIG.velocidad;
            const Icon = cfg.icon;
            return (
              <div
                key={alerta.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  alerta.leida
                    ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
                    : `${cfg.bg} ${cfg.border}`
                }`}
              >
                {/* Icono */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  alerta.leida ? "bg-slate-100 dark:bg-slate-800" : cfg.bg
                }`}>
                  <Icon className={`w-4 h-4 ${alerta.leida ? "text-slate-400" : cfg.color}`} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      alerta.leida ? "text-slate-400" : cfg.color
                    }`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                      {alerta.wialon_nombre}
                    </span>
                    {!alerta.leida && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">
                    {alerta.mensaje}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {tiempoRelativo(alerta.created_at)}
                  </p>
                </div>

                {!alerta.leida && (
                  <button
                    onClick={() => marcarLeidaMutation.mutate({ id: alerta.id, tipo: alerta.tipo })}
                    disabled={marcarLeidaMutation.isPending}
                    title="Marcar como leída"
                    className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors shrink-0 disabled:opacity-50"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
