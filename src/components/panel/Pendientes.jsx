import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInDays, parseISO } from "date-fns";
import { Inbox, Fuel, Link2, Wrench, FileWarning, ChevronRight, Check, Container } from "lucide-react";

const FECHA_LIMITE_ARCHIVO = "2026-04-24";

function PendingRow({ icon: Icon, iconBg, iconColor, title, subtitle, count, onClick, accentColor }) {
  const empty = count === 0;
  return (
    <li>
      <button
        onClick={empty ? undefined : onClick}
        disabled={empty}
        className={`w-full flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg transition text-left ${
          empty ? "opacity-40 cursor-default" : "hover:bg-muted/40"
        }`}
      >
        <div className={`w-10 h-10 rounded-lg ${empty ? "bg-muted" : iconBg} ${empty ? "text-muted-foreground" : iconColor} flex items-center justify-center shrink-0`}>
          {empty ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground truncate">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`text-2xl font-black ${empty ? "text-muted-foreground" : accentColor}`}>{count}</div>
          {!empty && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
    </li>
  );
}

export default function Pendientes() {
  const navigate = useNavigate();

  const { data: viajes = [] } = useQuery({
    queryKey: ["panel-pendientes-viajes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("Viaje")
        .select("id, fecha, conductor_id, camion_id, remolque_id, litros_combustible, viaje_registrado_id")
        .gte("fecha", FECHA_LIMITE_ARCHIVO);
      return data || [];
    },
  });

  const { data: programas = [] } = useQuery({
    queryKey: ["panel-programa-cargas"],
    queryFn: async () => {
      const { data } = await supabase.from("ProgramaCargas").select("*").order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: ordenes = [] } = useQuery({
    queryKey: ["panel-ordenes"],
    queryFn: async () => {
      const { data } = await supabase.from("OrdenTrabajo").select("id, estado");
      return data || [];
    },
  });

  const { data: conductoresDoc = [] } = useQuery({
    queryKey: ["panel-conductores-doc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("Conductor")
        .select("id, nombre, estado, venc_licencia, venc_apto_medico");
      return data || [];
    },
  });

  const { data: camionesDoc = [] } = useQuery({
    queryKey: ["panel-camiones-doc"],
    queryFn: async () => {
      const { data } = await supabase
        .from("Camion")
        .select("id, nombre, placas, venc_fisicomecanica, venc_contaminantes, venc_poliza_seguro");
      return data || [];
    },
  });

  const { data: vaciosPend = [] } = useQuery({
    queryKey: ["panel-vacios-pendientes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contenedores_vacios")
        .select("id, numero_contenedor, fecha_carga")
        .eq("estatus", "pendiente_vacio");
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const sinCombustible = viajes.filter((v) => !v.litros_combustible || parseFloat(v.litros_combustible) <= 0);

    const flatProgramados = [];
    programas.forEach((prog) => {
      const programacion = prog.programacion || {};
      Object.values(programacion).forEach((dias) => {
        if (Array.isArray(dias)) {
          dias.forEach((pv) => flatProgramados.push(pv));
        }
      });
    });

    const sinVincular = viajes.filter((v) => {
      if (v.viaje_registrado_id) return false;
      const tieneMatch = flatProgramados.some(
        (pv) =>
          String(pv.conductor) === String(v.conductor_id) &&
          String(pv.camion) === String(v.camion_id)
      );
      return !tieneMatch;
    });

    const otAbiertas = ordenes.filter((o) => ["abierta", "en_progreso", "en_espera"].includes(o.estado));

    const docsVencer = [];
    const hoy = new Date();
    const checkDoc = (fechaStr, ref) => {
      if (!fechaStr) return;
      try {
        const d = differenceInDays(parseISO(fechaStr), hoy);
        if (d >= 0 && d <= 30) docsVencer.push({ ...ref, dias: d });
      } catch (_e) {
        // fecha inválida — ignorar
      }
    };

    conductoresDoc
      .filter((c) => c.estado === "activo")
      .forEach((c) => {
        checkDoc(c.venc_licencia, { tipo: "Licencia", nombre: c.nombre, fecha: c.venc_licencia });
        checkDoc(c.venc_apto_medico, { tipo: "Apto médico", nombre: c.nombre, fecha: c.venc_apto_medico });
      });

    camionesDoc.forEach((c) => {
      checkDoc(c.venc_fisicomecanica, { tipo: "Físico-mecánica", nombre: c.nombre, fecha: c.venc_fisicomecanica });
      checkDoc(c.venc_contaminantes, { tipo: "Contaminantes", nombre: c.nombre, fecha: c.venc_contaminantes });
      checkDoc(c.venc_poliza_seguro, { tipo: "Póliza", nombre: c.nombre, fecha: c.venc_poliza_seguro });
    });

    docsVencer.sort((a, b) => a.dias - b.dias);
    const docMasUrgente = docsVencer[0];

    const fechaMasAntigua = sinCombustible
      .map((v) => v.fecha)
      .filter(Boolean)
      .sort()[0];

    const diasDesdeMasAntiguo = fechaMasAntigua
      ? differenceInDays(hoy, parseISO(fechaMasAntigua))
      : null;

    const otEnProgreso = ordenes.filter((o) => o.estado === "en_progreso").length;
    const otEnEspera = ordenes.filter((o) => o.estado === "en_espera").length;
    const otSinAsignar = ordenes.filter((o) => o.estado === "abierta").length;

    const vacioFechaMasAntigua = vaciosPend
      .map((v) => v.fecha_carga)
      .filter(Boolean)
      .sort()[0];
    const vacioContMasAntiguo = vacioFechaMasAntigua
      ? vaciosPend.find((v) => v.fecha_carga === vacioFechaMasAntigua)
      : null;
    const diasVacioMasAntiguo = vacioFechaMasAntigua
      ? differenceInDays(hoy, parseISO(vacioFechaMasAntigua))
      : null;

    return {
      sinCombustible: sinCombustible.length,
      sinCombustibleSubtitle: fechaMasAntigua
        ? `Más antiguo: ${fechaMasAntigua} · ${diasDesdeMasAntiguo} días sin capturar`
        : "Todos los viajes con combustible registrado",
      sinVincular: sinVincular.length,
      sinVincularSubtitle:
        sinVincular.length > 0
          ? "No coinciden por conductor + camión con ningún programa"
          : "Todos los viajes están vinculados",
      otAbiertas: otAbiertas.length,
      otSubtitle:
        otAbiertas.length > 0
          ? `${otEnProgreso} en progreso · ${otEnEspera} en espera · ${otSinAsignar} sin asignar`
          : "Sin órdenes pendientes",
      docsCount: docsVencer.length,
      docsSubtitle: docMasUrgente
        ? `${docMasUrgente.nombre} · ${docMasUrgente.tipo} en ${docMasUrgente.dias}d`
        : "Sin documentos próximos a vencer",
      vaciosCount: vaciosPend.length,
      vaciosSubtitle: vaciosPend.length > 0
        ? `${vaciosPend.length} contenedor${vaciosPend.length !== 1 ? "es" : ""} pendiente${vaciosPend.length !== 1 ? "s" : ""}`
        : "Sin contenedores pendientes",
    };
  }, [viajes, programas, ordenes, conductoresDoc, camionesDoc, vaciosPend]);

  const total = stats.sinCombustible + stats.sinVincular + stats.otAbiertas + stats.docsCount + stats.vaciosCount;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
            <Inbox className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Pendientes con acción</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {total === 0 ? "todo al día" : `${total} requieren atención`}
        </span>
      </div>

      <ul className="divide-y divide-border">
        <PendingRow
          icon={Container}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          accentColor="text-amber-500"
          title="Contenedores pendientes de entrega"
          subtitle={stats.vaciosSubtitle}
          count={stats.vaciosCount}
          onClick={() => navigate(createPageUrl("ControlVacios"))}
        />
        <PendingRow
          icon={Fuel}
          iconBg="bg-orange-500/10"
          iconColor="text-orange-500"
          accentColor="text-orange-500"
          title="Viajes sin combustible registrado"
          subtitle={stats.sinCombustibleSubtitle}
          count={stats.sinCombustible}
          onClick={() => navigate(createPageUrl("FuelViajes"))}
        />
        <PendingRow
          icon={Link2}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
          accentColor="text-purple-500"
          title="Viajes sin vincular al programa"
          subtitle={stats.sinVincularSubtitle}
          count={stats.sinVincular}
          onClick={() => navigate(createPageUrl("FuelViajes"))}
        />
        <PendingRow
          icon={Wrench}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          accentColor="text-blue-500"
          title="Órdenes de trabajo abiertas"
          subtitle={stats.otSubtitle}
          count={stats.otAbiertas}
          onClick={() => navigate(createPageUrl("Mantenimiento"))}
        />
        <PendingRow
          icon={FileWarning}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
          accentColor="text-rose-500"
          title="Documentos por vencer (≤30 días)"
          subtitle={stats.docsSubtitle}
          count={stats.docsCount}
          onClick={() => navigate(createPageUrl("DocumentacionLegal"))}
        />
      </ul>
    </section>
  );
}
