import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import MapaGPS from "@/components/gps/MapaGPS";
import ModalConfiguracion from "@/components/gps/ModalConfiguracion";
import HistorialGPS from "@/components/gps/HistorialGPS";
import AlertasGPS from "@/components/gps/AlertasGPS";
import ReportesGPS from "@/components/gps/ReportesGPS";
import CompartidosGPS from "@/components/gps/CompartidosGPS";
import { MapPin, Navigation, Bell, Settings, RefreshCw, Settings2, Share2, Copy, Check, ShieldCheck, Gauge } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PanelCompartir from "@/components/gps/PanelCompartir";
import GeocercaGPS from "@/components/gps/GeocercaGPS";
import RalentiGPS from "@/components/gps/RalentiGPS";
import {
  WIALON_PROXY_URL, WIALON_IMG_BASE, RALENTI_UMBRAL_MS,
  RASTRO_MAX, POLL_POSITIONS_MS, POLL_ALERTAS_MS, estaEnRalenti,
} from "@/components/gps/constants";

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
  activeTab, positions, vinculaciones, isLoading, positionsError,
  selectedUnit, setSelectedUnit, setUnidadEnfocada, setBottomSheetState,
  setHistorialPuntos, setPuntoReproduccion, setReproduciendo, setIconoUnidad,
  setPanelCompartirUnidad, ralentiActivo, refetch,
}) {
  const [copiedId, setCopiedId] = useState(null);

  const copiarCoordenadas = (e, p) => {
    e.stopPropagation();
    const texto = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <>
      {activeTab === "envivo" && (
        <>
          <div className="p-3 border-b border-border shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Unidades en Vivo
            </h3>
          </div>
          {positionsError ? (
            <div className="p-4 space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">No se pudieron obtener las posiciones. Verifica tu conexión.</p>
              <button
                onClick={() => refetch?.()}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
            {positions.map((p) => {
              const camion      = vinculaciones[p.id];
              const enRalenti   = estaEnRalenti(p);
              const textoEstado = enRalenti
                ? "Ralentí"
                : p.motor
                  ? `${p.velocidad} km/h · En movimiento`
                  : "Motor apagado";
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedUnit(p);
                    setUnidadEnfocada(p);
                    if (window.innerWidth < 768) setBottomSheetState("medium");
                  }}
                  className={`group w-full text-left p-3 border-b border-border/50 hover:bg-accent transition-colors shrink-0 flex items-center ${
                    selectedUnit?.id === p.id ? "bg-gm-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      {p.uri
                        ? <img
                            alt={p.nombre}
                            src={`${WIALON_IMG_BASE}${p.uri}`}
                            style={{ width: 28, height: 28, objectFit: "contain" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        : <span style={{ fontSize: 20 }}>🚚</span>
                      }
                    </div>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: enRalenti ? "#EAB308" : p.motor ? "#22c55e" : "#94a3b8" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground uppercase truncate leading-tight">
                        {camion ? camion.nombre : p.nombre.split(" ")[0]}
                      </p>
                      {camion?.placas && (
                        <p className="text-xs font-bold text-muted-foreground leading-tight">
                          {camion.placas}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                        {textoEstado}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => copiarCoordenadas(e, p)}
                      title="Copiar coordenadas"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      {copiedId === p.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPanelCompartirUnidad(p); }}
                      title="Compartir rastreo"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-yellow-600 hover:bg-gm-primary/10 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              );
            })}
            </div>
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
      {activeTab === "geocerca"    && <GeocercaGPS positions={positions} />}
      {activeTab === "ralenti"    && <RalentiGPS positions={positions} ralentiActivo={ralentiActivo} />}
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

  const { data: positions = [], isLoading, refetch, isFetching, error: positionsError } = useQuery({
    queryKey: ["gps-positions", unidadesInactivas],
    queryFn:  () => fetchPositions(unidadesInactivas),
    refetchInterval: POLL_POSITIONS_MS,
    enabled: true,
  });

  // Rastro: guarda últimas N posiciones por unidad
  const historialRastroRef = useRef({});
  const [historialRastro, setHistorialRastro] = useState({});

  useEffect(() => {
    if (positions.length === 0) return;
    const prevState = historialRastroRef.current;
    const nuevo = { ...prevState };
    let cambio = false;
    positions.forEach((p) => {
      if (p.lat === 0 && p.lng === 0) return;
      const prev  = nuevo[p.id] || [];
      const ultima = prev[prev.length - 1];
      if (!ultima || ultima.lat !== p.lat || ultima.lng !== p.lng) {
        nuevo[p.id] = [...prev, { lat: p.lat, lng: p.lng }].slice(-RASTRO_MAX);
        cambio = true;
      }
    });
    if (!cambio) return;
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

  // Ralentí activo desde Supabase (persiste entre sesiones)
  const { data: ralentiActivo = [] } = useQuery({
    queryKey: ["ralenti-activo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("RalentiActivo").select("*");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: POLL_POSITIONS_MS,
  });

  const ralentiActivoMap = useMemo(() => {
    const map = {};
    ralentiActivo.forEach((r) => {
      map[String(r.wialon_unit_id)] = new Date(r.inicio_ralenti).getTime();
    });
    return map;
  }, [ralentiActivo]);

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
    refetchInterval: POLL_ALERTAS_MS,
  });

  const { data: eventosGeocercaHoy = 0 } = useQuery({
    queryKey: ["geocerca-count"],
    queryFn: async () => {
      const hoy = new Date().toISOString().split("T")[0];
      const { count, error } = await supabase
        .from("EventoGeocerca")
        .select("*", { count: "exact", head: true })
        .gte("created_at", hoy);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: POLL_ALERTAS_MS,
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

  const [historialPuntos,       setHistorialPuntos]       = useState([]);
  const [puntoReproduccion,     setPuntoReproduccion]     = useState(null);
  const [reproduciendo,         setReproduciendo]         = useState(false);
  const [iconoUnidad,           setIconoUnidad]           = useState(null);
  const [unidadEnfocada,        setUnidadEnfocada]        = useState(null);
  const [panelCompartirUnidad,  setPanelCompartirUnidad]  = useState(null);

  const ralentiExcesivoCount = Object.entries(ralentiActivoMap)
    .filter(([, inicio]) => Date.now() - inicio >= RALENTI_UMBRAL_MS).length;

  /* ── Tab definitions ─────────────────────────────────────────────────── */
  const tabs = [
    { id: "envivo",      label: "En vivo",     icon: Navigation },
    { id: "historial",   label: "Historial",   icon: MapPin },
    { id: "alertas",     label: "Alertas",     icon: Bell,        badge: alertasNoLeidas,      badgeColor: "bg-red-500"    },
    { id: "reportes",    label: "Reportes",    icon: Settings },
    { id: "compartidos", label: "Compartidos", icon: Share2,      badge: conteoCompartidos,    badgeColor: "bg-green-600"  },
    { id: "geocerca",    label: "Geocerca",    icon: ShieldCheck, badge: eventosGeocercaHoy,   badgeColor: "bg-blue-500"   },
    { id: "ralenti",     label: "Ralentí",     icon: Gauge,       badge: ralentiExcesivoCount, badgeColor: "bg-orange-500" },
  ];

  const panelProps = {
    activeTab, positions, vinculaciones, isLoading, positionsError, refetch,
    selectedUnit, setSelectedUnit, setUnidadEnfocada, setBottomSheetState,
    setHistorialPuntos, setPuntoReproduccion, setReproduciendo, setIconoUnidad,
    setPanelCompartirUnidad, ralentiActivo: ralentiActivoMap,
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

        {/* FAB Configurar — solo móvil */}
        <button
          onClick={() => setShowConfig(true)}
          className="md:hidden fixed top-32 right-3 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-gm-primary text-slate-900 shadow-lg hover:bg-yellow-400 active:scale-95 transition-all"
          title="Configurar unidades"
        >
          <Settings2 className="w-4 h-4" />
        </button>

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
            ${bottomSheetState === "expanded" ? "bottom-16 h-[calc(100vh-8rem)]" : ""}
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
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center overflow-x-auto z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const Icon   = t.icon;
            const active = activeTab === t.id && bottomSheetState !== "closed";
            return (
              <button
                key={t.id}
                onClick={() => {
                  const tabsExpandidos = ["historial", "alertas", "reportes", "compartidos", "geocerca", "ralenti"];
                  if (bottomSheetState === "closed") {
                    setBottomSheetState(tabsExpandidos.includes(t.id) ? "expanded" : "medium");
                  } else if (activeTab !== t.id) {
                    if (tabsExpandidos.includes(t.id)) setBottomSheetState("expanded");
                  }
                  setActiveTab(t.id);
                }}
                className={`flex flex-col items-center justify-center gap-1 min-w-[72px] h-full transition-colors relative shrink-0 ${
                  active
                    ? "text-yellow-500 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {t.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 px-1 min-w-[14px] h-[14px] ${t.badgeColor ?? "bg-red-500"} text-white text-[8px] font-bold rounded-full flex items-center justify-center`}>
                      {t.badge > 9 ? "9+" : t.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] truncate max-w-full">{t.label}</span>
              </button>
            );
          })}
        </div>

      </div>{/* end body */}

      {/* Dialog compartir rastreo desde la lista */}
      <Dialog
        open={!!panelCompartirUnidad}
        onOpenChange={(open) => !open && setPanelCompartirUnidad(null)}
      >
        <DialogContent className="max-w-xs p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Compartir rastreo</DialogTitle>
          </DialogHeader>
          {panelCompartirUnidad && (
            <PanelCompartir
              unidad={panelCompartirUnidad}
              onClose={() => setPanelCompartirUnidad(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de configuración */}
      <ModalConfiguracion open={showConfig} onClose={() => setShowConfig(false)} />

    </div>/* end root */
  );
}
