import { useState, useMemo, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Container,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Search,
  ImagePlus,
  Images,
  X,
  MapPin,
  User,
  Truck,
  Calendar,
  Briefcase,
  PackageOpen,
  ChevronDown,
  Check,
  Clock,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import VisorImagen from "@/components/fuel/VisorImagen";

const ESTATUS_VACIOS = [
  { value: "pendiente_vacio", label: "Pendiente entrega de vacío", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800", stripe: "bg-orange-400" },
  { value: "vacio_entregado", label: "Vacío entregado", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800", stripe: "bg-emerald-400" },
  { value: "en_piso", label: "Contenedor en piso", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800", stripe: "bg-purple-400" },
];

const getEstatus = (v) => ESTATUS_VACIOS.find((e) => e.value === v) || ESTATUS_VACIOS[0];

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Extrae la ruta interna del bucket "vacios" a partir de su URL pública.
function pathFotoStorage(url) {
  const marker = "/storage/v1/object/public/vacios/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

const FORM_VACIO = {
  id: null,
  numero_contenedor: "",
  fecha_carga: "",
  cliente_id: "",
  destino: "",
  conductor_carga_id: "",
  camion_carga_id: "",
  remolque_carga_id: "",
  estatus: "pendiente_vacio",
  conductor_entrega_id: "",
  camion_entrega_id: "",
  remolque_entrega_id: "",
  fecha_entrega_vacio: "",
  lugar_entrega_vacio: "",
  entrega_con_cita: false,
  horario_cita: "",
  notas: "",
  fotos_urls: [],
};

const FORM_ENTREGA = {
  id: null,
  numero_contenedor: "",
  conductor_carga_id: "",
  camion_carga_id: "",
  remolque_carga_id: "",
  conductor_entrega_id: "",
  camion_entrega_id: "",
  remolque_entrega_id: "",
  fecha_entrega_vacio: "",
  lugar_entrega_vacio: "",
  entrega_con_cita: false,
  horario_cita: "",
};

export default function ControlVacios() {
  const queryClient = useQueryClient();

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [formData, setFormData] = useState(FORM_VACIO);
  const [contenedorAEliminar, setContenedorAEliminar] = useState(null);
  const [popoverEstatus, setPopoverEstatus] = useState(null);
  const [fotoVisor, setFotoVisor] = useState(null);
  const [galeriaFotos, setGaleriaFotos] = useState(null);
  const [dialogEntrega, setDialogEntrega] = useState(false);
  const [entregaData, setEntregaData] = useState(FORM_ENTREGA);
  const [fotoAEliminar, setFotoAEliminar] = useState(null);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // URLs subidas a Storage durante esta sesión de edición pero aún no guardadas en BD.
  // Si se quitan o se cancela el diálogo, se borran del bucket para no dejar archivos muertos.
  const fotosSubidasSesion = useRef(new Set());

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("todos");
  const [filtroConductor, setFiltroConductor] = useState("todos");

  const { data: contenedores = [], isLoading } = useQuery({
    queryKey: ["controlVacios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contenedores_vacios")
        .select("*")
        .order("fecha_carga", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 0,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("Cliente").select("*").order("nombre");
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

  const remolquesChasis = remolques.filter(
    (r) => r.tipo?.toLowerCase().includes("chasis")
  );

  // Helpers de nombres
  const getClienteName = (id) => clientes.find((c) => String(c.id) === String(id))?.nombre || "—";
  const getConductorName = (id) => conductores.find((c) => String(c.id) === String(id))?.nombre || "—";
  const getCamionName = (id) => {
    const c = camiones.find((x) => String(x.id) === String(id));
    return c ? `${c.nombre}${c.placas ? ` (${c.placas})` : ""}` : "—";
  };
  const getRemolquePlacas = (id) => remolques.find((r) => String(r.id) === String(id))?.placas || "—";
  const formatearFecha = (s) => {
    if (!s) return "—";
    try {
      return format(parseISO(s), "dd MMM yyyy", { locale: es });
    } catch {
      return s;
    }
  };

  const guardarMutation = useMutation({
    mutationFn: async (datos) => {
      const payload = {
        id: datos.id,
        numero_contenedor: datos.numero_contenedor.trim(),
        fecha_carga: datos.fecha_carga || null,
        cliente_id: datos.cliente_id || null,
        destino: datos.destino?.trim() || null,
        conductor_carga_id: datos.conductor_carga_id ? parseInt(datos.conductor_carga_id, 10) : null,
        camion_carga_id: datos.camion_carga_id ? parseInt(datos.camion_carga_id, 10) : null,
        remolque_carga_id: datos.remolque_carga_id ? parseInt(datos.remolque_carga_id, 10) : null,
        estatus: datos.estatus,
        conductor_entrega_id: datos.conductor_entrega_id ? parseInt(datos.conductor_entrega_id, 10) : null,
        camion_entrega_id: datos.camion_entrega_id ? parseInt(datos.camion_entrega_id, 10) : null,
        remolque_entrega_id: datos.remolque_entrega_id ? parseInt(datos.remolque_entrega_id, 10) : null,
        fecha_entrega_vacio: datos.fecha_entrega_vacio || null,
        lugar_entrega_vacio: datos.lugar_entrega_vacio?.trim() || null,
        entrega_con_cita: !!datos.entrega_con_cita,
        horario_cita: datos.entrega_con_cita ? (datos.horario_cita?.trim() || null) : null,
        notas: datos.notas?.trim() || null,
        fotos_urls: datos.fotos_urls || [],
      };
      // Fotos previas en BD para detectar cuáles se quitaron y borrarlas del Storage.
      let fotosPrevias = [];
      if (datos.id) {
        const { data: prev } = await supabase
          .from("contenedores_vacios")
          .select("fotos_urls")
          .eq("id", datos.id)
          .maybeSingle();
        fotosPrevias = prev?.fotos_urls || [];
      }

      const { error } = await supabase.from("contenedores_vacios").upsert(payload);
      if (error) throw error;

      // Limpieza best-effort de fotos que ya no están en el registro.
      const nuevas = datos.fotos_urls || [];
      const eliminadas = fotosPrevias.filter((u) => !nuevas.includes(u));
      const rutas = eliminadas.map(pathFotoStorage).filter(Boolean);
      if (rutas.length) {
        try {
          await supabase.storage.from("vacios").remove(rutas);
        } catch (_e) {
          // ignorar errores de limpieza de Storage
        }
      }
    },
    onSuccess: () => {
      fotosSubidasSesion.current.clear();
      queryClient.invalidateQueries({ queryKey: ["controlVacios"] });
      setDialogAbierto(false);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const actualizarEstatusMutation = useMutation({
    mutationFn: async ({ id, estatus }) => {
      const { error } = await supabase
        .from("contenedores_vacios")
        .update({ estatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["controlVacios"] }),
    onError: (err) => alert("Error al actualizar estatus: " + err.message),
  });

  const guardarEntregaMutation = useMutation({
    mutationFn: async (d) => {
      const { error } = await supabase
        .from("contenedores_vacios")
        .update({
          conductor_entrega_id: d.conductor_entrega_id ? parseInt(d.conductor_entrega_id, 10) : null,
          camion_entrega_id: d.camion_entrega_id ? parseInt(d.camion_entrega_id, 10) : null,
          remolque_entrega_id: d.remolque_entrega_id ? parseInt(d.remolque_entrega_id, 10) : null,
          fecha_entrega_vacio: d.fecha_entrega_vacio || null,
          lugar_entrega_vacio: d.lugar_entrega_vacio?.trim() || null,
          entrega_con_cita: !!d.entrega_con_cita,
          horario_cita: d.entrega_con_cita ? (d.horario_cita?.trim() || null) : null,
        })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controlVacios"] });
      setDialogEntrega(false);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const handleGuardarEntrega = () => {
    setErrorMsg(null);
    if (!entregaData.conductor_entrega_id) {
      setErrorMsg("Selecciona el conductor que entrega el vacío.");
      return;
    }
    guardarEntregaMutation.mutate(entregaData);
  };

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      // Borrado best-effort de las fotos del contenedor (carpeta vacios/{id}).
      // Si falla el Storage, no bloqueamos la eliminación del registro.
      try {
        const { data: archivos } = await supabase.storage.from("vacios").list(`vacios/${id}`);
        if (archivos?.length) {
          await supabase.storage.from("vacios").remove(archivos.map((f) => `vacios/${id}/${f.name}`));
        }
      } catch (_e) {
        // ignorar errores de limpieza de Storage
      }
      const { error } = await supabase.from("contenedores_vacios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controlVacios"] });
      setContenedorAEliminar(null);
    },
    onError: (err) => {
      alert("Error al eliminar: " + err.message);
      setContenedorAEliminar(null);
    },
  });

  // Al cerrar el diálogo sin guardar, borra del Storage las fotos subidas en esta
  // sesión que nunca se persistieron, para no dejar archivos muertos.
  const cerrarDialogAlta = async (open) => {
    setDialogAbierto(open);
    if (!open) {
      const huerfanas = Array.from(fotosSubidasSesion.current);
      fotosSubidasSesion.current.clear();
      const rutas = huerfanas.map(pathFotoStorage).filter(Boolean);
      if (rutas.length) {
        try {
          await supabase.storage.from("vacios").remove(rutas);
        } catch (_e) {
          // ignorar errores de limpieza de Storage
        }
      }
    }
  };

  const abrirNuevo = () => {
    setErrorMsg(null);
    fotosSubidasSesion.current.clear();
    setEsEdicion(false);
    setFormData({
      ...FORM_VACIO,
      id: crypto.randomUUID(),
      fecha_carga: localDateStr(new Date()),
      fotos_urls: [],
    });
    setDialogAbierto(true);
  };

  const abrirEditar = (c) => {
    setErrorMsg(null);
    fotosSubidasSesion.current.clear();
    setEsEdicion(true);
    setFormData({
      id: c.id,
      numero_contenedor: c.numero_contenedor || "",
      fecha_carga: c.fecha_carga || "",
      cliente_id: c.cliente_id || "",
      destino: c.destino || "",
      conductor_carga_id: c.conductor_carga_id != null ? String(c.conductor_carga_id) : "",
      camion_carga_id: c.camion_carga_id != null ? String(c.camion_carga_id) : "",
      remolque_carga_id: c.remolque_carga_id != null ? String(c.remolque_carga_id) : "",
      estatus: c.estatus || "cargado",
      conductor_entrega_id: c.conductor_entrega_id != null ? String(c.conductor_entrega_id) : "",
      camion_entrega_id: c.camion_entrega_id != null ? String(c.camion_entrega_id) : "",
      remolque_entrega_id: c.remolque_entrega_id != null ? String(c.remolque_entrega_id) : "",
      fecha_entrega_vacio: c.fecha_entrega_vacio || "",
      lugar_entrega_vacio: c.lugar_entrega_vacio || "",
      entrega_con_cita: !!c.entrega_con_cita,
      horario_cita: c.horario_cita || "",
      notas: c.notas || "",
      fotos_urls: c.fotos_urls || [],
    });
    setDialogAbierto(true);
  };

  const abrirEntrega = (c) => {
    setErrorMsg(null);
    setEntregaData({
      id: c.id,
      numero_contenedor: c.numero_contenedor || "",
      conductor_carga_id: c.conductor_carga_id != null ? String(c.conductor_carga_id) : "",
      camion_carga_id: c.camion_carga_id != null ? String(c.camion_carga_id) : "",
      remolque_carga_id: c.remolque_carga_id != null ? String(c.remolque_carga_id) : "",
      conductor_entrega_id: c.conductor_entrega_id != null ? String(c.conductor_entrega_id) : "",
      camion_entrega_id: c.camion_entrega_id != null ? String(c.camion_entrega_id) : "",
      remolque_entrega_id: c.remolque_entrega_id != null ? String(c.remolque_entrega_id) : "",
      fecha_entrega_vacio: c.fecha_entrega_vacio || "",
      lugar_entrega_vacio: c.lugar_entrega_vacio || "",
      entrega_con_cita: !!c.entrega_con_cita,
      horario_cita: c.horario_cita || "",
    });
    setDialogEntrega(true);
  };

  const handleGuardar = () => {
    setErrorMsg(null);
    if (!formData.numero_contenedor.trim()) {
      setErrorMsg("El número de contenedor es obligatorio.");
      return;
    }
    if (!formData.fecha_carga) {
      setErrorMsg("La fecha de carga es obligatoria.");
      return;
    }
    guardarMutation.mutate(formData);
  };

  // Sube a storage inmediatamente (para obtener URL) y agrega a la lista local.
  // La persistencia en BD ocurre al guardar el contenedor.
  const handleSubirFotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSubiendoFotos(true);
    try {
      const nuevas = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const fileName = `${formData.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const filePath = `vacios/${formData.id}/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("vacios")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("vacios").getPublicUrl(filePath);
        fotosSubidasSesion.current.add(publicUrl);
        nuevas.push(publicUrl);
      }
      setFormData((f) => ({ ...f, fotos_urls: [...(f.fotos_urls || []), ...nuevas] }));
    } catch (err) {
      alert("Error al subir foto: " + err.message);
    } finally {
      setSubiendoFotos(false);
      e.target.value = "";
    }
  };

  const handleQuitarFoto = async (url) => {
    setFormData((f) => ({ ...f, fotos_urls: (f.fotos_urls || []).filter((u) => u !== url) }));
    setFotoAEliminar(null);
    // Si la foto se subió en esta sesión y aún no está en BD, bórrala ya del Storage.
    // Las fotos ya persistidas se borran al guardar (diff en guardarMutation).
    if (fotosSubidasSesion.current.has(url)) {
      fotosSubidasSesion.current.delete(url);
      const ruta = pathFotoStorage(url);
      if (ruta) {
        try {
          await supabase.storage.from("vacios").remove([ruta]);
        } catch (_e) {
          // ignorar errores de limpieza de Storage
        }
      }
    }
  };

  const contadores = useMemo(() => {
    const acc = {};
    for (const e of ESTATUS_VACIOS) acc[e.value] = 0;
    for (const c of contenedores) {
      if (acc[c.estatus] != null) acc[c.estatus] += 1;
    }
    return acc;
  }, [contenedores]);

  const listaFiltrada = useMemo(() => {
    return contenedores.filter((c) => {
      if (filtroEstatus !== "todos" && c.estatus !== filtroEstatus) return false;
      if (filtroConductor !== "todos" && String(c.conductor_carga_id) !== filtroConductor) return false;
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        if (!(c.numero_contenedor || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [contenedores, filtroEstatus, filtroConductor, busqueda]);

  const SelectCatalogo = ({ value, onChange, placeholder, options, getLabel }) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className="rounded-xl">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin asignar</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {getLabel(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gm-primary/15 flex items-center justify-center">
            <Container className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">Control de Vacíos</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Contenedores cargados en el puerto de Manzanillo
            </p>
          </div>
        </div>
        <Button onClick={abrirNuevo} className="rounded-xl font-bold gap-2 bg-gm-primary text-black hover:bg-gm-primary/90">
          <Plus className="w-4 h-4" /> Nuevo Contenedor
        </Button>
      </div>


      {/* Contadores por estatus */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Tarjeta TODOS */}
        <button
          onClick={() => setFiltroEstatus("todos")}
          className={`text-left p-3 rounded-2xl border transition-all ${
            filtroEstatus === "todos" ? "ring-2 ring-gm-primary bg-gm-primary/5 border-gm-primary/30" : "bg-card border-border"
          }`}
        >
          <p className="text-2xl font-black text-foreground">{contenedores.length}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight mt-1">Todos</p>
        </button>
        {ESTATUS_VACIOS.map((e) => (
          <button
            key={e.value}
            onClick={() => setFiltroEstatus(filtroEstatus === e.value ? "todos" : e.value)}
            className={`text-left p-3 rounded-2xl border transition-all ${
              filtroEstatus === e.value ? "ring-2 ring-gm-primary" : ""
            } ${e.value === "pendiente_vacio" ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" : "bg-card border-border"}`}
          >
            <p className="text-2xl font-black text-foreground">{contadores[e.value] || 0}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight mt-1">
              {e.label}
            </p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número de contenedor..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={filtroConductor} onValueChange={setFiltroConductor}>
          <SelectTrigger className="rounded-xl md:w-48">
            <SelectValue placeholder="Conductor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los conductores</SelectItem>
            {conductores.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Container className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay contenedores que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map((c) => {
            const est = getEstatus(c.estatus);
            return (
              <div key={c.id} className="flex bg-card border border-border rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-md">
                {/* Barra lateral de color por estatus */}
                <div className={`w-1.5 shrink-0 ${est.stripe}`} />

                <div className="flex-1 min-w-0 p-4">
                  {/* Fila superior */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    {/* Número + badge + fotos */}
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-lg font-black text-foreground tracking-tight">{c.numero_contenedor}</span>
                      <Popover open={popoverEstatus === c.id} onOpenChange={(open) => setPopoverEstatus(open ? c.id : null)}>
                        <PopoverTrigger asChild>
                          <button className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity shrink-0 ${est.badge}`}>
                            {est.label} <ChevronDown className="w-3 h-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-1.5" align="start" side="bottom">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1 mb-0.5">Cambiar estatus</p>
                          {ESTATUS_VACIOS.map((e) => (
                            <button
                              key={e.value}
                              onClick={() => { actualizarEstatusMutation.mutate({ id: c.id, estatus: e.value }); setPopoverEstatus(null); }}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${e.badge}`}>{e.label}</span>
                              {c.estatus === e.value && <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Acciones */}
                    <div className="flex items-center gap-1 shrink-0">
                      {c.fotos_urls?.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Ver ${c.fotos_urls.length} foto(s)`}
                          title={`Ver fotos (${c.fotos_urls.length})`}
                          className="rounded-lg h-8 px-2 gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                          onClick={() => setGaleriaFotos(c.fotos_urls)}
                        >
                          <Images className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">{c.fotos_urls.length}</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" aria-label="Editar" className="rounded-lg h-8 w-8 p-0 cursor-pointer" onClick={() => abrirEditar(c)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Eliminar" className="rounded-lg h-8 w-8 p-0 text-red-500 hover:bg-red-500/10 cursor-pointer" onClick={() => setContenedorAEliminar(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Cuerpo: dos columnas con etiquetas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Columna CARGA */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-black text-muted-foreground">Cargado · {formatearFecha(c.fecha_carga)}</p>
                      <div className="flex items-center gap-1.5 text-sm text-foreground font-medium truncate">
                        <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{getConductorName(c.conductor_carga_id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{getCamionName(c.camion_carga_id)}</span>
                        {c.remolque_carga_id && <><span className="text-border shrink-0">·</span><span className="truncate shrink-0">{getRemolquePlacas(c.remolque_carga_id)}</span></>}
                      </div>
                    </div>
                    {/* Columna DESTINO */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Destino</p>
                      <div className="flex items-center gap-1.5 text-sm text-foreground font-medium truncate">
                        <Briefcase className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{getClienteName(c.cliente_id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.destino || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: entrega de vacío */}
                  {c.conductor_entrega_id ? (
                    c.estatus === "vacio_entregado" ? (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Entregó vacío{c.lugar_entrega_vacio ? ` · ${c.lugar_entrega_vacio}` : ""}</p>
                          {c.entrega_con_cita && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <Clock className="w-3 h-3" /> Cita{c.horario_cita ? ` ${c.horario_cita}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400 truncate">
                          <PackageOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate font-medium">
                            {getConductorName(c.conductor_entrega_id)}
                            <span className="text-emerald-600/70 dark:text-emerald-500/70 font-normal"> · {getCamionName(c.camion_entrega_id)}{c.fecha_entrega_vacio ? ` · ${formatearFecha(c.fecha_entrega_vacio)}` : ""}</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-dashed border-border">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Entrega programada{c.lugar_entrega_vacio ? ` · ${c.lugar_entrega_vacio}` : ""}</p>
                          {c.entrega_con_cita && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Clock className="w-3 h-3" /> Cita{c.horario_cita ? ` ${c.horario_cita}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {getConductorName(c.conductor_entrega_id)}
                            <span className="font-normal"> · {getCamionName(c.camion_entrega_id)}{c.fecha_entrega_vacio ? ` · ${formatearFecha(c.fecha_entrega_vacio)}` : ""}</span>
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => abrirEntrega(c)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 text-sm font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                    >
                      <PackageOpen className="w-4 h-4" /> Registrar entrega de vacío
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog alta/edición */}
      <Dialog open={dialogAbierto} onOpenChange={cerrarDialogAlta}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {esEdicion ? "Editar Contenedor" : "Nuevo Contenedor"}
            </DialogTitle>
            <DialogDescription>Datos de carga, estatus y entrega del vacío.</DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-2">
            {/* Datos básicos */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-gm-primary/15 flex items-center justify-center shrink-0">
                  <Container className="w-4 h-4 text-yellow-600" />
                </span>
                <p className="text-sm font-black text-foreground">Datos del contenedor</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">Número de contenedor *</Label>
                  <Input
                    value={formData.numero_contenedor}
                    onChange={(e) => setFormData((f) => ({ ...f, numero_contenedor: e.target.value }))}
                    placeholder="Ej. GCXU5355069"
                    className="rounded-xl mt-1 uppercase font-bold tracking-wide focus-visible:ring-gm-primary"
                  />
                </div>
                <div>
                  <Label className="font-bold">Fecha de carga *</Label>
                  <Input
                    type="date"
                    value={formData.fecha_carga}
                    onChange={(e) => setFormData((f) => ({ ...f, fecha_carga: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="font-bold">Cliente</Label>
                  <SelectCatalogo
                    value={formData.cliente_id}
                    onChange={(v) => setFormData((f) => ({ ...f, cliente_id: v }))}
                    placeholder="Selecciona cliente"
                    options={clientes}
                    getLabel={(o) => o.nombre}
                  />
                </div>
                <div>
                  <Label className="font-bold">Destino</Label>
                  <Input
                    value={formData.destino}
                    onChange={(e) => setFormData((f) => ({ ...f, destino: e.target.value }))}
                    placeholder="Ej. SLP, México, Teolayucan"
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Datos de carga */}
            <div className="rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </span>
                <p className="text-sm font-black text-foreground">Carga</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-bold">Conductor</Label>
                  <SelectCatalogo
                    value={formData.conductor_carga_id}
                    onChange={(v) => setFormData((f) => ({ ...f, conductor_carga_id: v }))}
                    placeholder="Conductor"
                    options={conductores}
                    getLabel={(o) => o.nombre}
                  />
                </div>
                <div>
                  <Label className="font-bold">Camión</Label>
                  <SelectCatalogo
                    value={formData.camion_carga_id}
                    onChange={(v) => setFormData((f) => ({ ...f, camion_carga_id: v }))}
                    placeholder="Camión"
                    options={camiones}
                    getLabel={(o) => `${o.nombre}${o.placas ? ` - ${o.placas}` : ""}`}
                  />
                </div>
                <div>
                  <Label className="font-bold">Remolque</Label>
                  <SelectCatalogo
                    value={formData.remolque_carga_id}
                    onChange={(v) => setFormData((f) => ({ ...f, remolque_carga_id: v }))}
                    placeholder="Remolque"
                    options={remolquesChasis}
                    getLabel={(o) => `${o.placas || o.id}`}
                  />
                </div>
              </div>
            </div>

            {/* Estatus y Entrega del vacío: solo en edición */}
            {esEdicion && <>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <Label className="font-black text-sm text-foreground">Estatus</Label>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${getEstatus(formData.estatus).badge}`}>
                  {getEstatus(formData.estatus).label}
                </span>
              </div>
              <Select value={formData.estatus} onValueChange={(v) => setFormData((f) => ({ ...f, estatus: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTATUS_VACIOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.conductor_entrega_id && (
            <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <PackageOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <p className="text-sm font-black text-foreground">Entrega del vacío</p>
                </div>
                {formData.conductor_carga_id && (
                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({
                      ...f,
                      conductor_entrega_id: f.conductor_carga_id,
                      camion_entrega_id: f.camion_carga_id,
                      remolque_entrega_id: f.remolque_carga_id,
                    }))}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Usar mismo chofer de carga
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">Conductor</Label>
                  <SelectCatalogo
                    value={formData.conductor_entrega_id}
                    onChange={(v) => setFormData((f) => ({ ...f, conductor_entrega_id: v }))}
                    placeholder="Conductor"
                    options={conductores}
                    getLabel={(o) => o.nombre}
                  />
                </div>
                <div>
                  <Label className="font-bold">Camión</Label>
                  <SelectCatalogo
                    value={formData.camion_entrega_id}
                    onChange={(v) => setFormData((f) => ({ ...f, camion_entrega_id: v }))}
                    placeholder="Camión"
                    options={camiones}
                    getLabel={(o) => `${o.nombre}${o.placas ? ` - ${o.placas}` : ""}`}
                  />
                </div>
                <div>
                  <Label className="font-bold">Remolque</Label>
                  <SelectCatalogo
                    value={formData.remolque_entrega_id}
                    onChange={(v) => setFormData((f) => ({ ...f, remolque_entrega_id: v }))}
                    placeholder="Remolque"
                    options={remolquesChasis}
                    getLabel={(o) => `${o.placas || o.id}`}
                  />
                </div>
                <div>
                  <Label className="font-bold">Fecha entrega vacío</Label>
                  <Input
                    type="date"
                    value={formData.fecha_entrega_vacio}
                    onChange={(e) => setFormData((f) => ({ ...f, fecha_entrega_vacio: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="font-bold">Lugar de entrega</Label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={formData.entrega_con_cita}
                        onCheckedChange={(v) => setFormData((f) => ({ ...f, entrega_con_cita: !!v, horario_cita: v ? f.horario_cita : "" }))}
                      />
                      <span className="text-sm font-bold text-foreground">Es con cita</span>
                    </label>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <Input
                      value={formData.lugar_entrega_vacio}
                      onChange={(e) => setFormData((f) => ({ ...f, lugar_entrega_vacio: e.target.value }))}
                      placeholder="Ej. CIMA, SSA, Hutchison..."
                      className="rounded-xl flex-1 min-w-0"
                    />
                    {formData.entrega_con_cita && (
                      <Input
                        type="time"
                        value={formData.horario_cita}
                        onChange={(e) => setFormData((f) => ({ ...f, horario_cita: e.target.value }))}
                        className="rounded-xl w-32 shrink-0"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
            </>}

            {/* Notas */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <Label className="font-black text-sm text-foreground">Notas</Label>
              <Input
                value={formData.notas}
                onChange={(e) => setFormData((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Observaciones (ej. daños, resguardo...)"
                className="rounded-xl mt-2"
              />
            </div>

            {/* Fotos */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gm-primary/15 flex items-center justify-center shrink-0">
                    <ImagePlus className="w-4 h-4 text-yellow-600" />
                  </span>
                  <p className="text-sm font-black text-foreground">
                    Fotos del contenedor
                    {formData.fotos_urls?.length > 0 && (
                      <span className="ml-2 text-[11px] font-bold text-muted-foreground">
                        ({formData.fotos_urls.length})
                      </span>
                    )}
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleSubirFotos} disabled={subiendoFotos} />
                  <span className="inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-xl border border-gm-primary/40 bg-gm-primary/10 text-yellow-700 dark:text-yellow-500 hover:bg-gm-primary/20 transition-colors">
                    {subiendoFotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    Agregar fotos
                  </span>
                </label>
              </div>
              {formData.fotos_urls?.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {formData.fotos_urls.map((url) => (
                    <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                      <img
                        src={url}
                        alt="Foto contenedor"
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => setFotoVisor(url)}
                      />
                      <button
                        onClick={() => setFotoAEliminar(url)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin fotos. Documenta el estado del contenedor al cargarlo.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => cerrarDialogAlta(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl font-bold gap-2 bg-gm-primary text-black hover:bg-gm-primary/90"
              onClick={handleGuardar}
              disabled={guardarMutation.isPending}
            >
              {guardarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: registrar / editar entrega del vacío */}
      <Dialog open={dialogEntrega} onOpenChange={setDialogEntrega}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <PackageOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Entrega del vacío
            </DialogTitle>
            <DialogDescription>
              {entregaData.numero_contenedor
                ? `Contenedor ${entregaData.numero_contenedor} — quién, cuándo y dónde se entrega el vacío.`
                : "Quién, cuándo y dónde se entrega el contenedor vacío."}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-4 my-2">
            {entregaData.conductor_carga_id && (
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => setEntregaData((d) => ({
                    ...d,
                    conductor_entrega_id: d.conductor_carga_id,
                    camion_entrega_id: d.camion_carga_id,
                    remolque_entrega_id: d.remolque_carga_id,
                  }))}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Usar mismo chofer de carga
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-bold">Conductor *</Label>
                <SelectCatalogo
                  value={entregaData.conductor_entrega_id}
                  onChange={(v) => setEntregaData((d) => ({ ...d, conductor_entrega_id: v }))}
                  placeholder="Conductor"
                  options={conductores}
                  getLabel={(o) => o.nombre}
                />
              </div>
              <div>
                <Label className="font-bold">Camión</Label>
                <SelectCatalogo
                  value={entregaData.camion_entrega_id}
                  onChange={(v) => setEntregaData((d) => ({ ...d, camion_entrega_id: v }))}
                  placeholder="Camión"
                  options={camiones}
                  getLabel={(o) => `${o.nombre}${o.placas ? ` - ${o.placas}` : ""}`}
                />
              </div>
              <div>
                <Label className="font-bold">Remolque</Label>
                <SelectCatalogo
                  value={entregaData.remolque_entrega_id}
                  onChange={(v) => setEntregaData((d) => ({ ...d, remolque_entrega_id: v }))}
                  placeholder="Remolque"
                  options={remolquesChasis}
                  getLabel={(o) => `${o.placas || o.id}`}
                />
              </div>
              <div>
                <Label className="font-bold">Fecha entrega vacío</Label>
                <Input
                  type="date"
                  value={entregaData.fecha_entrega_vacio}
                  onChange={(e) => setEntregaData((d) => ({ ...d, fecha_entrega_vacio: e.target.value }))}
                  className="rounded-xl mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-bold">Lugar de entrega</Label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={entregaData.entrega_con_cita}
                      onCheckedChange={(v) => setEntregaData((d) => ({ ...d, entrega_con_cita: !!v, horario_cita: v ? d.horario_cita : "" }))}
                    />
                    <span className="text-sm font-bold text-foreground">Es con cita</span>
                  </label>
                </div>
                <div className="flex gap-3 mt-1">
                  <Input
                    value={entregaData.lugar_entrega_vacio}
                    onChange={(e) => setEntregaData((d) => ({ ...d, lugar_entrega_vacio: e.target.value }))}
                    placeholder="Ej. CIMA, SSA, Hutchison..."
                    className="rounded-xl flex-1 min-w-0"
                  />
                  {entregaData.entrega_con_cita && (
                    <Input
                      type="time"
                      value={entregaData.horario_cita}
                      onChange={(e) => setEntregaData((d) => ({ ...d, horario_cita: e.target.value }))}
                      className="rounded-xl w-32 shrink-0"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setDialogEntrega(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl font-bold gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleGuardarEntrega}
              disabled={guardarEntregaMutation.isPending}
            >
              {guardarEntregaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Guardar entrega
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Galería rápida desde tarjeta */}
      <Dialog open={!!galeriaFotos} onOpenChange={(open) => !open && setGaleriaFotos(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Fotos del contenedor</DialogTitle>
            <DialogDescription>{galeriaFotos?.length} foto(s)</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 pb-2">
            {galeriaFotos?.map((url) => (
              <div
                key={url}
                className="aspect-square rounded-xl overflow-hidden border border-border cursor-zoom-in hover:opacity-90 transition-opacity"
                onClick={() => { setGaleriaFotos(null); setFotoVisor(url); }}
              >
                <img src={url} alt="Foto contenedor" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visor de fotos */}
      <VisorImagen url={fotoVisor} onClose={() => setFotoVisor(null)} />

      {/* Confirmar eliminar contenedor */}
      <AlertDialog open={!!contenedorAEliminar} onOpenChange={(open) => !open && setContenedorAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contenedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro del contenedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => eliminarMutation.mutate(contenedorAEliminar)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar quitar foto */}
      <AlertDialog open={!!fotoAEliminar} onOpenChange={(open) => !open && setFotoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar foto?</AlertDialogTitle>
            <AlertDialogDescription>
              La foto se quitará de este contenedor al guardar los cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleQuitarFoto(fotoAEliminar)}>
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
