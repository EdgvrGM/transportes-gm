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

// BUG 1 FIX: componente externo para evitar desmonte en cada render del padre
function PanelContent({
  activeTab, positions, vinculaciones, isLoading,
  selectedUnit, setSelectedUnit, setUnidadEnfocada, setBottomSheetState,
  setHistorialPuntos, setPuntoReproduccion, setReproduciendo, setIconoUnidad
}) {
  return (
    <>
      {activeTab === "envivo" && (
        <>
          <div className="p-3 border-b border-border shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Unidades en Vivo
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
                  onClick={() => {
                    setSelectedUnit(p);
                    setUnidadEnfocada(p);
                    if (window.innerWidth < 768) setBottomSheetState("medium");
                  }}
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
                          <span className="text-xs font-bold text-muted-foreground shrink-0">
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
      {activeTab === "alertas"     && <AlertasGPS />}
      {activeTab === "reportes"    && <ReportesGPS />}
      {activeTab === "compartidos" && <CompartidosGPS positions={positions} />}
    </>
  );
}

export default function RastreoGPS() {
  const [selectedUnit,      setSelectedUnit]      = useState(null);
  const [activeTab,         setActiveTab]         = useState("envivo");
  const [showConfig,        setShowConfig]        = useState(false);
  // "closed" | "medium" | "expanded"
  const [bottomSheetState,  setBottomSheetState]  = useState("closed");

  /* ── Queries ─────────────────────────────────────────────────────────── */
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
    queryFn:  () => fetchPositions(unidadesInactivas),
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

  // Conteo de alertas no leídas
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

  // Conteo de links compartidos activos
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

  const [historialPuntos,    setHistorialPuntos]    = useState([]);
  const [puntoReproduccion,  setPuntoReproduccion]  = useState(null);
  const [reproduciendo,      setReproduciendo]      = useState(false);
  const [iconoUnidad,        setIconoUnidad]        = useState(null);
  const [unidadEnfocada,     setUnidadEnfocada]     = useState(null);

  /* ── Tab definitions ─────────────────────────────────────────────────── */
  const tabs = [
    { id: "envivo",      label: "En vivo",     icon: Navigation },
    { id: "historial",   label: "Historial",   icon: MapPin },
    { id: "alertas",     label: "Alertas",     icon: Bell,   badge: alertasNoLeidas,   badgeColor: "bg-red-500"   },
    { id: "reportes",    label: "Reportes",    icon: Settings },
    { id: "compartidos", label: "Compartidos", icon: Share2, badge: conteoCompartidos, badgeColor: "bg-green-600" },
  ];

  const panelProps = {
    activeTab, positions, vinculaciones, isLoading,
    selectedUnit, setSelectedUnit, setUnidadEnfocada, setBottomSheetState,
    setHistorialPuntos, setPuntoReproduccion, setReproduciendo, setIconoUnidad,
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col overflow-hidden relative">

      {/* ═══════════════════════════════════════════════════════════════════
          BARRA SUPERIOR
          Desktop : tabs + controles
          Móvil   : solo controles (tabs van en bottom-nav)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="h-10 hidden md:flex items-stretch bg-card border-b border-border shrink-0 z-30">

        {/* Pestañas — solo visible en md+ */}
        <div className="hidden md:flex items-stretch overflow-x-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
          {tabs.map((t) => {
            const Icon   = t.icon;
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
                    <span className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 ${t.badgeColor ?? "bg-red-500"} text-white text-[9px] font-bold rounded-full flex items-center justify-center`}>
                      {t.badge > 9 ? "9+" : t.badge}
                    </span>
                  )}
                </div>
                <span className="shrink-0">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controles — empujados a la derecha en desktop, full-width en móvil */}
        <div className="ml-auto flex items-center">
          <div className="flex items-center gap-1.5 px-3 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            15s
          </div>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => refetch()}
            className="flex items-center justify-center w-10 h-10 text-muted-foreground hover:text-foreground transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 px-3 h-10 text-xs font-medium text-yellow-600 bg-gm-primary/10 border-l border-gm-primary/40 hover:bg-gm-primary/20 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configurar</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CUERPO PRINCIPAL
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">

        {/* Panel lateral — solo en md+ */}
        <div className="hidden md:flex md:w-64 shrink-0 border-r border-border overflow-y-auto bg-card flex-col">
          <PanelContent {...panelProps} />
        </div>

        {/* Mapa — ocupa el 100% en móvil */}
        <div className="flex-1 h-full w-full overflow-hidden" style={{ zIndex: 0 }}>
          <MapaGPS
            positions={positions}
            vinculaciones={vinculaciones}
            onMarkerClick={(unit) => {
              setSelectedUnit(unit);
              if (window.innerWidth < 768) setBottomSheetState("medium");
            }}
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

        {/* ── Bottom Sheet (móvil) ─────────────────────────────────────── */}
        <div
          className={`
            fixed left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border
            rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.15)]
            transition-all duration-300 ease-in-out z-40 md:hidden flex flex-col overflow-hidden
            ${bottomSheetState === "closed"
              ? "translate-y-full pointer-events-none opacity-0"
              : "translate-y-0"}
            ${bottomSheetState === "medium"   ? "bottom-16 h-[40vh]" : ""}
            ${bottomSheetState === "expanded" ? "bottom-16 h-[85vh]" : ""}
          `}
        >
          {/* Handle */}
          <div
            className="w-full flex justify-center py-3 cursor-pointer select-none shrink-0"
            onClick={() => setBottomSheetState(bottomSheetState === "medium" ? "expanded" : "medium")}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Sheet header */}
          <div className="w-full flex items-center justify-between px-4 pb-2 border-b border-border/40 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setBottomSheetState(bottomSheetState === "medium" ? "expanded" : "medium")}
                className="text-[10px] text-yellow-600 bg-yellow-500/10 px-2.5 py-1 rounded-lg font-bold hover:bg-yellow-500/20 transition-all"
              >
                {bottomSheetState === "medium" ? "Expandir" : "Contraer"}
              </button>
              <button
                onClick={() => setBottomSheetState("closed")}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Sheet content — BUG 2 FIX: flex column con min-h-0 para que h-full de HistorialGPS no colapse */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <PanelContent {...panelProps} />
          </div>
        </div>

        {/* ── Bottom Navigation (móvil) ────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2">
          {tabs.map((t) => {
            const Icon   = t.icon;
            const active = activeTab === t.id && bottomSheetState !== "closed";
            return (
              <button
                key={t.id}
                onClick={() => {
                  // BUG 3 FIX: abrir directo en "expanded" para tabs que necesitan más espacio
                  const tabsExpandidos = ["historial", "alertas", "reportes", "compartidos"];
                  if (bottomSheetState === "closed") {
                    setBottomSheetState(tabsExpandidos.includes(t.id) ? "expanded" : "medium");
                  } else if (activeTab === t.id) {
                    setBottomSheetState("closed");
                  } else if (tabsExpandidos.includes(t.id)) {
                    setBottomSheetState("expanded");
                  }
                  setActiveTab(t.id);
                }}
                className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative ${
                  active
                    ? "text-yellow-500 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {t.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 px-1 min-w-[14px] h-[14px] ${t.badgeColor ?? "bg-red-500"} text-white text-[8px] font-bold rounded-full flex items-center justify-center`}>
                      {t.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] truncate max-w-full">{t.label}</span>
              </button>
            );
          })}
        </div>

      </div>{/* end body */}

      {/* Modal de configuración */}
      <ModalConfiguracion open={showConfig} onClose={() => setShowConfig(false)} />

    </div>/* end root */
  );
}
