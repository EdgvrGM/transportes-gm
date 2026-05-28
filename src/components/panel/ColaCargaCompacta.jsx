import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO, addDays } from "date-fns";
import { ListChecks, AlertCircle, CheckCircle2, Fuel, Edit3, ArrowRight, Sparkles } from "lucide-react";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIA_CORTO = { Lunes: "Lun", Martes: "Mar", Miércoles: "Mié", Jueves: "Jue", Viernes: "Vie", Sábado: "Sáb" };

const MAX_VISIBLES = 5;

export default function ColaCargaCompacta() {
  const navigate = useNavigate();
  const [expandido, setExpandido] = useState(false);

  const { data: programas = [], isLoading: loadingProgramas } = useQuery({
    queryKey: ["panel-programa-cargas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ProgramaCargas")
        .select("*")
        .order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: viajes = [], isLoading: loadingViajes } = useQuery({
    queryKey: ["panel-viajes"],
    queryFn: async () => {
      const { data } = await supabase.from("Viaje").select("id, fecha, conductor_id, camion_id, remolque_id, litros_combustible, casetas_ida, casetas_regreso");
      return data || [];
    },
  });

  const { data: conductores = [] } = useQuery({
    queryKey: ["panel-conductores"],
    queryFn: async () => {
      const { data } = await supabase.from("Conductor").select("id, nombre");
      return data || [];
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["panel-camiones"],
    queryFn: async () => {
      const { data } = await supabase.from("Camion").select("id, nombre, placas");
      return data || [];
    },
  });

  const getConductor = (id) => conductores.find((c) => String(c.id) === String(id));
  const getCamion = (id) => camiones.find((c) => String(c.id) === String(id));

  const { pendientes, registrados, programaActivo } = useMemo(() => {
    if (!programas.length) return { pendientes: [], registrados: [], programaActivo: null };

    const programasOrdenados = [...programas].sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

    for (const prog of programasOrdenados) {
      const fechaInicio = parseISO(prog.fecha_inicio);
      const flat = [];
      DIAS_SEMANA.forEach((dia, idx) => {
        const dViajes = (prog.programacion || {})[dia] || [];
        const fechaViaje = addDays(fechaInicio, idx);
        const fechaStr = format(fechaViaje, "yyyy-MM-dd");
        dViajes.forEach((v) => flat.push({ ...v, fecha: fechaStr, fechaObj: fechaViaje, diaSemana: dia }));
      });

      const p = [], r = [];
      flat.forEach((pv) => {
        const match = viajes.find(
          (v) =>
            v.fecha &&
            v.fecha.startsWith(pv.fecha) &&
            String(v.conductor_id) === String(pv.conductor) &&
            String(v.camion_id) === String(pv.camion) &&
            (!pv.remolque || !v.remolque_id || String(v.remolque_id) === String(pv.remolque))
        );
        if (match) {
          const hasFuel = parseFloat(match.litros_combustible || 0) > 0;
          const hasTolls = match.casetas_ida !== null && match.casetas_regreso !== null;
          if (hasFuel && hasTolls) r.push(pv);
          else p.push({ ...pv, isPartial: true, executionRecord: match });
        } else {
          p.push({ ...pv, isPartial: false });
        }
      });

      if (p.length > 0) {
        p.sort((a, b) => a.fechaObj - b.fechaObj);
        return { pendientes: p, registrados: r, programaActivo: prog };
      }
    }

    // Sin pendientes: usar la semana más reciente para metadata
    const masReciente = programasOrdenados[programasOrdenados.length - 1];
    return { pendientes: [], registrados: [], programaActivo: masReciente };
  }, [programas, viajes]);

  const handleRegistrar = (viaje) => {
    if (viaje.isPartial && viaje.executionRecord) {
      navigate(createPageUrl("FuelViajes"), { state: { editId: viaje.executionRecord.id } });
      return;
    }
    const conductor = getConductor(viaje.conductor);
    const camion = getCamion(viaje.camion);
    navigate(createPageUrl("FuelRegistrarViaje"), {
      state: {
        fecha: viaje.fecha,
        conductor_id: viaje.conductor,
        conductor_nombre: conductor?.nombre || "",
        camion_id: viaje.camion,
        camion_nombre: camion?.nombre || "",
        camion_placas: camion?.placas || "",
        destino: viaje.destino,
        tipo_viaje: viaje.modalidad || "Sencillo",
      },
    });
  };

  if (loadingProgramas || loadingViajes) {
    return <div className="h-[180px] bg-card border border-border rounded-2xl animate-pulse" />;
  }

  if (!programaActivo) return null;

  const visibles = expandido ? pendientes : pendientes.slice(0, MAX_VISIBLES);
  const restantes = pendientes.length - visibles.length;

  return (
    <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Cola de carga</h2>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
              {programaActivo.titulo ? `${programaActivo.titulo} · ` : ""}
              {format(parseISO(programaActivo.fecha_inicio), "dd MMM")} al {format(parseISO(programaActivo.fecha_fin), "dd MMM")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5" /> {pendientes.length} pendientes
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {registrados.length} registrados
          </span>
        </div>
      </header>

      {pendientes.length === 0 ? (
        <div className="px-6 py-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-foreground">¡Todo al día!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Todos los viajes programados ya tienen su combustible registrado.
          </p>
        </div>
      ) : (
        <ul>
          {visibles.map((viaje, i) => {
            const conductor = getConductor(viaje.conductor);
            const camion = getCamion(viaje.camion);
            const diaCorto = DIA_CORTO[viaje.diaSemana] || viaje.diaSemana?.slice(0, 3);
            const numDia = format(viaje.fechaObj, "dd");

            return (
              <li
                key={`${viaje.fecha}-${viaje.conductor}-${viaje.camion}-${i}`}
                className={`flex items-center gap-3 px-5 md:px-6 py-3 transition border-l-2 hover:bg-muted/30 ${
                  i > 0 ? "border-t border-border" : ""
                } ${viaje.isPartial ? "border-l-orange-500" : "border-l-blue-500"}`}
              >
                <div className="w-12 text-center shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {diaCorto}
                  </div>
                  <div className="text-sm font-black text-foreground">{numDia}</div>
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destino</div>
                    <div className="text-sm font-bold truncate text-foreground flex items-center gap-1.5">
                      {viaje.destino || "Sin destino"}
                      {viaje.isPartial && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 uppercase tracking-wider shrink-0">
                          Incompleto
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conductor</div>
                    <div className="text-sm font-bold truncate text-foreground">{conductor?.nombre || "N/A"}</div>
                  </div>
                  <div className="min-w-0 hidden md:block">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unidad</div>
                    <div className="text-sm font-bold truncate text-foreground">
                      {camion ? `${camion.nombre}${camion.placas ? ` · ${camion.placas}` : ""}` : "N/A"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRegistrar(viaje)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm ${
                    viaje.isPartial
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-gm-primary text-zinc-900 hover:brightness-110"
                  }`}
                >
                  {viaje.isPartial ? (
                    <>
                      <Edit3 className="w-3.5 h-3.5" /> Completar
                    </>
                  ) : (
                    <>
                      <Fuel className="w-3.5 h-3.5" /> Registrar
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 md:px-6 py-3 border-t border-border flex items-center justify-between">
        {restantes > 0 ? (
          <button
            onClick={() => setExpandido(true)}
            className="text-xs font-bold uppercase tracking-wider text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400 transition"
          >
            Ver {restantes} más
          </button>
        ) : expandido && pendientes.length > MAX_VISIBLES ? (
          <button
            onClick={() => setExpandido(false)}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
          >
            Ver menos
          </button>
        ) : (
          <a
            href={createPageUrl("FuelProgramaCargas")}
            onClick={(e) => { e.preventDefault(); navigate(createPageUrl("FuelProgramaCargas")); }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition"
          >
            Ver programa completo <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {pendientes.length + registrados.length} viajes esta semana
        </span>
      </div>
    </section>
  );
}
