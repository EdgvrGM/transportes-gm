import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO, addDays, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Navigation2, Clock3, ArrowRight } from "lucide-react";
import { WIALON_PROXY_URL, POLL_POSITIONS_MS } from "@/components/gps/constants";
import { estaEnPatio } from "./panelGeo";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function diaSemanaDe(date) {
  const idx = date.getDay();
  if (idx === 0) return null;
  return DIAS_SEMANA[idx - 1];
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function fetchPositions(unidadesInactivas = []) {
  const exclude = unidadesInactivas.join(",");
  const url = exclude
    ? `${WIALON_PROXY_URL}?action=positions&exclude=${exclude}`
    : `${WIALON_PROXY_URL}?action=positions`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export default function PulsoDia() {
  const navigate = useNavigate();
  const fechaHoy = useMemo(() => localDateStr(new Date()), []);

  const { data: programas = [] } = useQuery({
    queryKey: ["panel-programa-cargas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ProgramaCargas")
        .select("*")
        .order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: viajesReg = [] } = useQuery({
    queryKey: ["panel-viajes-reg-hoy", fechaHoy],
    queryFn: async () => {
      const { data } = await supabase
        .from("viajes_registrados")
        .select("conductor_id, camion_id, combustible_registrado")
        .eq("fecha_viaje", fechaHoy);
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

  const info = useMemo(() => {
    const hoy = new Date();
    const manana = addDays(hoy, 1);
    const diaHoy = diaSemanaDe(hoy);
    const diaManana = diaSemanaDe(manana);

    const programaHoy = programas.find((p) => {
      try {
        return isWithinInterval(hoy, { start: parseISO(p.fecha_inicio), end: parseISO(p.fecha_fin) });
      } catch {
        return false;
      }
    });

    const programadosHoy = diaHoy && programaHoy ? (programaHoy.programacion?.[diaHoy] || []) : [];
    const programadosManana = diaManana && programaHoy
      ? (programaHoy.programacion?.[diaManana] || [])
      : [];

    // camion_id → GPS position
    const wialonByCamion = {};
    for (const u of unidadesGPS) {
      const pos = positions.find((p) => String(p.id) === String(u.wialon_unit_id));
      if (pos) wialonByCamion[u.camion_id] = pos;
    }

    let ejecutados = 0;
    let enRuta = 0;
    let pendientes = 0;

    programadosHoy.forEach((pv) => {
      // 1. Combustible registrado → completado (definitivo)
      const reg = viajesReg.find(
        (r) =>
          String(r.conductor_id) === String(pv.conductor) &&
          String(r.camion_id) === String(pv.camion)
      );
      if (reg?.combustible_registrado) {
        ejecutados++;
        return;
      }

      // 2. GPS: camión en movimiento fuera del patio → en ruta
      const pos = wialonByCamion[pv.camion];
      if (pos && pos.motor && (pos.velocidad || 0) > 5 && !estaEnPatio(pos.lat, pos.lng)) {
        enRuta++;
        return;
      }

      // 3. Sin señal de salida ni de completado → pendiente
      pendientes++;
    });

    const total = programadosHoy.length;
    const porcentaje = total > 0 ? Math.round((ejecutados / total) * 100) : 0;

    return {
      diaHoy: format(hoy, "EEEE", { locale: es }),
      fechaHoyLabel: format(hoy, "dd MMM", { locale: es }),
      diaManana: format(manana, "EEEE", { locale: es }),
      total,
      ejecutados,
      enRuta,
      pendientes,
      porcentaje,
      mananaTotal: programadosManana.length,
    };
  }, [programas, viajesReg, unidadesGPS, positions]);

  const tieneDatos = info.total > 0;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
            <CalendarClock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold capitalize text-foreground">
            Hoy · {info.diaHoy}
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {info.fechaHoyLabel}
        </span>
      </div>

      {tieneDatos ? (
        <>
          <div className="mb-5">
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-4xl font-black text-foreground">
                {info.ejecutados}
                <span className="text-muted-foreground text-2xl">/{info.total}</span>
              </div>
              <div className="text-xs font-semibold text-muted-foreground">ejecutados</div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                style={{ width: `${info.porcentaje}%` }}
              />
            </div>
          </div>

          <div className="space-y-2.5 mb-5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-foreground">Completados</span>
              </div>
              <span className="font-black text-foreground">{info.ejecutados}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Navigation2 className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-foreground">En ruta ahora</span>
              </div>
              <span className="font-black text-foreground">{info.enRuta}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-foreground">Pendientes</span>
              </div>
              <span className={`font-black ${info.pendientes > 0 ? "text-orange-500" : "text-foreground"}`}>
                {info.pendientes}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="py-6 text-center">
          <div className="text-sm font-semibold text-muted-foreground">Sin viajes programados hoy</div>
          <p className="text-xs text-muted-foreground mt-1">
            No hay actividad en el programa para este día.
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Mañana · <span className="capitalize">{info.diaManana}</span>
          </div>
          <div className="text-sm font-bold mt-0.5 text-foreground">
            {info.mananaTotal} {info.mananaTotal === 1 ? "viaje programado" : "viajes programados"}
          </div>
        </div>
        <button
          onClick={() => navigate(createPageUrl("FuelProgramaCargas"))}
          className="text-xs font-bold uppercase tracking-wider text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400 flex items-center gap-1 transition"
        >
          Ver semana <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}
