import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import MapaGPS from "@/components/gps/MapaGPS";
import ModalConfiguracion from "@/components/gps/ModalConfiguracion";
import HistorialGPS from "@/components/gps/HistorialGPS";
import AlertasGPS from "@/components/gps/AlertasGPS";
import ReportesGPS from "@/components/gps/ReportesGPS";
import { MapPin, Navigation, Bell, Settings, RefreshCw, Settings2 } from "lucide-react";

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";

async function fetchPositions() {
  const res = await fetch(`${WIALON_PROXY_URL}?action=positions`);
  if (!res.ok) throw new Error("Error al obtener posiciones");
  return res.json();
}

export default function RastreoGPS() {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeTab, setActiveTab] = useState("envivo");
  const [showConfig, setShowConfig] = useState(false);

  const { data: positions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gps-positions"],
    queryFn: fetchPositions,
    refetchInterval: 15000,
  });

  // Vinculaciones UnidadGPS → Camion
  const { data: unidadesGPS = [] } = useQuery({
    queryKey: ["unidades-gps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("UnidadGPS")
        .select("wialon_unit_id, camion_id, Camion(nombre, placas)")
        .eq("activo", true);
      if (error) throw error;
      return data;
    },
  });

  // Conteo de alertas no leídas para el badge del tab
  const { data: alertasNoLeidas = 0 } = useQuery({
    queryKey: ["alertas-gps-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("AlertaGPS")
        .select("*", { count: "exact", head: true })
        .eq("leida", false);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Mapa rápido: wialon_unit_id → { nombre, placas }
  const vinculaciones = useMemo(() => {
    const map = {};
    unidadesGPS.forEach((u) => {
      if (u.Camion) map[u.wialon_unit_id] = u.Camion;
    });
    return map;
  }, [unidadesGPS]);

  const tabs = [
    { id: "envivo",    label: "En vivo",   icon: Navigation },
    { id: "historial", label: "Historial", icon: MapPin },
    { id: "alertas",   label: "Alertas",   icon: Bell, badge: alertasNoLeidas },
    { id: "reportes",  label: "Reportes",  icon: Settings },
  ];

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rastreo GPS</h1>
          <p className="text-sm text-slate-500">
            {positions.length} unidades · Actualización cada 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-sm font-semibold transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Configurar
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Cuerpo: panel lateral + mapa */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Panel lateral de unidades */}
        <div className="w-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-y-auto hidden md:block">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Unidades
            </h3>
          </div>
          {isLoading ? (
            <div className="p-4 text-sm text-slate-400">Cargando...</div>
          ) : (
            positions.map((p) => {
              const camion = vinculaciones[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedUnit(p)}
                  className={`w-full text-left p-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    selectedUnit?.id === p.id ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: p.motor ? "#22c55e" : "#94a3b8" }}
                    />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {camion ? camion.nombre : p.nombre}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 ml-4 space-y-0.5">
                    <div>{p.velocidad} km/h · {p.motor ? "En movimiento" : "Detenido"}</div>
                    {camion?.placas && (
                      <div className="font-mono">{camion.placas}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Mapa */}
        <div className="flex-1 min-h-0">
          {activeTab === "envivo" && (
            <MapaGPS
              positions={positions}
              vinculaciones={vinculaciones}
              onMarkerClick={setSelectedUnit}
            />
          )}
          {activeTab === "historial" && (
            <HistorialGPS vinculaciones={vinculaciones} />
          )}
          {activeTab === "alertas" && (
            <AlertasGPS />
          )}
          {activeTab === "reportes" && (
            <ReportesGPS />
          )}
        </div>
      </div>

      {/* Tabs inferiores */}
      <div className="flex gap-1 mt-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === t.id
                  ? "bg-yellow-400 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {t.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modal de configuración */}
      <ModalConfiguracion open={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
}
