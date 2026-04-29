import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Eye,
  User,
  Truck,
  Package,
  Briefcase,
} from "lucide-react";
import { format, addDays, parseISO, getISOWeek } from "date-fns";
import { es } from "date-fns/locale";

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

// --- COMPONENTE Tarjeta 3D interactiva ---
const TiltCardWrapper = ({ children }) => {
  const [style, setStyle] = useState({
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
  });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = -(y / (rect.height / 2)) * 2.5;
    const rotateY = (x / (rect.width / 2)) * 2.5;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
      transition: "transform 0.5s ease-out",
    });
  };

  return (
    <div
      className="relative h-full w-full z-0 cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
};

// --- COMPONENTE Burbuja 3D interactiva ---
const TiltBubble = ({ numero, onClick }) => {
  const [style, setStyle] = useState({
    transform: "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)",
  });

  const handleMouseMove = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = -(y / (rect.height / 2)) * 3.5;
    const rotateY = (x / (rect.width / 2)) * 3.5;

    setStyle({
      transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.10)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseLeave = (e) => {
    e.stopPropagation();
    setStyle({
      transform: "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)",
      transition: "transform 0.5s ease-out",
    });
  };

  return (
    <div
      className="relative w-20 h-20 flex items-center justify-center cursor-pointer z-20"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-[0_8px_16px_rgb(59,130,246,0.3)] z-10 border border-blue-400/30"
        style={{ ...style, transformStyle: "preserve-3d" }}
      >
        <span
          className="text-3xl font-black text-white pointer-events-none drop-shadow-md"
          style={{ transform: "translateZ(20px)" }}
        >
          {numero}
        </span>
      </div>
      <div
        className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:animate-ping duration-1000 pointer-events-none"
        style={{ animationDuration: "2s" }}
      />
    </div>
  );
};

// --------------------------------------------------

export default function FuelProgramaCargas() {
  const queryClient = useQueryClient();

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogVerAbierto, setDialogVerAbierto] = useState(false);
  const [semanaAEliminar, setSemanaAEliminar] = useState(null);
  const [programaSeleccionado, setProgramaSeleccionado] = useState(null);

  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [diaVerActivo, setDiaVerActivo] = useState("Lunes");

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
      cerrarDialog();
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
    setDialogAbierto(true);
  };

  const abrirDialogVer = (programa) => {
    setProgramaSeleccionado(programa);
    const primerDiaConViajes =
      DIAS_SEMANA.find((dia) => programa.programacion[dia]?.length > 0) ||
      "Lunes";
    setDiaVerActivo(primerDiaConViajes);
    setDialogVerAbierto(true);
  };

  const cerrarDialog = () => setDialogAbierto(false);

  const handleFechaInicio = (e) => {
    const fInicio = e.target.value;
    if (fInicio) {
      const start = parseISO(fInicio);
      const end = addDays(start, 5);
      const numeroSemana = getISOWeek(start);
      setFormData({
        ...formData,
        fecha_inicio: fInicio,
        fecha_fin: format(end, "yyyy-MM-dd"),
        titulo: `Semana ${numeroSemana}`,
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
        remolque: "",
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

  const contarViajesTotales = (programacion) => {
    if (!programacion) return 0;
    return Object.values(programacion).reduce(
      (acc, viajes) => acc + (viajes?.length || 0),
      0,
    );
  };

  const getClienteName = (id) => {
    const found = clientes.find((c) => String(c.id) === String(id));
    return found ? found.nombre : id || "N/A";
  };
  const getConductorName = (id) =>
    conductores.find((c) => String(c.id) === String(id))?.nombre || "N/A";
  const getCamionName = (id) => {
    const c = camiones.find((c) => String(c.id) === String(id));
    return c ? `${c.nombre} (${c.placas})` : "N/A";
  };
  const getRemolquePlacas = (id) =>
    remolques.find((r) => String(r.id) === String(id))?.placas || "N/A";

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
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              Programa de Cargas
            </h1>
            <p className="text-muted-foreground">
              Planificación semanal de viajes y unidades.
            </p>
          </div>
          <Button
            onClick={abrirDialogNueva}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl gap-2 px-6 h-12 rounded-xl"
          >
            <Plus className="w-5 h-5" /> Nueva Semana
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {programas.length === 0 && (
            <div className="col-span-full text-center py-16 bg-card rounded-2xl border border-dashed border-border">
              <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">
                Aún no hay programaciones registradas.
              </p>
            </div>
          )}
          {programas.map((prog) => (
            <TiltCardWrapper key={prog.id}>
              <Card
                className="relative border border-slate-200 dark:border-zinc-800 shadow-md hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 bg-white dark:bg-zinc-950 rounded-[1.5rem] overflow-hidden group flex flex-col h-full z-10"
                onClick={() => abrirDialogVer(prog)}
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-20" />

                <CardHeader
                  className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-6 pb-5 relative overflow-hidden z-10"
                  style={{ transform: "translateZ(10px)" }}
                >
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />

                  <div className="space-y-1.5 text-center relative z-10">
                    <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors duration-300">
                      {prog.titulo || "Sin Título"}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {format(parseISO(prog.fecha_inicio), "dd MMM", {
                        locale: es,
                      })}{" "}
                      -{" "}
                      {format(parseISO(prog.fecha_fin), "dd MMM", {
                        locale: es,
                      })}
                      , {format(parseISO(prog.fecha_inicio), "yyyy")}
                    </p>
                  </div>

                  <div className="flex justify-center items-center gap-2 mt-5 relative z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs gap-1.5 px-3 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 text-blue-700 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 font-bold shadow-sm hover:shadow transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirDialogVer(prog);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs gap-1.5 px-3 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-bold shadow-sm hover:shadow transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirDialogEditar(prog);
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-red-500/80 hover:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-900/30 transition-all ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSemanaAEliminar(prog.id);
                      }}
                      title="Eliminar semana"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-8 flex flex-col items-center justify-center relative bg-white dark:bg-zinc-950 flex-1">
                  <TiltBubble
                    numero={contarViajesTotales(prog.programacion)}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirDialogVer(prog);
                    }}
                  />
                  <p
                    className="mt-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-blue-500 transition-colors duration-300 text-center"
                    style={{ transform: "translateZ(10px)" }}
                  >
                    Viajes Registrados
                  </p>
                </CardContent>
              </Card>
            </TiltCardWrapper>
          ))}
        </div>

        {/* MODAL VER DETALLES */}
        <Dialog open={dialogVerAbierto} onOpenChange={setDialogVerAbierto}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border rounded-[2rem] shadow-2xl">
            <DialogHeader className="px-8 py-6 bg-card border-b border-border shrink-0 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black text-foreground">
                  {programaSeleccionado?.titulo}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs uppercase tracking-widest font-bold text-primary">
                  Del{" "}
                  {format(
                    parseISO(
                      programaSeleccionado?.fecha_inicio || "2026-01-01",
                    ),
                    "dd 'de' MMMM",
                    { locale: es },
                  )}{" "}
                  al{" "}
                  {format(
                    parseISO(programaSeleccionado?.fecha_fin || "2026-01-01"),
                    "dd 'de' MMMM",
                    { locale: es },
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
              <div className="flex p-1.5 bg-card border border-border shadow-sm rounded-2xl overflow-x-auto hide-scrollbar shrink-0">
                {DIAS_SEMANA.map((dia) => {
                  const isActive = diaVerActivo === dia;
                  const numViajes =
                    programaSeleccionado?.programacion[dia]?.length || 0;
                  return (
                    <button
                      key={dia}
                      onClick={() => setDiaVerActivo(dia)}
                      className={`flex-1 min-w-[100px] py-3 px-4 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isActive ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                    >
                      {dia}
                      {numViajes > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}
                        >
                          {numViajes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 pb-4">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2 px-1">
                  <CalendarDays className="w-5 h-5 text-primary" /> Viajes para
                  el {diaVerActivo}
                </h3>

                {programaSeleccionado?.programacion[diaVerActivo]?.length ===
                0 ? (
                  <div className="border-2 border-dashed border-border rounded-[1.5rem] p-12 flex flex-col items-center justify-center text-center bg-card/50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Truck className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No hay viajes programados para este día.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border/60 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-sm">
                    {programaSeleccionado?.programacion[diaVerActivo]?.map(
                      (viaje, idx, arr) => (
                        <div
                          key={idx}
                          className={`group p-4 md:px-6 md:py-5 grid grid-cols-2 md:grid-cols-5 gap-4 items-center transition-all duration-200 hover:bg-slate-50 dark:hover:bg-zinc-900/50 border-l-[3px] border-transparent hover:border-l-primary ${idx !== arr.length - 1 ? "border-b border-border/60" : ""}`}
                        >
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3" /> Cliente
                            </p>
                            <p className="text-sm font-semibold">
                              {getClienteName(viaje.cliente)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-red-500" />{" "}
                              Destino
                            </p>
                            <p className="text-sm font-semibold">
                              {viaje.destino || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Chofer
                            </p>
                            <p className="text-sm font-semibold">
                              {getConductorName(viaje.conductor)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Truck className="w-3 h-3" /> Unidad
                            </p>
                            <p className="text-sm font-semibold">
                              {getCamionName(viaje.camion)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Package className="w-3 h-3" /> Remolque
                            </p>
                            <p className="text-sm font-semibold">
                              {getRemolquePlacas(viaje.remolque)}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-5 bg-card border-t border-border shrink-0 flex justify-end">
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

        {/* MODAL CREAR/EDITAR */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border rounded-[2rem] shadow-2xl">
            <DialogHeader className="px-8 py-6 bg-card border-b border-border shrink-0 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black text-foreground">
                  {formData.id
                    ? "Editar Programación"
                    : "Configurar Nueva Semana"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs uppercase tracking-widest font-bold">
                  Gestión de viajes y unidades
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="bg-card p-6 rounded-[1.5rem] border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Título de la Semana
                    </Label>
                    <Input
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                      placeholder="Ej. Semana 1"
                      className="bg-slate-50 dark:bg-zinc-900 border-border rounded-xl font-bold h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Fecha Inicio (Lunes)
                    </Label>
                    <Input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={handleFechaInicio}
                      className="bg-slate-50 dark:bg-zinc-900 border-border rounded-xl h-11 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Fecha Fin (Sábado)
                    </Label>
                    <Input
                      type="date"
                      value={formData.fecha_fin}
                      readOnly
                      className="bg-muted/30 border-dashed rounded-xl h-11 opacity-70 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex p-1.5 bg-card border border-border shadow-sm rounded-2xl overflow-x-auto hide-scrollbar">
                {DIAS_SEMANA.map((dia) => {
                  const isActive = diaActivo === dia;
                  const numViajes = formData.programacion[dia]?.length || 0;
                  return (
                    <button
                      key={dia}
                      onClick={() => setDiaActivo(dia)}
                      className={`flex-1 min-w-[100px] py-3 px-4 text-xs font-bold uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isActive ? "bg-primary text-primary-foreground shadow-md scale-[1.02]" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                    >
                      {dia}
                      {numViajes > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}
                        >
                          {numViajes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 px-1">
                  <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" /> Viajes
                    para el {diaActivo}
                  </h3>
                  <Button
                    onClick={agregarViaje}
                    size="sm"
                    className="gap-2 rounded-xl px-4 h-10 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Nuevo Viaje
                  </Button>
                </div>

                {formData.programacion[diaActivo].length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-[1.5rem] p-12 flex flex-col items-center justify-center text-center bg-card/50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Truck className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No hay viajes registrados para este día.
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Haz clic en "Nuevo Viaje" para comenzar.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border/60 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-sm">
                    {formData.programacion[diaActivo].map(
                      (viaje, index, arr) => (
                        <div
                          key={viaje.id}
                          className={`group p-4 md:px-6 md:py-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center transition-all duration-200 hover:bg-slate-50 dark:hover:bg-zinc-900/50 border-l-[3px] border-transparent hover:border-l-primary ${index !== arr.length - 1 ? "border-b border-border/60" : ""}`}
                        >
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3" /> Cliente
                            </Label>
                            <Select
                              value={viaje.cliente}
                              onValueChange={(v) =>
                                actualizarViaje(index, "cliente", v)
                              }
                            >
                              <SelectTrigger className="h-11 bg-slate-50 dark:bg-zinc-900 border-border rounded-xl">
                                <SelectValue placeholder="Seleccionar" />
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
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> Destino
                            </Label>
                            <Input
                              value={viaje.destino}
                              onChange={(e) =>
                                actualizarViaje(
                                  index,
                                  "destino",
                                  e.target.value,
                                )
                              }
                              placeholder="Ej. Colima"
                              className="h-11 bg-slate-50 dark:bg-zinc-900 border-border rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <User className="w-3 h-3" /> Chofer
                            </Label>
                            <Select
                              value={viaje.conductor}
                              onValueChange={(v) =>
                                actualizarViaje(index, "conductor", v)
                              }
                            >
                              <SelectTrigger className="h-11 bg-slate-50 dark:bg-zinc-900 border-border rounded-xl">
                                <SelectValue placeholder="Seleccionar" />
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
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <Truck className="w-3 h-3" /> Unidad
                            </Label>
                            <Select
                              value={viaje.camion}
                              onValueChange={(v) =>
                                actualizarViaje(index, "camion", v)
                              }
                            >
                              <SelectTrigger className="h-11 bg-slate-50 dark:bg-zinc-900 border-border rounded-xl">
                                <SelectValue placeholder="Seleccionar" />
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
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                              <Package className="w-3 h-3" /> Remolque
                            </Label>
                            <Select
                              value={viaje.remolque}
                              onValueChange={(v) =>
                                actualizarViaje(index, "remolque", v)
                              }
                            >
                              <SelectTrigger className="h-11 bg-slate-50 dark:bg-zinc-900 border-border rounded-xl">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {remolques.map((r) => (
                                  <SelectItem key={r.id} value={String(r.id)}>
                                    {r.placas}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="pt-5 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              onClick={() => eliminarViaje(index)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-5 bg-card border-t border-border shrink-0 flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={cerrarDialog}
                className="w-full sm:w-40 rounded-xl h-12 font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => guardarMutation.mutate(formData)}
                disabled={!formData.fecha_inicio || guardarMutation.isPending}
                className="w-full sm:w-56 bg-primary text-primary-foreground gap-2 rounded-xl h-12 font-black shadow-lg shadow-primary/20"
              >
                {guardarMutation.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}{" "}
                GUARDAR CAMBIOS
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL ELIMINAR */}
        <AlertDialog
          open={!!semanaAEliminar}
          onOpenChange={() => setSemanaAEliminar(null)}
        >
          <AlertDialogContent className="rounded-[2rem] border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">
                ¿Eliminar esta semana?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-base">
                Esta acción no se puede deshacer y perderás toda la
                planificación registrada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl border border-border font-bold">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => eliminarMutation.mutate(semanaAEliminar)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md"
              >
                Eliminar Semana
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
