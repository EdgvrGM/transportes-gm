import React, { useState, useEffect } from "react";
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
  Brain,
  Download,
  ArrowRight,
} from "lucide-react";
import { format, addDays, parseISO, getISOWeek } from "date-fns";
import { es } from "date-fns/locale";
import { TrailerIcon } from "./Layout";

const FECHA_LIMITE_ARCHIVO = '2026-04-24';

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
        .gte("fecha_inicio", FECHA_LIMITE_ARCHIVO)
        .order("fecha_inicio", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
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

  const { data: viajesRegistrados = [] } = useQuery({
    queryKey: ["viajesRegistrados", programaSeleccionado?.id],
    enabled: !!programaSeleccionado?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viajes_registrados")
        .select("*")
        .eq("programa_id", programaSeleccionado.id);
      if (error) throw new Error(error.message);

      if ((!data || data.length === 0) && programaSeleccionado.programacion) {
        const legacyData = programaSeleccionado.programacion;
        const hasLegacyTrips = Object.values(legacyData).some(
          (dia) => Array.isArray(dia) && dia.length > 0
        );

        if (hasLegacyTrips) {
          const diasMap = {
            Lunes: 0, Martes: 1, "Miércoles": 2, Jueves: 3, Viernes: 4, Sábado: 5,
          };
          const fechaInicio = programaSeleccionado.fecha_inicio
            ? new Date(programaSeleccionado.fecha_inicio + "T12:00:00")
            : null;

          const viajesRows = [];
          for (const [dia, viajesDia] of Object.entries(legacyData)) {
            if (!Array.isArray(viajesDia)) continue;
            const offsetDia = diasMap[dia] ?? 0;

            for (const viaje of viajesDia) {
              if (!viaje.conductor || !viaje.camion || !viaje.cliente) continue;

              let fechaViaje = null;
              if (fechaInicio) {
                const d = new Date(fechaInicio);
                d.setDate(d.getDate() + offsetDia);
                fechaViaje = format(d, "yyyy-MM-dd");
              }

              viajesRows.push({
                programa_id: programaSeleccionado.id,
                cliente_id: viaje.cliente || null,
                conductor_id: viaje.conductor ? parseInt(viaje.conductor, 10) : null,
                camion_id: viaje.camion ? parseInt(viaje.camion, 10) : null,
                remolque_id: viaje.remolque ? parseInt(viaje.remolque, 10) : null,
                remolque2_id: viaje.remolque2 ? parseInt(viaje.remolque2, 10) : null,
                destino: viaje.destino || null,
                modalidad: viaje.modalidad || "Sencillo",
                fecha_viaje: fechaViaje,
              });
            }
          }

          if (viajesRows.length > 0) {
            const { data: insertedData, error: insertError } = await supabase
              .from("viajes_registrados")
              .insert(viajesRows)
              .select("*");
            
            if (!insertError && insertedData) {
              return insertedData;
            } else if (insertError) {
               console.error("Error migrando datos al vuelo:", insertError);
            }
          }
        }
      }

      return data || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Query legacy de Viaje (para compatibilidad con consumo registrado)
  const { data: viajes = [] } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data } = await supabase.from("Viaje").select("*");
      return data || [];
    },
  });

  const guardarMutation = useMutation({
    onMutate: () => setErrorMsg(null),
    mutationFn: async (datos) => {
      try {
        // 1. Upsert en ProgramaCargas
        const payload = {
          titulo: datos.titulo,
          fecha_inicio: datos.fecha_inicio,
          fecha_fin: datos.fecha_fin,
          programacion: datos.programacion,
        };

        let programaId = datos.id;

        if (datos.id) {
          const { error } = await supabase
            .from("ProgramaCargas")
            .update(payload)
            .eq("id", datos.id);
          if (error) throw error;
        } else {
          const { data: insertData, error } = await supabase
            .from("ProgramaCargas")
            .insert([payload])
            .select("id")
            .single();
          if (error) throw error;
          programaId = insertData.id;
        }

        // 2. Construir registros para viajes_registrados desde la programación
        const diasMap = {
          Lunes: 0, Martes: 1, "Miércoles": 2, Jueves: 3, Viernes: 4, Sábado: 5,
        };
        const fechaInicio = datos.fecha_inicio ? new Date(datos.fecha_inicio + "T12:00:00") : null;

        const viajesRows = [];
        for (const [dia, viajesDia] of Object.entries(datos.programacion)) {
          const offsetDia = diasMap[dia] ?? 0;
          for (const viaje of viajesDia) {
            if (!viaje.conductor && !viaje.camion && !viaje.cliente) continue;

            // Calcular fecha del viaje según día de la semana
            let fechaViaje = null;
            if (fechaInicio) {
              const d = new Date(fechaInicio);
              d.setDate(d.getDate() + offsetDia);
              fechaViaje = format(d, "yyyy-MM-dd");
            }

            // Enviar siempre el ID. Si es nuevo (13 dígitos) o de BD (UUID/Int), 
            // la DB lo necesita ya que la columna es NOT NULL y podría no tener autoincremento.
            viajesRows.push({
              ...(viaje.id ? { id: viaje.id } : {}),
              programa_id: programaId,                          
              cliente_id: viaje.cliente || null,               
              conductor_id: viaje.conductor ? parseInt(viaje.conductor, 10) : null, 
              camion_id: viaje.camion ? parseInt(viaje.camion, 10) : null,           
              remolque_id: viaje.remolque ? parseInt(viaje.remolque, 10) : null,     
              remolque2_id: viaje.remolque2 ? parseInt(viaje.remolque2, 10) : null,  
              destino: viaje.destino || null,
              modalidad: viaje.modalidad || "Sencillo",
              fecha_viaje: fechaViaje,
            });
          }
        }

        // 3. Sincronización Inteligente: Eliminar solo los que faltan y hacer UPSERT del resto
        const { data: dbTrips } = await supabase
          .from("viajes_registrados")
          .select("id")
          .eq("programa_id", programaId);

        if (dbTrips) {
          const uiIds = viajesRows.filter(v => v.id != null).map(v => String(v.id));
          const dbIds = dbTrips.map(t => String(t.id));
          const toDelete = dbIds.filter(id => !uiIds.includes(id));

          if (toDelete.length > 0) {
            const { error: delErr, count } = await supabase
              .from("viajes_registrados")
              .delete({ count: "exact" })
              .in("id", toDelete);
              
            if (delErr) {
              throw new Error(`No se pudo eliminar un viaje. Es probable que ya tenga consumos vinculados. Detalle: ${delErr.message}`);
            }
            if (count === 0) {
              throw new Error("La base de datos bloqueó la eliminación del viaje. Verifica las políticas de seguridad (RLS) en Supabase.");
            }
          }
        }

        if (viajesRows.length > 0) {
          const { error: upsertError } = await supabase
            .from("viajes_registrados")
            .upsert(viajesRows);

          if (upsertError) {
            // Detección de errores de foreign key constraint
            const msg = upsertError.message || "";
            if (msg.includes("violates check constraint")) {
              throw new Error(`Error de validación: ${msg}. Los datos enviados no cumplen con las reglas de la base de datos.`);
            } else if (msg.includes("foreign key") || msg.includes("violates")) {
              if (msg.includes("cliente_id")) {
                throw new Error("Error de clave foránea en Cliente: el UUID del cliente no existe en la tabla Cliente.");
              } else if (msg.includes("conductor_id")) {
                throw new Error("Error de clave foránea en Chofer: el ID del conductor no existe en el catálogo.");
              } else if (msg.includes("camion_id")) {
                throw new Error("Error de clave foránea en Unidad: el ID del camión no existe en el catálogo.");
              } else if (msg.includes("remolque_id")) {
                throw new Error("Error de clave foránea en Remolque: el ID del remolque no existe en el catálogo.");
              }
              throw new Error(`Error de integridad referencial: ${msg}. Verifica los catálogos.`);
            }
            throw upsertError;
          }
        }
      } catch (err) {
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programaCargas"] });
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
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

  const abrirDialogEditar = async (programa) => {
    setErrorMsg(null);
    setProgramaSeleccionado(programa); // Para pre-cargar dependencias
    
    // Extraer datos reales de la BD para popular el formulario con UUIDs verdaderos
    const { data: realTrips } = await supabase
      .from("viajes_registrados")
      .select("*")
      .eq("programa_id", programa.id);

    let programacionUI = JSON.parse(JSON.stringify(PLANTILLA_VACIA));
    
    if (realTrips && realTrips.length > 0) {
      realTrips.forEach(rt => {
        // Encontrar en qué pestaña de día va basado en la fecha del viaje
        const date = new Date(rt.fecha_viaje + "T12:00:00");
        const fInicio = new Date(programa.fecha_inicio + "T12:00:00");
        const diffTime = Math.abs(date - fInicio);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diasInvertidos = { 0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado" };
        const nombreDia = diasInvertidos[diffDays] || "Lunes";
        
        programacionUI[nombreDia].push({
          id: rt.id, // UUID real
          cliente: rt.cliente_id || "",
          conductor: rt.conductor_id ? String(rt.conductor_id) : "",
          camion: rt.camion_id ? String(rt.camion_id) : "",
          remolque: rt.remolque_id ? String(rt.remolque_id) : "",
          remolque2: rt.remolque2_id ? String(rt.remolque2_id) : "",
          destino: rt.destino || "",
          modalidad: rt.modalidad || "Sencillo",
        });
      });
    } else {
      // Fallback a legacy si no hay registros relacionales aún
      programacionUI = programa.programacion || JSON.parse(JSON.stringify(PLANTILLA_VACIA));
    }

    setFormData({
      ...programa,
      programacion: programacionUI,
    });
    setDiaActivo(diaVerActivo);
    setDialogVerAbierto(false);
    setDialogAbierto(true);
  };

  const abrirDialogVer = (programa) => {
    // Bloqueo de datos archivados
    if (programa.fecha_inicio < FECHA_LIMITE_ARCHIVO) {
      alert("Estos datos han sido archivados para optimizar el rendimiento. Contacte al administrador para consultas históricas.");
      return;
    }
    setProgramaSeleccionado(programa);
    const primerDia =
      DIAS_SEMANA.find((dia) => programa.programacion?.[dia]?.length > 0) ||
      "Lunes";
    setDiaVerActivo(primerDia);
    // Invalidar query de viajes_registrados para el nuevo programa
    queryClient.invalidateQueries({ queryKey: ["viajesRegistrados", programa.id] });
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
    if (t.includes("seca") || t.includes("caja")) return "CS";
    if (
      t.includes("chasis") ||
      t.includes("contenedor") ||
      t.includes("portacontenedor")
    )
      return "CH";
    if (t.includes("plataforma")) return "PT";
    return "";
  };

  const getRemolquePlacas = (id) => {
    const r = remolques.find((r) => String(r.id) === String(id));
    if (!r) return "N/A";
    return r.placas;
  };

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return "";
    return format(parseISO(fechaStr), "dd/MM/yyyy");
  };

  const handleRegistrarCombustible = (viaje) => {
    const registrado = getRegisteredTrip(viaje, diaVerActivo);
    
    if (registrado) {
      navigate(createPageUrl("FuelViajes"), {
        state: { editId: registrado.id }
      });
      return;
    }

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
        viaje_registrado_id: viaje.id || null, // ID del viaje en viajes_registrados
        fecha: format(fechaViaje, "yyyy-MM-dd"),
        conductor_id: viaje.conductor,
        conductor_nombre: conductor ? conductor.nombre : "",
        camion_id: viaje.camion,
        camion_nombre: camion ? camion.nombre : "",
        camion_placas: camion ? camion.placas : "",
        destino: viaje.destino,
        tipo_viaje: viaje.modalidad || "Sencillo",
        remolque_id: viaje.remolque,
        remolque2_id: viaje.remolque2
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

  const getViajesPorDia = (dia) => {
    if (!programaSeleccionado || !viajesRegistrados) return [];
    const diasMap = { "Lunes": 0, "Martes": 1, "Miércoles": 2, "Jueves": 3, "Viernes": 4, "Sábado": 5 };
    const indexDia = diasMap[dia] || 0;
    const fechaInicio = parseISO(programaSeleccionado.fecha_inicio);
    const fechaDia = format(addDays(fechaInicio, indexDia), "yyyy-MM-dd");
    
    return viajesRegistrados
      .filter(v => v.fecha_viaje && v.fecha_viaje.startsWith(fechaDia))
      .map(v => ({
        id: v.id,
        cliente: v.cliente_id,
        conductor: v.conductor_id ? String(v.conductor_id) : "",
        camion: v.camion_id ? String(v.camion_id) : "",
        remolque: v.remolque_id ? String(v.remolque_id) : "",
        remolque2: v.remolque2_id ? String(v.remolque2_id) : "",
        destino: v.destino,
        modalidad: v.modalidad || "Sencillo",
        esRegistrado: true,
      }));
  };

  const getEficienciaColor = (kmPorLitro) => {
    if (!kmPorLitro) return "text-slate-400";
    if (kmPorLitro > 2.25) return "text-green-600 dark:text-green-400";
    if (kmPorLitro >= 2.0) return "text-amber-600 dark:text-amber-400";
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
              totalViajes={Object.values(prog.programacion || {}).reduce(
                (acc, v) => acc + (v?.length || 0),
                0,
              )}
            />
          ))}
        </div>

        {/* --- MODAL DETALLES --- */}
        <Dialog open={dialogVerAbierto} onOpenChange={setDialogVerAbierto}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border rounded-[2rem] shadow-2xl">
            <DialogHeader className="px-4 md:px-8 py-4 md:py-6 bg-card border-b border-border shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <DialogTitle className="text-2xl md:text-3xl font-black">
                    {programaSeleccionado?.titulo}
                  </DialogTitle>
                  <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {formatearFechaDisplay(programaSeleccionado?.fecha_inicio)} al{" "}
                    {formatearFechaDisplay(programaSeleccionado?.fecha_fin)}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold border-border text-foreground hover:bg-muted gap-2"
                    onClick={() => abrirDialogEditar(programaSeleccionado)}
                  >
                    <Edit className="w-4 h-4" /> <span className="hidden sm:inline">Editar Semana</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl font-bold text-red-500 hover:bg-red-500/10 gap-2"
                    onClick={() => setSemanaAEliminar(programaSeleccionado?.id)}
                  >
                    <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex p-1 md:p-1.5 bg-card border border-border shadow-sm rounded-2xl overflow-x-auto hide-scrollbar shrink-0 touch-pan-x">
                {DIAS_SEMANA.map((dia, idx) => {
                  const fechaDia = programaSeleccionado?.fecha_inicio 
                    ? format(addDays(parseISO(programaSeleccionado.fecha_inicio), idx), "d")
                    : "";
                  const count = getViajesPorDia(dia).length;
                  return (
                    <button
                      key={dia}
                      onClick={() => setDiaVerActivo(dia)}
                      className={`flex-1 min-w-[100px] py-2.5 md:py-3 px-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0 ${diaVerActivo === dia ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <span className="text-xs md:text-sm font-black uppercase leading-none">
                        <span className="hidden sm:inline">{dia}</span>
                        <span className="sm:hidden">{dia.substring(0,3)}</span> {fechaDia}
                      </span>
                      <span className={`text-[10px] md:text-xs font-bold opacity-80 -mt-1 leading-none ${diaVerActivo === dia ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        {count} {count === 1 ? "viaje" : "viajes"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border border-border/80 bg-background dark:bg-card rounded-2xl overflow-hidden shadow-sm divide-y divide-border/60">
                {getViajesPorDia(diaVerActivo).map(
                  (viaje, idx) => {
                    return (
                    <div
                      key={viaje.id || idx}
                      className={`relative group p-6 md:px-8 md:py-6 flex flex-col gap-6 transition-all duration-300 ${
                        idx % 2 === 0 ? "bg-background dark:bg-card" : "bg-slate-50/40 dark:bg-muted/20"
                      } hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20`}
                    >
                      {/* Indicador Lateral Premium */}
                      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

                      {/* Fila Superior: Datos */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 items-start">
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Cliente
                          </p>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                            {getClienteName(viaje.cliente)}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-600" /> Destino
                          </p>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                            {viaje.destino || "-"}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Chofer
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                            {getConductorName(viaje.conductor)}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" /> Unidad
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                            {getCamionName(viaje.camion)}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-widest">
                            Modalidad
                          </p>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black tracking-tight w-fit ${viaje.modalidad === 'FULL' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                            {viaje.modalidad || 'Sencillo'}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-1.5">
                            <TrailerIcon className="w-3.5 h-3.5" /> Remolques
                          </p>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                            {getRemolquePlacas(viaje.remolque)}
                            {viaje.modalidad === "FULL" && (
                              <>
                                <span className="mx-1.5 opacity-40">/</span>
                                {getRemolquePlacas(viaje.remolque2)}
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Fila Inferior: Botón Centrado */}
                      <div className="flex justify-center pt-2">
                        {(() => {
                          const registeredViaje = getRegisteredTrip(viaje, diaVerActivo);
                          if (registeredViaje) {
                            return (
                                <div className="flex gap-2 w-full justify-center">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setViajeConsumoSeleccionado(registeredViaje);
                                      setDialogConsumoAbierto(true);
                                    }}
                                    className="h-9 px-6 gap-2 border-green-200 text-green-700 bg-green-50/50 hover:bg-green-100 dark:border-green-900/30 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-xl font-black text-[10px] shadow-sm active:scale-95 transition-all"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>VER CONSUMO REGISTRADO</span>
                                  </Button>
                                </div>
                            );
                          }
                          return (
                            <Button
                              variant="outline"
                              onClick={() => handleRegistrarCombustible(viaje)}
                              className="h-9 px-6 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/30 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 rounded-xl font-black text-[10px] gap-2 shadow-sm active:scale-95 transition-all"
                            >
                              <Fuel className="w-4 h-4" />
                              <span>REGISTRAR COMBUSTIBLE Y GASTOS</span>
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                }
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
                  <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors" />
                    <Input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={handleFechaInicio}
                      className="h-11 pl-10 rounded-xl bg-background font-medium border-border/60 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Fecha Fin
                  </Label>
                  <div className="relative opacity-60">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.fecha_fin}
                      readOnly
                      className="h-11 pl-10 rounded-xl bg-muted/20 border-dashed border-border/60 [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
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
                    className="h-11 rounded-xl bg-background font-bold border-border/60"
                  />
                </div>
              </div>

              <div className="flex p-1 md:p-1.5 bg-card border border-border shadow-sm rounded-2xl overflow-x-auto hide-scrollbar touch-pan-x">
                {DIAS_SEMANA.map((dia, idx) => {
                  const fechaDia = formData.fecha_inicio 
                    ? format(addDays(parseISO(formData.fecha_inicio), idx), "d")
                    : "";
                  const count = formData.programacion[dia]?.length || 0;
                  return (
                    <button
                      key={dia}
                      onClick={() => setDiaActivo(dia)}
                      className={`flex-1 min-w-[100px] py-2.5 md:py-3 px-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0 ${diaActivo === dia ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <span className="text-xs md:text-sm font-black uppercase leading-none">
                        <span className="hidden sm:inline">{dia}</span>
                        <span className="sm:hidden">{dia.substring(0,3)}</span> {fechaDia}
                      </span>
                      <span className={`text-[10px] md:text-xs font-bold opacity-80 -mt-1 leading-none ${diaActivo === dia ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        {count} {count === 1 ? "viaje" : "viajes"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="border border-border/60 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-sm">
                  {formData.programacion[diaActivo].map((viaje, index, arr) => (
                    <div
                      key={viaje.id}
                      className={`relative p-5 md:px-6 md:py-5 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end transition-all ${
                        index !== arr.length - 1 ? "md:border-b border-border/60" : ""
                      } ${
                        // Estilos específicos para móvil: convertir en tarjeta
                        "mb-6 mx-2 md:mb-0 md:mx-0 rounded-[1.5rem] md:rounded-none bg-white dark:bg-zinc-900 md:bg-transparent border border-slate-200 dark:border-zinc-800 md:border-0 shadow-sm md:shadow-none"
                      }`}
                    >
                      {/* Indicador de número de viaje solo en móvil */}
                      <div className="md:hidden w-full flex items-center justify-between mb-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full">
                          Viaje #{index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                          onClick={() => eliminarViaje(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Cliente
                        </Label>
                        <Select
                          value={viaje.cliente}
                          onValueChange={(v) =>
                            actualizarViaje(index, "cliente", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-background font-medium border-border/60">
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
                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Destino
                        </Label>
                        <Input
                          value={viaje.destino}
                          onChange={(e) =>
                            actualizarViaje(index, "destino", e.target.value)
                          }
                          placeholder="Ciudad / Planta"
                          className="h-11 rounded-xl bg-background font-medium border-border/60"
                        />
                      </div>
                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Chofer
                        </Label>
                        <Select
                          value={viaje.conductor}
                          onValueChange={(v) =>
                            actualizarViaje(index, "conductor", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 font-medium border-slate-200 dark:border-zinc-800">
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
                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Unidad
                        </Label>
                        <Select
                          value={viaje.camion}
                          onValueChange={(v) =>
                            actualizarViaje(index, "camion", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 font-medium border-slate-200 dark:border-zinc-800">
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
                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Modalidad
                        </Label>
                        <Select
                          value={viaje.modalidad || "Sencillo"}
                          onValueChange={(v) => {
                            actualizarViaje(index, "modalidad", v);
                            if (v === "Sencillo") actualizarViaje(index, "remolque2", "");
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 font-medium border-purple-200 dark:border-purple-900/30">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sencillo">Sencillo</SelectItem>
                            <SelectItem value="FULL">FULL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 w-full">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Remolque 1
                        </Label>
                        <Select
                          value={viaje.remolque}
                          onValueChange={(v) =>
                            actualizarViaje(index, "remolque", v)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 font-medium border-slate-200 dark:border-zinc-800">
                            <SelectValue placeholder="Elegir" />
                          </SelectTrigger>
                          <SelectContent>
                            {remolques.map((r) => {
                              const abv = getAbreviacionTipo(r.tipo);
                              const label = abv
                                ? `[${abv}] ${r.placas}`
                                : r.placas;
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
                        <div className="space-y-1.5 w-full">
                          <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                            Remolque 2
                          </Label>
                          <Select
                            value={viaje.remolque2}
                            onValueChange={(v) =>
                              actualizarViaje(index, "remolque2", v)
                            }
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-zinc-950 font-medium border-purple-200 dark:border-purple-900/30">
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
                      <div className="hidden md:flex justify-end pb-1 md:col-span-full lg:col-span-1">
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
            <div className="px-6 py-4 bg-card border-t border-border flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDialogConsumoAbierto(false)} 
                className="rounded-xl font-bold px-4 h-10 border-border/60"
              >
                Cerrar
              </Button>
              <Button 
                onClick={() => {
                  setDialogConsumoAbierto(false);
                  navigate("/fuelviajes", { state: { scrollToId: viajeConsumoSeleccionado.id } });
                }}
                className="rounded-xl font-bold px-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 group"
              >
                Detalles completos
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
