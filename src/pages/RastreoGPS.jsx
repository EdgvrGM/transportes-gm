import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import MapaGPS from "@/components/gps/MapaGPS";
import ModalConfiguracion from "@/components/gps/ModalConfiguracion";
import HistorialGPS from "@/components/gps/HistorialGPS";
import AlertasGPS from "@/components/gps/AlertasGPS";
import ReportesGPS from "@/components/gps/ReportesGPS";
import CompartidosGPS from "@/components/gps/CompartidosGPS";
import { MapPin, Navigation, Bell, Settings, RefreshCw, Settings2, Share2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";
const WIALON_IMG_BASE  = "https://hst-api.wialon.com";

async function fetchPositions(unidadesInactivas = []) {
  const exclude = unidadesInactivas.join(",");
  const url = exclude
    ? `${WIALON_PROXY_URL}?action=positions&exclude=${exclude}`
    : `${WIALON_PROXY_URL}?action=positions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al obtener posiciones");
  return res.json();
}

export default function RastreoGPS() {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeTab, setActiveTab] = useState("envivo");
  const [showConfig, setShowConfig] = useState(false);

  const { data: unidadesInactivas = [] } = useQuery({
    queryKey: ["unidades-inactivas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("UnidadGPS")
        .select("wialon_unit_id")
        .eq("activo", false);
      return (data || []).map((u) => u.wialon_unit_id);
    },
  });

  const { data: positions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gps-positions", unidadesInactivas],
    queryFn: () => fetchPositions(unidadesInactivas),
    refetchInterval: 15000,
    enabled: true,
  });

  // Rastro: guarda últimas 10 posiciones por unidad
  const RASTRO_MAX = 10;
  const historialRastroRef = useRef({});
  const [historialRastro, setHistorialRastro] = useState({});

  useEffect(() => {
    if (positions.length === 0) return;
    const nuevo = { ...historialRastroRef.current };
    positions.forEach((p) => {
      if (p.lat === 0 && p.lng === 0) return;
      const prev  = nuevo[p.id] || [];
      const ultima = prev[prev.length - 1];
      if (!ultima || ultima.lat !== p.lat || ultima.lng !== p.lng) {
        nuevo[p.id] = [...prev, { lat: p.lat, lng: p.lng }].slice(-RASTRO_MAX);
      }
    });
    historialRastroRef.current = nuevo;
    setHistorialRastro(nuevo);
  }, [positions]);

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

  // Conteo de links compartidos activos para el badge del tab
  const { data: conteoCompartidos = 0 } = useQuery({
    queryKey: ["rastreo-compartido-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("RastreoCompartido")
        .select("*", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString());
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  // Mapa rápido: wialon_unit_id → { nombre, placas }
  const vinculaciones = useMemo(() => {
    const map = {};
    unidadesGPS.forEach((u) => {
      if (u.Camion) map[u.wialon_unit_id] = u.Camion;
    });
    return map;
  }, [unidadesGPS]);

  const [historialPuntos, setHistorialPuntos] = useState([]);
  const [puntoReproduccion, setPuntoReproduccion] = useState(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [iconoUnidad, setIconoUnidad] = useState(null);
  const [unidadEnfocada, setUnidadEnfocada] = useState(null);

  const tabs = [
    { id: "envivo",       label: "En vivo",      icon: Navigation },
    { id: "historial",    label: "Historial",    icon: MapPin },
    { id: "alertas",      label: "Alertas",      icon: Bell,    badge: alertasNoLeidas,   badgeColor: "bg-red-500" },
    { id: "reportes",     label: "Reportes",     icon: Settings },
    { id: "compartidos",  label: "Compartidos",  icon: Share2,  badge: conteoCompartidos, badgeColor: "bg-green-600" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Barra única: tabs + controles */}
      <div className="h-10 flex items-stretch bg-card border-b border-border shrink-0">
        {/* Tabs */}
        <div className="flex items-stretch overflow-x-auto select-none max-w-[calc(100%-120px)] md:max-w-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 text-sm transition-colors relative border-b-2 shrink-0 ${
                  active
                    ? "border-gm-primary text-yellow-500 font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                  {t.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 ${t.badgeColor ?? "bg-red-500"} text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0`}>
                      {t.badge > 9 ? "9+" : t.badge}
                    </span>
                  )}
                </div>
                <span className="shrink-0">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controles — empujados a la derecha */}
        <div className="ml-auto flex items-center">
          {/* Indicador de actualización */}
          <div className="flex items-center gap-1.5 px-3 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            15s
          </div>

          {/* Divisor */}
          <div className="w-px h-5 bg-border" />

          {/* Actualizar */}
          <button
            onClick={() => refetch()}
            className="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-foreground transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          {/* Divisor */}
          <div className="w-px h-5 bg-border" />

          {/* Configurar */}
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 px-3 h-10 text-xs font-medium text-yellow-600 bg-gm-primary/10 border-l border-gm-primary/40 hover:bg-gm-primary/20 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configurar</span>
          </button>
        </div>
      </div>

      {/* Cuerpo: panel lateral + mapa siempre montado */}
      <div className="flex-1 flex flex-col md:flex-row w-full min-h-0 overflow-hidden">
        {/* Panel lateral — contenido según tab */}
        <div className="w-full h-[35vh] md:w-64 md:h-full shrink-0 border-t md:border-t-0 md:border-r border-border overflow-y-auto bg-card flex flex-col order-last md:order-first">
          {activeTab === "envivo" && (
            <>
              <div className="p-3 border-b border-border shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Unidades
                </h3>
              </div>
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Cargando...</div>
              ) : (
                positions.map((p) => {
                  const camion = vinculaciones[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedUnit(p); setUnidadEnfocada(p); }}
                      className={`w-full text-left p-3 border-b border-border/50 hover:bg-accent transition-colors shrink-0 ${
                        selectedUnit?.id === p.id ? "bg-gm-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                          {p.uri
                            ? <img
                                src={`${WIALON_IMG_BASE}${p.uri}`}
                                style={{ width: 28, height: 28, objectFit: "contain" }}
                                onError={(e) => { e.target.style.display = "none"; }}
                              />
                            : <span style={{ fontSize: 20 }}>🚚</span>
                          }
                        </div>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: p.motor ? "#22c55e" : "#94a3b8" }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-foreground truncate uppercase">
                              {camion ? camion.nombre : p.nombre.split(" ")[0]}
                            </span>
                            {camion?.placas && (
                              <span className="text-sm font-bold text-muted-foreground shrink-0">
                                {camion.placas}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.velocidad} km/h · {p.motor ? "En movimiento" : "Detenido"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}
          {activeTab === "historial" && (
            <HistorialGPS
              positions={positions}
              onHistorialCargado={setHistorialPuntos}
              onPuntoActivo={setPuntoReproduccion}
              onReproduciendo={setReproduciendo}
              onIconoUnidad={setIconoUnidad}
            />
          )}
          {activeTab === "alertas" && <AlertasGPS />}
          {activeTab === "reportes" && <ReportesGPS />}
          {activeTab === "compartidos" && <CompartidosGPS positions={positions} />}
        </div>

        {/* Mapa siempre montado */}
        <div className="flex-1 overflow-hidden" style={{ zIndex: 0 }}>
          <MapaGPS
            positions={positions}
            vinculaciones={vinculaciones}
            onMarkerClick={setSelectedUnit}
            historialRastro={historialRastro}
            historialPuntos={historialPuntos}
            puntoReproduccion={puntoReproduccion}
            reproduciendo={reproduciendo}
            iconoUnidad={iconoUnidad}
            tabActivo={activeTab}
            unidadEnfocada={unidadEnfocada}
            onEnfocado={() => setUnidadEnfocada(null)}
          />
        </div>
      </div>

      {/* Modal de configuración */}
      <ModalConfiguracion open={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
}
