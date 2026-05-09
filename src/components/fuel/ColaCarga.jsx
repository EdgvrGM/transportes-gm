import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO, addDays } from "date-fns";
import { Clock, CheckCircle2, Fuel, Truck, User, AlertCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ── Tarjeta individual con tilt CSS puro (mismo patrón que ProgramCard) ──
function PendingCard({ viaje, conductor, camion, cliente, handleRegistrar }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ cardX: 0, cardY: 0 });

  const handleMouseMove = (e) => {
    if (!isHovered) setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const cardX = -(y / (rect.height / 2)) * 2.5;
    const cardY = (x / (rect.width / 2)) * 2.5;
    setTilt({ cardX, cardY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ cardX: 0, cardY: 0 });
  };

  const transitionStyle = {
    transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
    transformStyle: "preserve-3d",
  };

  return (
    <div
      className="min-w-[300px] max-w-[300px] md:min-w-[340px] md:max-w-[340px] snap-center relative flex flex-col group cursor-default"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.cardX}deg) rotateY(${tilt.cardY}deg) scale(${isHovered ? 1.02 : 1})`,
        ...transitionStyle,
      }}
    >
      <div className="bg-card dark:bg-card border border-border dark:border-border/50 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col flex-1 transition-all">
        {/* Decorador Lateral */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />

        {/* Etiqueta Día */}
        <div className="absolute top-0 right-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-[1rem] border-b border-l border-blue-200 dark:border-blue-800/40 shadow-sm">
          {viaje.diaSemana}
        </div>

        <div className="mb-5 pr-14 mt-1">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-500" /> Destino
          </p>
          <p
            className="font-black text-xl text-slate-800 dark:text-slate-100 leading-tight truncate"
            title={viaje.destino || "Sin destino"}
          >
            {viaje.destino || "Sin destino"}
          </p>
          <p className="text-xs font-bold text-muted-foreground mt-1.5 truncate bg-muted/50 inline-block px-2 py-0.5 rounded-md">
            {cliente?.nombre || "Cliente no asignado"}
          </p>
        </div>

        <div className="space-y-2.5 mb-6 flex-1">
          <div className="flex items-center gap-3 bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/40 shadow-sm">
            <div className="bg-muted/40 dark:bg-muted/20 p-2 rounded-lg border border-border/40">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="truncate flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conductor</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate" title={conductor?.nombre || "N/A"}>
                {conductor?.nombre || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-muted/20 dark:bg-muted/10 p-3 rounded-xl border border-border/40 shadow-sm">
            <div className="bg-muted/40 dark:bg-muted/20 p-2 rounded-lg border border-border/40">
              <Truck className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="truncate flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidad</p>
              <p
                className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate"
                title={camion ? `${camion.nombre} (${camion.placas})` : "N/A"}
              >
                {camion ? `${camion.nombre} (${camion.placas})` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => handleRegistrar(viaje)}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/20 gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider"
        >
          <Fuel className="w-4 h-4" /> Registrar
        </Button>
      </div>
    </div>
  );
}

export default function ColaCarga() {
  const navigate = useNavigate();

  const { data: programas = [], isLoading: loadingProgramas } = useQuery({
    queryKey: ["programaCargas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ProgramaCargas")
        .select("*")
        .order("fecha_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: viajes = [], isLoading: loadingViajes } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data } = await supabase.from("Viaje").select("*");
      return data || [];
    },
  });

  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data } = await supabase.from("Conductor").select("*");
      return data || [];
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data } = await supabase.from("Camion").select("*");
      return data || [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("Cliente").select("*");
      return data || [];
    },
  });

  const getConductor = (id) => conductores.find((c) => String(c.id) === String(id));
  const getCamion = (id) => camiones.find((c) => String(c.id) === String(id));
  const getCliente = (id) => clientes.find((c) => String(c.id) === String(id));

  const { pendientes, registrados, programaActivo } = useMemo(() => {
    if (!programas.length) return { pendientes: [], registrados: [], programaActivo: null };

    const hoy = new Date();
    let activo = programas[0];
    for (const prog of programas) {
      const inicio = parseISO(prog.fecha_inicio);
      const fin = parseISO(prog.fecha_fin);
      if (hoy >= inicio && hoy <= addDays(fin, 1)) {
        activo = prog;
        break;
      }
    }

    if (!activo) return { pendientes: [], registrados: [], programaActivo: null };

    const fechaInicio = parseISO(activo.fecha_inicio);
    const flatProgramados = [];

    DIAS_SEMANA.forEach((dia, indexDia) => {
      const viajesDelDia = activo.programacion[dia] || [];
      const fechaViaje = addDays(fechaInicio, indexDia);
      const fechaStr = format(fechaViaje, "yyyy-MM-dd");
      viajesDelDia.forEach((v) => {
        flatProgramados.push({ ...v, fecha: fechaStr, fechaObj: fechaViaje, diaSemana: dia });
      });
    });

    const p = [];
    const r = [];

    flatProgramados.forEach((progViaje) => {
      const isRegistered = viajes.some((v) => {
        const matchFecha = v.fecha && v.fecha.startsWith(progViaje.fecha);
        const matchConductor = String(v.conductor_id) === String(progViaje.conductor);
        const matchCamion = String(v.camion_id) === String(progViaje.camion);
        return matchFecha && matchConductor && matchCamion;
      });

      if (isRegistered) r.push(progViaje);
      else p.push(progViaje);
    });

    p.sort((a, b) => a.fechaObj - b.fechaObj);

    return { pendientes: p, registrados: r, programaActivo: activo };
  }, [programas, viajes]);

  const handleRegistrar = (viaje) => {
    const conductor = getConductor(viaje.conductor);
    const camion = getCamion(viaje.camion);

    navigate(createPageUrl("FuelRegistrarViaje"), {
      state: {
        fecha: viaje.fecha,
        conductor_id: viaje.conductor,
        conductor_nombre: conductor ? conductor.nombre : "",
        camion_id: viaje.camion,
        camion_nombre: camion ? camion.nombre : "",
        camion_placas: camion ? camion.placas : "",
        destino: viaje.destino,
        tipo_viaje: viaje.modalidad || "Sencillo",
      },
    });
  };

  if (loadingProgramas || loadingViajes) {
    return <div className="animate-pulse h-[340px] bg-slate-100 dark:bg-zinc-900 rounded-[2rem] border border-border/50 mb-8 w-full shadow-sm" />;
  }

  if (!programaActivo) return null;

  return (
    <Card className="border-border shadow-xl hover:shadow-2xl transition-shadow bg-card mb-8 overflow-hidden rounded-[2rem] relative z-10">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />
      <CardHeader className="bg-muted/30 dark:bg-muted/10 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between pb-5 pt-6 px-6 md:px-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-card shadow-md border border-border/80 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Cola de Carga</CardTitle>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
              {programaActivo.titulo} • {format(parseISO(programaActivo.fecha_inicio), "dd MMM")} al {format(parseISO(programaActivo.fecha_fin), "dd MMM")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end w-full md:w-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 hidden md:block">
            Estado de la Semana
          </span>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full">
            <span className="flex-1 md:flex-none text-sm font-bold text-orange-600 bg-orange-100 border border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 px-3 py-1.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4" /> {pendientes.length} Pendientes
            </span>
            <span className="flex-1 md:flex-none text-sm font-bold text-green-700 bg-green-100 border border-green-200 dark:bg-green-500/10 dark:border-green-500/20 px-3 py-1.5 rounded-xl flex items-center justify-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4" /> {registrados.length} Registrados
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 bg-card">
        {pendientes.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 text-green-600 dark:text-green-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg shadow-green-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">¡Todo al día!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 max-w-sm">
              Todos los viajes programados de esta semana ya tienen su combustible registrado.
            </p>
          </div>
        ) : (
          <div className="flex overflow-x-auto p-6 md:p-8 pb-10 gap-5 snap-x scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {pendientes.map((viaje, i) => (
              <PendingCard
                key={i}
                viaje={viaje}
                conductor={getConductor(viaje.conductor)}
                camion={getCamion(viaje.camion)}
                cliente={getCliente(viaje.cliente)}
                handleRegistrar={handleRegistrar}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
