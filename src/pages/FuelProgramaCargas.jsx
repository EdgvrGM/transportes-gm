import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  MapPin,
  User,
  Truck,
  Package,
  Briefcase,
  Eye,
  Fuel,
  CheckCircle2,
} from "lucide-react";
import { format, addDays, parseISO, getISOWeek } from "date-fns";
import { es } from "date-fns/locale";
import { TrailerIcon } from "./Layout";

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const PLANTILLA_VACIA = DIAS_SEMANA.reduce(
  (acc, dia) => ({ ...acc, [dia]: [] }),
  {},
);

const ProgramCard = ({ prog, onVer, totalViajes }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({
    cardX: 0,
    cardY: 0,
    bubbleX: 0,
    bubbleY: 0,
  });

  const handleMouseMove = (e) => {
    if (!isHovered) setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const cardX = -(y / (rect.height / 2)) * 2.5;
    const cardY = (x / (rect.width / 2)) * 2.5;
    const bubbleX = -(y / (rect.height / 2)) * 3.5;
    const bubbleY = (x / (rect.width / 2)) * 3.5;
    setTilt({ cardX, cardY, bubbleX, bubbleY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ cardX: 0, cardY: 0, bubbleX: 0, bubbleY: 0 });
  };

  const transitionStyle = {
    transition: isHovered
      ? "transform 0.1s ease-out"
      : "transform 0.5s ease-out",
    transformStyle: "preserve-3d",
  };

  return (
    <div
      className="relative h-full w-full z-0 cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onVer(prog)}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.cardX}deg) rotateY(${tilt.cardY}deg) scale(${isHovered ? 1.02 : 1})`,
        ...transitionStyle,
      }}
    >
      <Card className="relative border border-slate-200 dark:border-zinc-800 shadow-md hover:shadow-2xl hover:shadow-primary/10 bg-white dark:bg-zinc-950 rounded-[1.5rem] overflow-hidden flex flex-col h-full z-10 pointer-events-auto">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-20" />
        <CardHeader
          className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-6 pb-5 relative overflow-hidden z-10"
          style={{ transform: "translateZ(20px)", ...transitionStyle }}
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />
          <div className="space-y-1.5 text-center relative z-10 py-4">
            <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors duration-300">
              {prog.titulo || "Sin Título"}
            </CardTitle>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {format(parseISO(prog.fecha_inicio), "dd MMM", { locale: es })} -{" "}
              {format(parseISO(prog.fecha_fin), "dd MMM", { locale: es })},{" "}
              {format(parseISO(prog.fecha_inicio), "yyyy")}
            </p>
          </div>
        </CardHeader>
        <CardContent
          className="p-8 flex flex-col items-center justify-center relative bg-white dark:bg-zinc-950 flex-1 z-10"
          style={{ transform: "translateZ(10px)" }}
        >
          <div
            className="relative w-20 h-20 flex items-center justify-center z-20"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-[0_8px_16px_rgb(59,130,246,0.3)] z-10 border border-blue-400/30"
              style={{
                transform: `perspective(600px) rotateX(${tilt.bubbleX}deg) rotateY(${tilt.bubbleY}deg) scale(${isHovered ? 1.1 : 1})`,
                ...transitionStyle,
              }}
            >
              <span
                className="text-3xl font-black text-white pointer-events-none drop-shadow-md"
                style={{ transform: "translateZ(20px)" }}
              >
                {totalViajes}
              </span>
            </div>
            <div
              className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:animate-ping duration-1000 pointer-events-none"
              style={{ animationDuration: "2s" }}
            />
          </div>
          <p className="mt-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-blue-500 transition-colors duration-300 text-center">
            Viajes Registrados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default function FuelProgramaCargas() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogVerAbierto, setDialogVerAbierto] = useState(false);
  const [semanaAEliminar, setSemanaAEliminar] = useState(null);
  const [programaSeleccionado, setProgramaSeleccionado] = useState(null);
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [diaVerActivo, setDiaVerActivo] = useState("Lunes");
  const [dialogConsumoAbierto, setDialogConsumoAbierto] = useState(false);
  const [viajeConsumoSeleccionado, setViajeConsumoSeleccionado] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    titulo: "",
    fecha_inicio: "",
    fecha_fin: "",
    programacion: JSON.parse(JSON.stringify(PLANTILLA_VACIA)),
  });

  const { data: programas = [], isLoading } = useQuery({
    queryKey: ["programaCargas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ProgramaCargas")
        .select("*")
        .order("fecha_inicio", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("Cliente")
        .select("*")
        .order("nombre");
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
  const { data: remolques = [] } = useQuery({
    queryKey: ["remolques"],
    queryFn: async () => {
      const { data } = await supabase.from("Remolque").select("*");
      return data || [];
    },
  });

  const { data: viajes = [] } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data } = await supabase.from("Viaje").select("*");
      return data || [];
    },
  });

  const guardarMutation = useMutation({
    mutationFn: async (datos) => {
      const payload = {
        titulo: datos.titulo,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        programacion: datos.programacion,
      };
      if (datos.id) {
        const { error } = await supabase
          .from("ProgramaCargas")
          .update(payload)
          .eq("id", datos.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ProgramaCargas")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programaCargas"] });
      setDialogAbierto(false);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("ProgramaCargas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programaCargas"] });
      setSemanaAEliminar(null);
      setDialogVerAbierto(false);
    },
  });

  const abrirDialogNueva = () => {
    setErrorMsg(null);
    setFormData({
      id: null,
      titulo: "",
      fecha_inicio: "",
      fecha_fin: "",
      programacion: JSON.parse(JSON.stringify(PLANTILLA_VACIA)),
    });
    setDiaActivo("Lunes");
    setDialogAbierto(true);
  };

  const abrirDialogEditar = (programa) => {
    setErrorMsg(null);
    setFormData({
      ...programa,
      programacion:
        programa.programacion || JSON.parse(JSON.stringify(PLANTILLA_VACIA)),
    });
    setDiaActivo("Lunes");
    setDialogVerAbierto(false);
    setDialogAbierto(true);
  };

  const abrirDialogVer = (programa) => {
    setProgramaSeleccionado(programa);
    const primerDia =
      DIAS_SEMANA.find((dia) => programa.programacion[dia]?.length > 0) ||
      "Lunes";
    setDiaVerActivo(primerDia);
    setDialogVerAbierto(true);
  };

  const handleFechaInicio = (e) => {
    const fInicio = e.target.value;
    if (fInicio) {
      const start = parseISO(fInicio);
      const end = addDays(start, 5);
      setFormData({
        ...formData,
        fecha_inicio: fInicio,
        fecha_fin: format(end, "yyyy-MM-dd"),
        titulo: `Semana ${getISOWeek(start)}`,
      });
    }
  };

  const agregarViaje = () => {
    const nuevosViajes = [
      ...formData.programacion[diaActivo],
      {
        id: Date.now().toString(),
        cliente: "",
        destino: "",
        conductor: "",
        camion: "",
        modalidad: "Sencillo",
        remolque: "",
        remolque2: "",
      },
    ];
    setFormData({
      ...formData,
      programacion: { ...formData.programacion, [diaActivo]: nuevosViajes },
    });
  };

  const actualizarViaje = (index, campo, valor) => {
    const nuevosViajes = [...formData.programacion[diaActivo]];
    nuevosViajes[index][campo] = valor;
    setFormData({
      ...formData,
      programacion: { ...formData.programacion, [diaActivo]: nuevosViajes },
    });
  };

  const eliminarViaje = (index) => {
    const nuevosViajes = formData.programacion[diaActivo].filter(
      (_, i) => i !== index,
    );
    setFormData({
      ...formData,
      programacion: { ...formData.programacion, [diaActivo]: nuevosViajes },
    });
  };

  const getClienteName = (id) =>
    clientes.find((c) => String(c.id) === String(id))?.nombre || id || "N/A";
  const getConductorName = (id) =>
    conductores.find((c) => String(c.id) === String(id))?.nombre || "N/A";
  const getCamionName = (id) => {
    const c = camiones.find((c) => String(c.id) === String(id));
    return c ? `${c.nombre} (${c.placas})` : "N/A";
  };
  const getAbreviacionTipo = (tipo) => {
    if (!tipo) return "";
    const t = tipo.toLowerCase();
    if (t.includes("seca")) return "CS";
    if (t.includes("chasis") || t.includes("contenedor")) return "CH";
    if (t.includes("plataforma")) return "PT";
    return "";
  };

  const getRemolquePlacas = (id) => {
    const r = remolques.find((r) => String(r.id) === String(id));
    if (!r) return "N/A";
    const abv = getAbreviacionTipo(r.tipo);
    return abv ? `[${abv}] ${r.placas}` : r.placas;
  };

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return "";
    return format(parseISO(fechaStr), "dd/MM/yyyy");
  };

  const handleRegistrarCombustible = (viaje) => {
    const diasMap = {
      "Lunes": 0, "Martes": 1, "Miércoles": 2, "Jueves": 3, "Viernes": 4, "Sábado": 5
    };
    const indexDia = diasMap[diaVerActivo] || 0;
    const fechaInicio = parseISO(programaSeleccionado.fecha_inicio);
    const fechaViaje = addDays(fechaInicio, indexDia);
    
    const conductor = conductores.find(c => String(c.id) === String(viaje.conductor));
    const camion = camiones.find(c => String(c.id) === String(viaje.camion));

    navigate(createPageUrl("FuelRegistrarViaje"), {
      state: {
        fecha: format(fechaViaje, "yyyy-MM-dd"),
        conductor_id: viaje.conductor,
        conductor_nombre: conductor ? conductor.nombre : "",
        camion_id: viaje.camion,
        camion_nombre: camion ? camion.nombre : "",
        camion_placas: camion ? camion.placas : "",
        destino: viaje.destino,
        tipo_viaje: viaje.modalidad || "Sencillo"
      }
    });
  };

  const getRegisteredTrip = (viajeProgramado, diaActivo) => {
    if (!programaSeleccionado) return null;
    const diasMap = { "Lunes": 0, "Martes": 1, "Miércoles": 2, "Jueves": 3, "Viernes": 4, "Sábado": 5 };
    const indexDia = diasMap[diaActivo] || 0;
    const fechaInicio = parseISO(programaSeleccionado.fecha_inicio);
    const fechaViaje = addDays(fechaInicio, indexDia);
    const fechaStr = format(fechaViaje, "yyyy-MM-dd");

    return viajes.find((v) => {
      const matchFecha = v.fecha && v.fecha.startsWith(fechaStr);
      const matchConductor = String(v.conductor_id) === String(viajeProgramado.conductor);
      const matchCamion = String(v.camion_id) === String(viajeProgramado.camion);
      return matchFecha && matchConductor && matchCamion;
    });
  };

  const getEficienciaColor = (kmPorLitro) => {
    if (!kmPorLitro) return "text-slate-400";
    if (kmPorLitro > 2.25) return "text-green-600 dark:text-green-400";
    if (kmPorLitro >= 2.0) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight text-nowrap">
              Programa de Cargas
            </h1>
            <p className="text-muted-foreground">
              Gestiona la programación semanal.
            </p>
          </div>
          <Button
            onClick={abrirDialogNueva}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl gap-2 px-6 h-12 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5" /> Nueva Semana
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {programas.map((prog) => (
            <ProgramCard
              key={prog.id}
              prog={prog}
              onVer={abrirDialogVer}
              totalViajes={Object.values(prog.programacion).reduce(
                (acc, v) => acc + (v?.length || 0),
                0,
              )}
            />
          ))}
        </div>

        {/* --- MODAL DETALLES --- */}
        <Dialog open={dialogVerAbierto} onOpenChange={setDialogVerAbierto}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border rounded-[2rem] shadow-2xl">
            <DialogHeader className="px-8 py-6 bg-card border-b border-border shrink-0 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black">
                  {programaSeleccionado?.titulo}
                </DialogTitle>
                <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {formatearFechaDisplay(programaSeleccionado?.fecha_inicio)} al{" "}
                  {formatearFechaDisplay(programaSeleccionado?.fecha_fin)}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-2"
                  onClick={() => abrirDialogEditar(programaSeleccionado)}
                >
                  <Edit className="w-4 h-4" /> Editar Semana
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl font-bold text-red-500 hover:bg-red-50 gap-2"
                  onClick={() => setSemanaAEliminar(programaSeleccionado?.id)}
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex p-1.5 bg-card border border-border shadow-sm rounded-2xl overflow-x-auto hide-scrollbar shrink-0">
                {DIAS_SEMANA.map((dia) => (
                  <button
                    key={dia}
                    onClick={() => setDiaVerActivo(dia)}
                    className={`flex-1 min-w-[100px] py-3 px-4 text-xs font-bold uppercase rounded-xl transition-all ${diaVerActivo === dia ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {dia}{" "}
                    <span className="ml-1 opacity-50">
                      ({programaSeleccionado?.programacion[dia]?.length || 0})
                    </span>
                  </button>
                ))}
              </div>
              <div className="border border-border/60 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-sm">
                {(programaSeleccionado?.programacion[diaVerActivo] || []).map(
                  (viaje, idx, arr) => (
                    <div
                      key={idx}
                      className={`p-4 md:px-6 md:py-5 grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-x-6 gap-y-4 items-center hover:bg-slate-50 transition-colors ${idx !== arr.length - 1 ? "border-b border-border/60" : ""}`}
                    >
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          <Briefcase className="w-3 h-3 inline mr-1" /> Cliente
                        </p>
                        <p className="text-sm font-semibold">
                          {getClienteName(viaje.cliente)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          <MapPin className="w-3 h-3 inline mr-1 text-red-500" />{" "}
                          Destino
                        </p>
                        <p className="text-sm font-semibold">
                          {viaje.destino || "-"}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          <User className="w-3 h-3 inline mr-1" /> Chofer
                        </p>
                        <p className="text-sm font-semibold">
                          {getConductorName(viaje.conductor)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          <Truck className="w-3 h-3 inline mr-1" /> Unidad
                        </p>
                        <p className="text-sm font-semibold">
                          {getCamionName(viaje.camion)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          Modalidad
                        </p>
                        <p className="text-sm font-semibold">
                          <span className={`px-2 py-0.5 rounded-md text-xs ${viaje.modalidad === 'FULL' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {viaje.modalidad || 'Sencillo'}
                          </span>
                        </p>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          <TrailerIcon className="w-3 h-3 inline mr-1" />{" "}
                          Remolque 1
                        </p>
                        <p className="text-sm font-semibold">
                          {getRemolquePlacas(viaje.remolque)}
                        </p>
                      </div>
                      {viaje.modalidad === "FULL" && (
                        <div className="flex-1 min-w-[120px]">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                            <TrailerIcon className="w-3 h-3 inline mr-1" />{" "}
                            Remolque 2
                          </p>
                          <p className="text-sm font-semibold">
                            {getRemolquePlacas(viaje.remolque2)}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end items-center col-span-2 md:col-span-3 lg:ml-auto pt-2 lg:pt-0">
                        {(() => {
                          const registeredViaje = getRegisteredTrip(viaje, diaVerActivo);
                          if (registeredViaje) {
                            return (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setViajeConsumoSeleccionado(registeredViaje);
                                  setDialogConsumoAbierto(true);
                                }}
                                className="w-full md:w-auto h-9 gap-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 hover:border-green-300 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400 dark:hover:bg-green-900/50"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="md:hidden lg:inline text-[10px] font-bold uppercase tracking-widest">Ver Consumo</span>
                              </Button>
                            );
                          }
                          return (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRegistrarCombustible(viaje)}
                              className="w-full md:w-9 h-9 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-300 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-950/50"
                              title="Registrar Combustible"
                            >
                              <Fuel className="w-4 h-4" />
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="px-8 py-5 bg-card border-t border-border flex justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogVerAbierto(false)}
                className="rounded-xl font-bold h-10 px-8"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- MODAL EDITAR / CREAR --- */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border rounded-[2rem] shadow-2xl">
            <DialogHeader className="px-8 py-6 bg-card border-b border-border">
              <DialogTitle className="text-2xl font-black">
                {formData.id ? "Editar Programación" : "Nueva Semana"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs uppercase font-bold tracking-widest">
                Configuración de fechas y logística
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="bg-card p-6 rounded-[1.5rem] border border-border grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Fecha Inicio (Lunes)
                  </Label>
                  <Input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={handleFechaInicio}
                    className="h-11 rounded-xl bg-slate-50 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Fecha Fin
                  </Label>
                  <Input
                    type="date"
                    value={formData.fecha_fin}
                    readOnly
                    className="h-11 rounded-xl bg-muted/50 border-dashed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Título de la Semana
                  </Label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="flex p-1.5 bg-card border border-border shadow-sm rounded-2xl overflow-x-auto hide-scrollbar">
                {DIAS_SEMANA.map((dia) => (
                  <button
                    key={dia}
                    onClick={() => setDiaActivo(dia)}
                    className={`flex-1 min-w-[100px] py-3 px-4 text-xs font-bold uppercase rounded-xl transition-all ${diaActivo === dia ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {dia}{" "}
                    <span className="ml-1 opacity-50">
                      ({formData.programacion[dia]?.length || 0})
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="border border-border/60 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-sm">
                  {formData.programacion[diaActivo].map((viaje, index, arr) => (
                    <div
                      key={viaje.id}
                      className={`p-4 md:px-6 md:py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end hover:bg-slate-50 transition-colors ${index !== arr.length - 1 ? "border-b border-border/60" : ""}`}
                    >
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground text-nowrap">
                          Cliente
                        </Label>
                        <Select
                          value={viaje.cliente}
                          onValueChange={(v) =>
                            actualizarViaje(index, "cliente", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-medium">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Destino
                        </Label>
                        <Input
                          value={viaje.destino}
                          onChange={(e) =>
                            actualizarViaje(index, "destino", e.target.value)
                          }
                          className="h-11 rounded-xl bg-slate-50 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Chofer
                        </Label>
                        <Select
                          value={viaje.conductor}
                          onValueChange={(v) =>
                            actualizarViaje(index, "conductor", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-medium">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            {conductores.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground text-nowrap">
                          Unidad
                        </Label>
                        <Select
                          value={viaje.camion}
                          onValueChange={(v) =>
                            actualizarViaje(index, "camion", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-medium">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            {camiones.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nombre} - {c.placas}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground text-nowrap">
                          Modalidad
                        </Label>
                        <Select
                          value={viaje.modalidad || "Sencillo"}
                          onValueChange={(v) => {
                            actualizarViaje(index, "modalidad", v);
                            if (v === "Sencillo") actualizarViaje(index, "remolque2", "");
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-medium border-purple-200">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sencillo">Sencillo</SelectItem>
                            <SelectItem value="FULL">FULL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground text-nowrap">
                          Remolque 1
                        </Label>
                        <Select
                          value={viaje.remolque}
                          onValueChange={(v) =>
                            actualizarViaje(index, "remolque", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-medium">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            {remolques.map((r) => {
                              const abv = getAbreviacionTipo(r.tipo);
                              const label = abv ? `[${abv}] ${r.placas}` : r.placas;
                              return (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      {viaje.modalidad === "FULL" && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground text-nowrap">
                            Remolque 2
                          </Label>
                          <Select
                            value={viaje.remolque2}
                            onValueChange={(v) =>
                              actualizarViaje(index, "remolque2", v)
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-medium border-purple-200">
                              <SelectValue placeholder="Elegir" />
                            </SelectTrigger>
                            <SelectContent>
                              {remolques.map((r) => {
                                const abv = getAbreviacionTipo(r.tipo);
                                const label = abv ? `[${abv}] ${r.placas}` : r.placas;
                                return (
                                  <SelectItem key={r.id} value={String(r.id)}>
                                    {label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex justify-end pb-1 md:col-span-full lg:col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-slate-400 hover:text-red-600 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30"
                          onClick={() => eliminarViaje(index)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={agregarViaje}
                    className="w-full p-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-center gap-3 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider">
                      Añadir viaje para el {diaActivo}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="px-8 py-5 bg-card border-t border-border flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogAbierto(false)}
                className="rounded-xl font-bold h-12 w-32"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => guardarMutation.mutate(formData)}
                disabled={guardarMutation.isPending}
                className="rounded-xl font-black h-12 w-56 bg-primary shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {guardarMutation.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}{" "}
                GUARDAR CAMBIOS
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- ALERT ELIMINAR --- */}
        <AlertDialog
          open={!!semanaAEliminar}
          onOpenChange={() => setSemanaAEliminar(null)}
        >
          <AlertDialogContent className="rounded-[2rem] border-border bg-card shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">
                ¿Eliminar esta semana?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-base text-muted-foreground">
                Esta acción no se puede deshacer. Se borrará toda la
                programación de **{programaSeleccionado?.titulo}**.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl border border-border font-bold h-12">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => eliminarMutation.mutate(semanaAEliminar)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md h-12"
              >
                Eliminar Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* --- MODAL DETALLES DE CONSUMO --- */}
        <Dialog open={dialogConsumoAbierto} onOpenChange={setDialogConsumoAbierto}>
          <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border rounded-[2rem] shadow-2xl">
            <DialogHeader className="px-6 py-5 bg-card border-b border-border">
              <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Fuel className="w-5 h-5 text-primary" />
                Detalles de Consumo
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground text-left">
                Resumen del viaje registrado
              </DialogDescription>
            </DialogHeader>
            {viajeConsumoSeleccionado && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-border/50 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Litros Cargados</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                      {viajeConsumoSeleccionado.litros_combustible || 0} <span className="text-sm font-medium text-slate-400">L</span>
                    </p>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-border/50 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Desglose de Costos</p>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Diésel</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">${(viajeConsumoSeleccionado.costo_combustible || 0).toLocaleString("en-US", {minimumFractionDigits: 2})}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Casetas</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">${((viajeConsumoSeleccionado.casetas_ida || 0) + (viajeConsumoSeleccionado.casetas_regreso || 0)).toLocaleString("en-US", {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                    <div className="border-t border-border/50 pt-2 flex justify-between items-center mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">Total</span>
                      <p className="text-base font-black text-slate-800 dark:text-slate-100">
                        <span className="text-[10px] font-medium text-slate-400 mr-0.5">$</span>{((viajeConsumoSeleccionado.costo_combustible || 0) + (viajeConsumoSeleccionado.casetas_ida || 0) + (viajeConsumoSeleccionado.casetas_regreso || 0)).toLocaleString("en-US", {minimumFractionDigits: 2})}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-border/50 shadow-sm col-span-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Eficiencia</p>
                        <p className={`text-2xl font-black ${getEficienciaColor(viajeConsumoSeleccionado.km_por_litro)}`}>
                          {viajeConsumoSeleccionado.km_por_litro ? viajeConsumoSeleccionado.km_por_litro.toFixed(2) : "-"} <span className="text-sm font-medium opacity-70">km/L</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Distancia</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                          {viajeConsumoSeleccionado.kilometros_total || 0} <span className="text-xs">km</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {viajeConsumoSeleccionado.notas && (
                   <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-500 mb-1">Notas del Viaje</p>
                     <p className="text-sm text-amber-900 dark:text-amber-400/80 font-medium">{viajeConsumoSeleccionado.notas}</p>
                   </div>
                )}
              </div>
            )}
            <div className="px-6 py-4 bg-card border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setDialogConsumoAbierto(false)} className="rounded-xl font-bold px-6 h-10">
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
