import { useState, useEffect, useMemo } from "react";
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
  Briefcase,
  Eye,
  Fuel,
  ArrowRight,
  Ticket,
  CheckCircle2,
  Clock,
  Camera,
  X,
  ImagePlus,
  Upload,
  FileCheck,
  FileX,
  ZoomIn,
  Info,
  ImageIcon,
  Route,
} from "lucide-react";
import { format, addDays, parseISO, getISOWeek } from "date-fns";
import { es } from "date-fns/locale";
import { TrailerIcon } from "./Layout";
import ModalRutaViaje from "@/components/gps/ModalRutaViaje";
import VisorImagen from "@/components/fuel/VisorImagen";

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
  const [viajeAEliminar, setViajeAEliminar] = useState(null); // { index, dia }
  const [confirmarNuevaSemana, setConfirmarNuevaSemana] = useState(false);
  const [programaSeleccionado, setProgramaSeleccionado] = useState(null);
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [diaVerActivo, setDiaVerActivo] = useState("Lunes");
  const [dialogConsumoAbierto, setDialogConsumoAbierto] = useState(false);
  const [viajeConsumoSeleccionado, setViajeConsumoSeleccionado] = useState(null);
  const [dialogEvidenciaAbierto, setDialogEvidenciaAbierto] = useState(false);
  const [viajeEvidenciaSeleccionado, setViajeEvidenciaSeleccionado] = useState(null);
  const [nuevaRemision, setNuevaRemision] = useState({ num_remision: "", notas: "", entregada: false });
  const [galeriaAbierta, setGaleriaAbierta] = useState({}); // { id_remision: true/false }
  const [fotoVisor, setFotoVisor] = useState(null); // URL de la foto en pantalla completa
  const [fotoCargando, setFotoCargando] = useState(null); // id_remision que está cargando
  const [evidenciaAEliminar, setEvidenciaAEliminar] = useState(null);
  const [fotoAEliminar, setFotoAEliminar] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viajeRutaSeleccionado, setViajeRutaSeleccionado] = useState(null);
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
      const { data } = await supabase.from("Conductor").select("*").eq("estado", "activo");
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
        .select("*, Evidencia(*)")
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

  // IDs de viajes que tienen ruta GPS guardada en ViajeRuta
  const { data: rutasGuardadas = [] } = useQuery({
    queryKey: ["rutasGuardadas"],
    queryFn: async () => {
      const { data } = await supabase.from("ViajeRuta").select("viaje_id");
      return data || [];
    },
    staleTime: 30000,
  });

  const rutasSet = useMemo(
    () => new Set(rutasGuardadas.map((r) => String(r.viaje_id))),
    [rutasGuardadas]
  );

  const guardarMutation = useMutation({
    onMutate: () => setErrorMsg(null),
    mutationFn: async (datos) => {
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
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["programaCargas"] });
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
      setDialogAbierto(false);
      if (variables.id) {
        setProgramaSeleccionado((prev) => ({ ...prev, ...variables }));
        setDialogVerAbierto(true);
      }
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

  const agregarEvidenciaMutation = useMutation({
    mutationFn: async (datos) => {
      const { data, error } = await supabase
        .from("Evidencia")
        .insert([{
          viaje_id: datos.viaje_id,
          num_remision: datos.num_remision,
          entregada: datos.entregada,
          fecha_entrega: datos.entregada ? new Date().toISOString() : null,
          notas: datos.notas
        }])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
      setNuevaRemision({ num_remision: "", notas: "", entregada: false });
    },
  });

  const toggleEvidenciaMutation = useMutation({
    mutationFn: async (evidencia) => {
      const { data, error } = await supabase
        .from("Evidencia")
        .update({
          entregada: !evidencia.entregada,
          fecha_entrega: !evidencia.entregada ? new Date().toISOString() : null,
        })
        .eq("id", evidencia.id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
    },
  });

  const eliminarEvidenciaMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("Evidencia")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
    },
  });

  const subirFotoEvidenciaMutation = useMutation({
    mutationFn: async ({ evidenciaId, viajeId, file, currentFotosUrls }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${evidenciaId}_${Date.now()}.${fileExt}`;
      const filePath = `evidencias/${viajeId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('evidencias')
        .getPublicUrl(filePath);
        
      const newFotosUrls = [...(currentFotosUrls || []), publicUrl];
      
      const { data, error: updateError } = await supabase
        .from('Evidencia')
        .update({ fotos_urls: newFotosUrls })
        .eq('id', evidenciaId)
        .select();
        
      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
      setFotoCargando(null);
    },
    onError: (err) => {
      alert("Error al subir foto: " + err.message);
      setFotoCargando(null);
    }
  });

  const eliminarFotoEvidenciaMutation = useMutation({
    mutationFn: async ({ evidenciaId, currentFotosUrls, urlToRemove }) => {
       const urlParts = urlToRemove.split('/');
       const fileName = urlParts.pop();
       const viajeId = urlParts.pop();
       const pathToRemove = `evidencias/${viajeId}/${fileName}`;
       
       await supabase.storage.from('evidencias').remove([pathToRemove]);

       const newFotosUrls = currentFotosUrls.filter(u => u !== urlToRemove);
       const { error } = await supabase
         .from('Evidencia')
         .update({ fotos_urls: newFotosUrls })
         .eq('id', evidenciaId);
       if (error) throw error;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
       setFotoAEliminar(null);
    }
  });

  const handleAbrirGestorEvidencias = (viaje) => {
    setViajeEvidenciaSeleccionado(viaje);
    setNuevaRemision({ num_remision: "", notas: "", entregada: false });
    setDialogEvidenciaAbierto(true);
  };

  const handleGuardarRemision = () => {
    if (!nuevaRemision.num_remision || !viajeEvidenciaSeleccionado) return;
    agregarEvidenciaMutation.mutate({
      viaje_id: viajeEvidenciaSeleccionado.id,
      ...nuevaRemision
    });
  };

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

  const eliminarViaje = (index, dia = diaActivo) => {
    const nuevosViajes = formData.programacion[dia].filter(
      (_, i) => i !== index,
    );
    setFormData({
      ...formData,
      programacion: { ...formData.programacion, [dia]: nuevosViajes },
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

    // Match directo por FK: sin importar la fecha de carga, el vínculo es exacto.
    if (viajeProgramado.id) {
      const byFk = viajes.find(
        (v) => v.viaje_registrado_id != null &&
          String(v.viaje_registrado_id) === String(viajeProgramado.id)
      );
      if (byFk) return byFk;
    }

    // Fallback por fecha para viajes registrados antes de esta mejora (sin FK).
    const diasMap = { "Lunes": 0, "Martes": 1, "Miércoles": 2, "Jueves": 3, "Viernes": 4, "Sábado": 5 };
    const indexDia = diasMap[diaActivo] || 0;
    const fechaInicio = parseISO(programaSeleccionado.fecha_inicio);
    const fechaViaje = addDays(fechaInicio, indexDia);
    const fechaStr = format(fechaViaje, "yyyy-MM-dd");

    return viajes.find((v) => {
      const matchFecha = v.fecha && v.fecha.startsWith(fechaStr);
      const matchConductor = String(v.conductor_id) === String(viajeProgramado.conductor);
      const matchCamion = String(v.camion_id) === String(viajeProgramado.camion);
      const matchRemolque = !viajeProgramado.remolque || !v.remolque_id ||
        String(v.remolque_id) === String(viajeProgramado.remolque);
      return matchFecha && matchConductor && matchCamion && matchRemolque;
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
        evidencias: v.Evidencia || [],
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
            onClick={() => setConfirmarNuevaSemana(true)}
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

                      {/* Fila Inferior: Botón Centrado y Badge Evidencias */}
                        {(() => {
                          const registeredViaje = getRegisteredTrip(viaje, diaVerActivo);
                          const hasFuel = registeredViaje && parseFloat(registeredViaje.litros_combustible || 0) > 0;
                          const hasTolls = registeredViaje && registeredViaje.casetas_ida !== null && registeredViaje.casetas_regreso !== null;
                          const hasRuta = registeredViaje && rutasSet.has(String(registeredViaje.id));
                          const tieneEvidencias = viaje.evidencias?.length > 0;
                          const todasEntregadas = tieneEvidencias && viaje.evidencias.some(e => e.entregada);

                          let mainButton;
                          if (registeredViaje) {
                            if (hasFuel && hasTolls) {
                              mainButton = (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setViajeConsumoSeleccionado(registeredViaje);
                                    setDialogConsumoAbierto(true);
                                  }}
                                  className="min-h-[2.25rem] h-auto py-2 px-4 md:px-6 gap-2 border-green-200 text-green-700 bg-green-50/50 hover:bg-green-100 dark:border-green-900/30 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-xl font-black text-[10px] shadow-sm active:scale-95 transition-all text-center whitespace-normal"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>VER DETALLES DE CONSUMO</span>
                                </Button>
                              );
                            } else {
                              let btnLabel = "COMPLETAR REGISTRO";
                              let btnIcon = <Edit className="w-3.5 h-3.5" />;
                              let btnClass = "border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100 dark:border-orange-900/30 dark:text-orange-400 dark:bg-orange-900/20";
                              if (!hasFuel && hasTolls) {
                                btnLabel = "REGISTRAR COMBUSTIBLE";
                                btnIcon = <Fuel className="w-3.5 h-3.5" />;
                                btnClass = "border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-900/30 dark:text-amber-400 dark:bg-amber-900/20";
                              } else if (hasFuel && !hasTolls) {
                                btnLabel = "REGISTRAR CASETAS";
                                btnIcon = <Ticket className="w-3.5 h-3.5" />;
                                btnClass = "border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-900/30 dark:text-indigo-400 dark:bg-indigo-900/20";
                              }
                              mainButton = (
                                <Button
                                  variant="outline"
                                  onClick={() => handleRegistrarCombustible(viaje)}
                                  className={`min-h-[2.25rem] h-auto py-2 px-4 md:px-6 gap-2 rounded-xl font-black text-[10px] shadow-sm active:scale-95 transition-all text-center whitespace-normal ${btnClass}`}
                                >
                                  {btnIcon}
                                  <span>{btnLabel}</span>
                                </Button>
                              );
                            }
                          } else {
                            mainButton = (
                              <Button
                                variant="outline"
                                onClick={() => handleRegistrarCombustible(viaje)}
                                className="min-h-[2.25rem] h-auto py-2 px-4 md:px-6 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/30 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 rounded-xl font-black text-[10px] gap-2 shadow-sm active:scale-95 transition-all text-center whitespace-normal"
                              >
                                <Plus className="w-4 h-4" />
                                <span>REGISTRAR CONSUMOS DE COMBUSTIBLE Y CASETAS</span>
                              </Button>
                            );
                          }

                          return (
                            <div className="relative flex flex-col md:flex-row justify-center items-center pt-4 md:pt-2 border-t border-border/40 mt-2 gap-3 min-h-[3rem]">
                              {/* LEFT: evidencias */}
                              <div className="md:absolute md:left-0 flex items-center justify-center w-full md:w-auto gap-2">
                                <button
                                  onClick={() => handleAbrirGestorEvidencias(viaje)}
                                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black transition-all hover:scale-105 shadow-sm border ${
                                    todasEntregadas
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800"
                                      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800"
                                  }`}
                                >
                                  {todasEntregadas ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
                                  {todasEntregadas ? "EVIDENCIA: ENTREGADA" : "EVIDENCIA: SIN ENTREGAR"}
                                </button>
                              </div>

                              {/* CENTER: main action */}
                              <div className="flex items-center justify-center w-full md:w-auto gap-2 z-10">
                                {mainButton}
                              </div>

                              {/* RIGHT: VER RUTA */}
                              {hasRuta && (
                                <div className="md:absolute md:right-0">
                                  <Button
                                    variant="outline"
                                    onClick={() => setViajeRutaSeleccionado(registeredViaje)}
                                    className="min-h-[2.25rem] h-auto py-2 px-4 gap-2 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-900/30 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-xl font-black text-[10px] shadow-sm active:scale-95 transition-all"
                                  >
                                    <Route className="w-3.5 h-3.5" />
                                    <span>VER RUTA</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
                          onClick={() => setViajeAEliminar({ index, dia: diaActivo })}
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
                          onClick={() => setViajeAEliminar({ index, dia: diaActivo })}
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

        {/* --- CONFIRM ELIMINAR VIAJE --- */}
        <AlertDialog
          open={viajeAEliminar !== null}
          onOpenChange={() => setViajeAEliminar(null)}
        >
          <AlertDialogContent className="rounded-[2rem] border-border bg-card shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">
                ¿Eliminar este viaje?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-base text-muted-foreground">
                Se eliminará el viaje #{viajeAEliminar !== null ? viajeAEliminar.index + 1 : ""} del día{" "}
                <span className="font-bold text-foreground">{viajeAEliminar?.dia}</span>.
                Recuerda guardar la semana para confirmar el cambio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl border border-border font-bold h-12">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  eliminarViaje(viajeAEliminar.index, viajeAEliminar.dia);
                  setViajeAEliminar(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md h-12"
              >
                Eliminar Viaje
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* --- CONFIRM NUEVA SEMANA --- */}
        <AlertDialog
          open={confirmarNuevaSemana}
          onOpenChange={setConfirmarNuevaSemana}
        >
          <AlertDialogContent className="rounded-[2rem] border-border bg-card shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">
                ¿Crear nueva semana?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-base text-muted-foreground">
                Se abrirá el formulario para registrar una nueva semana de programación.
                Asegúrate de haber guardado cualquier cambio pendiente antes de continuar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl border border-border font-bold h-12">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmarNuevaSemana(false);
                  abrirDialogNueva();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold shadow-md h-12"
              >
                Crear Semana
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

        {/* Dialog Gestión de Evidencias Rediseñado */}
        <Dialog open={dialogEvidenciaAbierto} onOpenChange={(open) => {
          setDialogEvidenciaAbierto(open);
          if(!open) { setGaleriaAbierta({}); setFotoVisor(null); }
        }}>
          <DialogContent className="sm:max-w-[600px] rounded-[1.5rem] p-0 overflow-hidden bg-slate-50 dark:bg-zinc-950 border-border shadow-2xl">
            {(() => {
              const viajeDb = viajeEvidenciaSeleccionado ? viajesRegistrados.find(v => v.id === viajeEvidenciaSeleccionado.id) : null;
              const evidenciasActualizadas = viajeDb ? (viajeDb.Evidencia || []) : (viajeEvidenciaSeleccionado?.evidencias || []);
              
              return (
                <>
                  <DialogHeader className="px-6 py-6 bg-card border-b border-border shadow-sm z-10 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <Ticket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          Expediente de Remisiones
                        </DialogTitle>
                        <DialogDescription className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {viajeEvidenciaSeleccionado ? getClienteName(viajeEvidenciaSeleccionado.cliente) : ""}
                          <span className="mx-1 opacity-50">/</span>
                          <MapPin className="w-4 h-4" />
                          {viajeEvidenciaSeleccionado?.destino || "Sin Destino"}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto hide-scrollbar">
                    
                    {/* Tarjeta de Registro Rápido */}
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-border shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" /> Registrar Nueva
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        <div className="sm:col-span-4 space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Número</Label>
                          <Input
                            placeholder="Ej. REM-001"
                            value={nuevaRemision.num_remision}
                            onChange={(e) => setNuevaRemision({...nuevaRemision, num_remision: e.target.value})}
                            className="h-10 rounded-xl border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 font-bold"
                          />
                        </div>
                        <div className="sm:col-span-5 space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</Label>
                          <Input
                            placeholder="Opcional..."
                            value={nuevaRemision.notas}
                            onChange={(e) => setNuevaRemision({...nuevaRemision, notas: e.target.value})}
                            className="h-10 rounded-xl border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950"
                          />
                        </div>
                        <div className="sm:col-span-3 flex flex-col justify-end pt-5">
                           <Button 
                            onClick={handleGuardarRemision} 
                            disabled={!nuevaRemision.num_remision || agregarEvidenciaMutation.isPending}
                            className="w-full h-10 rounded-xl font-black shadow-md shadow-primary/20 active:scale-95 transition-all"
                          >
                            {agregarEvidenciaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Remisiones */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-500" /> Archivo Digital
                      </h4>
                      
                      {evidenciasActualizadas.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center text-center bg-transparent border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[1.5rem]">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3">
                            <FileX className="w-8 h-8 text-slate-300 dark:text-zinc-700" />
                          </div>
                          <p className="text-sm font-bold text-slate-500">Expediente vacío</p>
                          <p className="text-xs text-slate-400 mt-1">Registra la primera remisión arriba</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {evidenciasActualizadas.map((ev) => {
                            const isOpen = galeriaAbierta[ev.id];
                            const fotos = ev.fotos_urls || [];
                            
                            return (
                              <div key={ev.id} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-border shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 group">
                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
                                  {/* Info */}
                                  <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <button
                                      onClick={() => toggleEvidenciaMutation.mutate(ev)}
                                      disabled={toggleEvidenciaMutation.isPending}
                                      className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 ${
                                        ev.entregada 
                                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50" 
                                          : "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50"
                                      }`}
                                      title="Haz clic para cambiar el estado"
                                    >
                                      {ev.entregada ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                    </button>
                                    <div className="space-y-1 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h5 className="font-black text-xl text-slate-800 dark:text-slate-100 leading-none">
                                          {ev.num_remision}
                                        </h5>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest leading-none ${
                                          ev.entregada 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                        }`}>
                                          {ev.entregada ? 'Entregada' : 'Pendiente'}
                                        </span>
                                      </div>
                                      {ev.notas && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" /> <span className="truncate max-w-[200px] sm:max-w-[300px]">{ev.notas}</span></p>}
                                    </div>
                                  </div>

                                  {/* Botones Acción */}
                                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">

                                    <button
                                      onClick={() => setGaleriaAbierta(prev => ({...prev, [ev.id]: !prev[ev.id]}))}
                                      className={`flex-1 sm:flex-none px-4 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                        fotos.length > 0 
                                          ? (isOpen ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40")
                                          : (isOpen ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700")
                                      }`}
                                    >
                                      {fotos.length > 0 ? <ImageIcon className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                                      Fotos ({fotos.length})
                                    </button>
                                    
                                    <button
                                      onClick={() => setEvidenciaAEliminar(ev.id)}
                                      disabled={eliminarEvidenciaMutation.isPending}
                                      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      title="Eliminar remisión"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Galería Expansible */}
                                {isOpen && (
                                  <div className="border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 p-5 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                      {/* Fotos existentes */}
                                      {fotos.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 group/foto bg-black">
                                          <img src={url} alt={`Evidencia ${i}`} className="w-full h-full object-contain" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/foto:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                            <button 
                                              onClick={() => setFotoVisor(url)}
                                              className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-md transition-colors"
                                            >
                                              <ZoomIn className="w-5 h-5" />
                                            </button>
                                            <button 
                                              onClick={() => setFotoAEliminar({ evidenciaId: ev.id, currentFotosUrls: fotos, urlToRemove: url })}
                                              className="p-2 bg-red-500/80 hover:bg-red-600 rounded-lg text-white backdrop-blur-md transition-colors"
                                            >
                                              <Trash2 className="w-5 h-5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Botón Añadir Foto */}
                                      <div className="relative aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden group/add">
                                        {fotoCargando === ev.id ? (
                                          <div className="flex flex-col items-center gap-2 text-primary">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span className="text-[10px] font-black tracking-widest uppercase">Subiendo</span>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center mb-2 group-hover/add:scale-110 transition-transform">
                                              <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Añadir Foto</span>
                                          </>
                                        )}
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                          disabled={fotoCargando === ev.id}
                                          onChange={(e) => {
                                            const file = e.target.files[0];
                                            if(!file) return;
                                            setFotoCargando(ev.id);
                                            subirFotoEvidenciaMutation.mutate({
                                              evidenciaId: ev.id,
                                              viajeId: viajeEvidenciaSeleccionado.id,
                                              file: file,
                                              currentFotosUrls: fotos
                                            });
                                            e.target.value = null;
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Visor de Fotos Fullscreen */}
                  <VisorImagen url={fotoVisor} onClose={() => setFotoVisor(null)} />

                  <div className="px-6 py-4 bg-muted/10 border-t border-border flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setDialogEvidenciaAbierto(false)} 
                      className="rounded-xl font-bold px-8 h-11 border-border/60 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Terminar
                    </Button>
                  </div>

                  {/* AlertDialog Eliminar Remisión */}
                  <AlertDialog open={!!evidenciaAEliminar} onOpenChange={() => setEvidenciaAEliminar(null)}>
                    <AlertDialogContent className="rounded-[1.5rem]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de eliminar esta remisión?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se borrará la remisión del expediente y cualquier foto asociada ya no se mostrará.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => {
                            eliminarEvidenciaMutation.mutate(evidenciaAEliminar);
                            setEvidenciaAEliminar(null);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                          Sí, Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* AlertDialog Eliminar Foto */}
                  <AlertDialog open={!!fotoAEliminar} onOpenChange={() => setFotoAEliminar(null)}>
                    <AlertDialogContent className="rounded-[1.5rem]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de eliminar esta foto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta foto será eliminada permanentemente del archivo digital de la remisión.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => {
                            eliminarFotoEvidenciaMutation.mutate(fotoAEliminar);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                          {eliminarFotoEvidenciaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Sí, Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Modal reproducción de ruta GPS */}
        <ModalRutaViaje
          viaje={viajeRutaSeleccionado}
          onClose={() => setViajeRutaSeleccionado(null)}
        />
      </div>
    </div>
  );
}
