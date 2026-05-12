import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  FileText,
  MapPin,
  Gauge,
  Calendar,
  Loader2,
  ArrowLeftRight,
  Route,
  User,
  Truck,
  Trash2,
  Edit,
  Plus,
  Save,
  X,
  ArrowRight,
  Ticket,
  Fuel,
  ArrowLeft,
  Layers,
  Briefcase,
} from "lucide-react";
import { format, getISOWeek, getYear } from "date-fns";
import { es } from "date-fns/locale";
import FiltrosViajes from "@/components/fuel/FiltrosViajes";

const FECHA_LIMITE_ARCHIVO = '2026-04-24';

export default function FuelViajes() {
  const location = useLocation();
  const stateData = location.state || {};
  const queryClient = useQueryClient();
  const [fechaInicio, setFechaInicio] = useState(stateData.fechaInicio || "");
  const [fechaFin, setFechaFin] = useState(stateData.fechaFin || "");
  const [conductorFiltro, setConductorFiltro] = useState(stateData.conductorFiltro || "todos");
  const [camionFiltro, setCamionFiltro] = useState("todos");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [rutaFiltro, setRutaFiltro] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState(stateData.periodoFiltro || "todos");
  const [viajeAEliminar, setViajeAEliminar] = useState(null);
  const [viajeEditando, setViajeEditando] = useState(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [idResaltado, setIdResaltado] = useState(stateData.scrollToId || null);
  const [filtroIdDirecto, setFiltroIdDirecto] = useState(stateData.scrollToId || null);

  // Limpiar resaltado (pero mantener el filtro si el usuario así lo desea)
  React.useEffect(() => {
    if (stateData.scrollToId) {
      setFiltroIdDirecto(stateData.scrollToId);
      setIdResaltado(stateData.scrollToId);
      const timer = setTimeout(() => setIdResaltado(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [stateData.scrollToId]);



  const [formData, setFormData] = useState({
    fecha: "",
    fecha_llegada: "",
    conductor_id: "",
    conductor_nombre: "",
    camion_id: "",
    camion_nombre: "",
    camion_placas: "",
    tipo_viaje: "Sencillo",
    ruta_ida: "",
    kilometros_ida: "",
    rutas_adicionales: [],
    ruta_regreso: "",
    kilometros_regreso: "",
    litros_combustible: "",
    costo_combustible: "",
    casetas_ida: "",
    casetas_regreso: "",
    sinCasetas: false,
    sinDiesel: false,
    notas: "",
  });

  const { data: viajes = [], isLoading } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Viaje")
        .select("*")
        .gte("fecha", FECHA_LIMITE_ARCHIVO)
        .order("fecha", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: remolques = [] } = useQuery({
    queryKey: ["remolques"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Remolque").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Cliente").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: viajesRegistrados = [] } = useQuery({
    queryKey: ["viajesRegistradosAll"],
    queryFn: async () => {
      const { data, error } = await supabase.from("viajes_registrados").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const getClienteDelViaje = (viaje) => {
    if (!viaje) return null;
    
    // 1. Intento por ID directo (el más preciso)
    let vr = null;
    if (viaje.viaje_id) {
      vr = viajesRegistrados.find((v) => String(v.id) === String(viaje.viaje_id));
    }
    
    // 2. Intento por Validación Inteligente (Misma que Programa de Cargas)
    if (!vr) {
      const fechaBusqueda = viaje.fecha ? viaje.fecha.split("T")[0] : "";
      vr = viajesRegistrados.find((v) => {
        const matchFecha = v.fecha_viaje === fechaBusqueda;
        const matchConductor = String(v.conductor_id) === String(viaje.conductor_id);
        const matchCamion = String(v.camion_id) === String(viaje.camion_id);
        return matchFecha && matchConductor && matchCamion;
      });
    }

    if (!vr) return null;
    const cliente = clientes.find((c) => String(c.id) === String(vr.cliente_id));
    return cliente ? cliente.nombre : null;
  };

  const getRemolquePlacas = (id) => {
    const r = remolques.find((r) => String(r.id) === String(id));
    return r ? r.placas : "";
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

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("Viaje").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajes"] });
      setViajeAEliminar(null);
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: result, error } = await supabase
        .from("Viaje")
        .update(data)
        .eq("id", id)
        .select();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: async (data, variables) => {
      try {
        // Sincronizar estado con viajes_registrados
        const hasFuel = parseFloat(variables.data.litros_combustible || 0) > 0;
        
        // Match por fecha/conductor/camion (ya que Viaje no tiene viaje_id)
        const fechaMatch = typeof variables.data.fecha === 'string' 
          ? variables.data.fecha.split("T")[0] 
          : variables.data.fecha;

        await supabase
          .from("viajes_registrados")
          .update({ combustible_registrado: hasFuel })
          .match({
            fecha_viaje: fechaMatch,
            conductor_id: variables.data.conductor_id,
            camion_id: variables.data.camion_id
          });
      } catch (err) {
        console.error("Error syncing status:", err);
      }

      queryClient.invalidateQueries({ queryKey: ["viajes"] });
      queryClient.invalidateQueries({ queryKey: ["viajesRegistrados"] });
      cerrarDialog();
    },
    onError: (err) => {
      console.error("Update Error:", err);
      window.alert("Error al guardar: " + err.message);
    }
  });

  const viajesFiltrados = useMemo(() => viajes.filter((viaje) => {
    if (filtroIdDirecto) {
      return String(viaje.id) === String(filtroIdDirecto);
    }
    let cumpleFiltros = true;
    const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "";
    if (
      periodoFiltro !== "todos" &&
      periodoFiltro !== "personalizado" &&
      periodoFiltro.startsWith("semana-")
    ) {
      const semanaSeleccionada = parseInt(periodoFiltro.split("-")[1]);
      const fechaViaje = new Date(`${viaje.fecha}T12:00:00`);
      const semanaViaje = getISOWeek(fechaViaje);
      const anioViaje = getYear(fechaViaje);
      const anioActual = getYear(new Date());
      if (anioViaje !== anioActual || semanaViaje !== semanaSeleccionada)
        cumpleFiltros = false;
    } else {
      if (fechaInicio && viaje.fecha < fechaInicio) cumpleFiltros = false;
      if (fechaFin && viaje.fecha > fechaFin) cumpleFiltros = false;
    }
    if (conductorFiltro !== "todos" && String(viaje.conductor_id) !== conductorFiltro)
      cumpleFiltros = false;
    if (camionFiltro !== "todos" && String(viaje.camion_id) !== camionFiltro)
      cumpleFiltros = false;
    if (clienteFiltro !== "todos") {
      const clienteNombre = getClienteDelViaje(viaje);
      const clienteIdMatch = clientes.find(c => c.nombre === clienteNombre)?.id;
      if (String(clienteIdMatch) !== clienteFiltro) cumpleFiltros = false;
    }
    if (rutaFiltro && !rutaPrincipal.toLowerCase().includes(rutaFiltro.toLowerCase()))
      cumpleFiltros = false;
    return cumpleFiltros;
  }), [viajes, filtroIdDirecto, periodoFiltro, fechaInicio, fechaFin, conductorFiltro, camionFiltro, clienteFiltro, rutaFiltro, clientes, viajesRegistrados]);

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setConductorFiltro("todos");
    setCamionFiltro("todos");
    setClienteFiltro("todos");
    setRutaFiltro("");
    setPeriodoFiltro("todos");
  };

  const confirmarEliminar = (viaje) => setViajeAEliminar(viaje);
  const handleEliminar = () => {
    if (viajeAEliminar) eliminarMutation.mutate(viajeAEliminar.id);
  };

  const abrirDialogEditar = (viaje) => {
    setViajeEditando(viaje);
    const rutasAdicionales = Array.isArray(viaje.rutas_adicionales)
      ? viaje.rutas_adicionales
      : [];
    
    // Normalizar fechas para los inputs tipo date (YYYY-MM-DD)
    const fSalida = viaje.fecha ? viaje.fecha.split("T")[0] : "";
    const fLlegada = viaje.fecha_llegada ? viaje.fecha_llegada.split("T")[0] : "";

    setFormData({
      fecha: fSalida,
      fecha_llegada: fLlegada,
      conductor_id: viaje.conductor_id ? String(viaje.conductor_id) : "",
      conductor_nombre: viaje.conductor_nombre || "",
      camion_id: viaje.camion_id ? String(viaje.camion_id) : "",
      camion_nombre: viaje.camion_nombre || "",
      camion_placas: viaje.camion_placas || "",
      tipo_viaje: viaje.tipo_viaje || "Sencillo",
      ruta_ida: viaje.ruta_ida || viaje.ruta || "",
      kilometros_ida: viaje.kilometros_ida || viaje.kilometros || "",
      rutas_adicionales: rutasAdicionales,
      ruta_regreso: viaje.ruta_regreso || "",
      kilometros_regreso: viaje.kilometros_regreso || "",
      litros_combustible: viaje.litros_combustible ?? "",
      costo_combustible: viaje.costo_combustible ?? "",
      sinDiesel: viaje.litros_combustible === 0,
      casetas_ida: viaje.casetas_ida ?? "",
      casetas_regreso: viaje.casetas_regreso ?? "",
      sinCasetas: (viaje.casetas_ida === 0 && viaje.casetas_regreso === 0),
      remolque_id: viaje.remolque_id ? String(viaje.remolque_id) : "",
      remolque2_id: viaje.remolque2_id ? String(viaje.remolque2_id) : "",
      viaje_id: viaje.viaje_id || null,
      notas: viaje.notas || "",
    });
    setDialogAbierto(true);
  };

  // Efecto para abrir edición automáticamente si viene del programa de cargas
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (stateData.editId && viajes.length > 0 && !autoOpenedRef.current) {
      const v = viajes.find(x => String(x.id) === String(stateData.editId));
      if (v) {
        autoOpenedRef.current = true;
        abrirDialogEditar(v);
      }
    }
  }, [stateData.editId, viajes]);

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setViajeEditando(null);
    setFormData({
      fecha: "",
      fecha_llegada: "",
      conductor_id: "",
      conductor_nombre: "",
      camion_id: "",
      camion_nombre: "",
      camion_placas: "",
      tipo_viaje: "Sencillo",
      ruta_ida: "",
      kilometros_ida: "",
      rutas_adicionales: [],
      ruta_regreso: "",
      kilometros_regreso: "",
      litros_combustible: "",
      costo_combustible: "",
      casetas_ida: "",
      casetas_regreso: "",
      remolque_id: "",
      remolque2_id: "",
      viaje_id: null,
      notas: "",
    });
  };

  const handleConductorChange = (conductorId) => {
    const conductor = conductores.find((c) => String(c.id) === conductorId);
    setFormData((prev) => ({
      ...prev,
      conductor_id: conductorId,
      conductor_nombre: conductor?.nombre || "",
    }));
  };
  const handleCamionChange = (camionId) => {
    const camion = camiones.find((c) => String(c.id) === camionId);
    setFormData((prev) => ({
      ...prev,
      camion_id: camionId,
      camion_nombre: camion?.nombre || "",
      camion_placas: camion?.placas || "",
    }));
  };
  const agregarRutaAdicional = () =>
    setFormData((prev) => ({
      ...prev,
      rutas_adicionales: [
        ...prev.rutas_adicionales,
        { ruta: "", kilometros: "" },
      ],
    }));
  const eliminarRutaAdicional = (index) =>
    setFormData((prev) => ({
      ...prev,
      rutas_adicionales: prev.rutas_adicionales.filter((_, i) => i !== index),
    }));
  const actualizarRutaAdicional = (index, campo, valor) => {
    const nuevasRutas = [...formData.rutas_adicionales];
    if (nuevasRutas[index]) {
      nuevasRutas[index][campo] = valor;
      setFormData((prev) => ({ ...prev, rutas_adicionales: nuevasRutas }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const kmIda = parseFloat(formData.kilometros_ida) || 0;
    const kmRegreso = parseFloat(formData.kilometros_regreso) || 0;
    const kmAdicionales = formData.rutas_adicionales.reduce(
      (sum, ruta) => sum + parseFloat(ruta.kilometros || 0),
      0,
    );
    const kmTotal = kmIda + kmAdicionales + kmRegreso;
    let litros = formData.litros_combustible !== "" ? parseFloat(formData.litros_combustible) : null;
    let costoFuel = formData.costo_combustible !== "" ? parseFloat(formData.costo_combustible) : null;

    if (formData.sinDiesel) {
      litros = 0;
      costoFuel = 0;
    }

    let casetasIda = formData.casetas_ida !== "" ? parseFloat(formData.casetas_ida) : null;
    let casetasRegreso = formData.casetas_regreso !== "" ? parseFloat(formData.casetas_regreso) : null;

    if (formData.sinCasetas) {
      casetasIda = 0;
      casetasRegreso = 0;
    }

    const safeParseInt = (val) => {
      if (val === null || val === undefined || val === "") return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    const datosViaje = {
      fecha: formData.fecha,
      fecha_llegada: formData.fecha_llegada || null,
      conductor_id: safeParseInt(formData.conductor_id),
      conductor_nombre: formData.conductor_nombre,
      camion_id: safeParseInt(formData.camion_id),
      camion_nombre: formData.camion_nombre,
      camion_placas: formData.camion_placas,
      tipo_viaje: formData.tipo_viaje,
      ruta_ida: formData.ruta_ida,
      kilometros_ida: kmIda,
      rutas_adicionales: formData.rutas_adicionales.map((r) => ({
        ruta: r.ruta,
        kilometros: parseFloat(r.kilometros || 0),
      })),
      ruta_regreso: formData.ruta_regreso,
      kilometros_regreso: kmRegreso,
      kilometros_total: kmTotal,
      litros_combustible: litros,
      km_por_litro: (litros && litros > 0) ? kmTotal / litros : 0,
      costo_combustible: costoFuel,
      casetas_ida: casetasIda,
      casetas_regreso: casetasRegreso,
      remolque_id: safeParseInt(formData.remolque_id),
      remolque2_id: safeParseInt(formData.remolque2_id),
      notas: formData.notas,
    };
    if (viajeEditando)
      actualizarMutation.mutate({ id: viajeEditando.id, data: datosViaje });
  };

  const getEficienciaColor = (kmPorLitro) => {
    if (kmPorLitro > 2.25)
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    if (kmPorLitro >= 2.0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  };

  // Funciones corregidas sin usar Math.round()
  const formatCurrency = (amount) =>
    Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  const formatNumber = (num, decimals = 0) =>
    Number(num).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const clienteDelFormData = getClienteDelViaje(formData);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Registro de Viajes
          </h1>
          <p className="text-muted-foreground">
            Consulta el historial completo de viajes realizados
          </p>
        </div>

        <div className="mb-8">
          <FiltrosViajes
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}
            setFechaFin={setFechaFin}
            conductorFiltro={conductorFiltro}
            setConductorFiltro={setConductorFiltro}
            camionFiltro={camionFiltro}
            setCamionFiltro={setCamionFiltro}
            clienteFiltro={clienteFiltro}
            setClienteFiltro={setClienteFiltro}
            rutaFiltro={rutaFiltro}
            setRutaFiltro={setRutaFiltro}
            periodoFiltro={periodoFiltro}
            setPeriodoFiltro={setPeriodoFiltro}
            conductores={conductores}
            camiones={camiones}
            clientes={clientes}
            limpiarFiltros={limpiarFiltros}
          />
        </div>

        {/* TARJETAS RESUMEN ARRIBA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-none shadow-lg bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 dark:bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total Viajes
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(viajesFiltrados.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 dark:bg-purple-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Kilómetros
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(
                      viajesFiltrados.reduce(
                        (sum, v) => sum + (v.kilometros_total || 0),
                        0,
                      ),
                      0,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 dark:bg-orange-600 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Litros
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(
                      viajesFiltrados.reduce(
                        (sum, v) => sum + (v.litros_combustible || 0),
                        0,
                      ),
                      0,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 dark:bg-green-600 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Promedio
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {(() => {
                      const totalKm = viajesFiltrados.reduce(
                        (sum, v) => sum + (v.kilometros_total || 0),
                        0,
                      );
                      const totalLitros = viajesFiltrados.reduce(
                        (sum, v) => sum + (v.litros_combustible || 0),
                        0,
                      );
                      return totalLitros > 0
                        ? formatNumber(totalKm / totalLitros, 2)
                        : "0.00";
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-foreground">
                Historial de Viajes
              </CardTitle>
              {filtroIdDirecto && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setFiltroIdDirecto(null)}
                  className="rounded-xl font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300"
                >
                  Ver todos los viajes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {viajesFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No hay viajes que coincidan con los filtros
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {viajesFiltrados.map((viaje) => {
                  const rutasAdicionales = Array.isArray(
                    viaje.rutas_adicionales,
                  )
                    ? viaje.rutas_adicionales
                    : [];
                  const tieneRegreso =
                    viaje.ruta_regreso && viaje.kilometros_regreso;
                  const tieneAdicionales = rutasAdicionales.length > 0;
                  const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "-";
                  const clienteDelViaje = getClienteDelViaje(viaje);
                  const kmTotal =
                    viaje.kilometros_total || viaje.kilometros || 0;
                  const kmIda = viaje.kilometros_ida || viaje.kilometros || 0;
                  const kmRegreso = viaje.kilometros_regreso || 0;
                  const litros = viaje.litros_combustible || 0;
                  const eficiencia = viaje.km_por_litro || 0;
                  const tipoViaje = viaje.tipo_viaje || "Sencillo";
                  const isFull = tipoViaje === "FULL";

                  const costoCombustible = viaje.costo_combustible || 0;
                  const costoCasetas =
                    (viaje.casetas_ida || 0) + (viaje.casetas_regreso || 0);

                  return (
                    <Card
                      key={viaje.id}
                      className={`border bg-card hover:shadow-md transition-all duration-300 ${
                        String(viaje.id) === String(idResaltado)
                          ? "border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-900/10 animate-in fade-in zoom-in duration-500"
                          : "border-border hover:border-indigo-500/30"
                      }`}
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-center">
                            {/* COL 1: FECHAS */}
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-start gap-3 lg:gap-5">
                                <div className="flex items-center gap-2 lg:gap-3">
                                  <div className="p-1.5 lg:p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                    <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  </div>
                                  <div>
                                    <span className="block text-[10px] lg:text-xs uppercase font-black text-muted-foreground tracking-widest">
                                      Salida
                                    </span>
                                    <span className="text-sm lg:text-base font-black text-foreground whitespace-nowrap">
                                      {format(
                                        new Date(`${viaje.fecha}T12:00:00`),
                                        "dd MMM",
                                        { locale: es },
                                      )}
                                    </span>
                                  </div>
                                </div>
                                {viaje.fecha_llegada && (
                                  <div className="flex items-center gap-2 lg:gap-3">
                                    <div className="p-1.5 lg:p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                                      <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    </div>
                                    <div>
                                      <span className="block text-[10px] lg:text-xs uppercase font-black text-muted-foreground tracking-widest">
                                        Llegada
                                      </span>
                                      <span className="text-sm lg:text-base font-black text-foreground whitespace-nowrap">
                                        {format(
                                          new Date(
                                            `${viaje.fecha_llegada}T12:00:00`,
                                          ),
                                          "dd MMM",
                                          { locale: es },
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="pt-3 border-t border-border/60 mt-3 space-y-2 lg:space-y-3">
                                {viaje.conductor_nombre && (
                                  <div className="flex items-center gap-2 lg:gap-3">
                                    <User className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 flex-shrink-0" />
                                    <span className="text-xs lg:text-sm font-bold text-foreground line-clamp-1">
                                      {viaje.conductor_nombre}
                                    </span>
                                  </div>
                                )}
                                {viaje.camion_nombre && (
                                  <div className="flex items-center gap-2 lg:gap-3">
                                    <Truck className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 flex-shrink-0" />
                                    <span className="text-xs lg:text-sm font-bold text-foreground line-clamp-1">
                                      {viaje.camion_nombre}{" "}
                                      <span className="hidden sm:inline text-[10px] lg:text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-1 whitespace-nowrap">
                                        {viaje.camion_placas}
                                      </span>
                                    </span>
                                  </div>
                                )}
                                {(viaje.remolque_id || viaje.remolque2_id) && (
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm text-foreground font-medium">
                                      {viaje.remolque2_id ? "Remolques: " : "Remolque: "}
                                      <span className="text-muted-foreground font-normal">
                                        {getRemolquePlacas(viaje.remolque_id)}
                                        {viaje.remolque2_id && ` / ${getRemolquePlacas(viaje.remolque2_id)}`}
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* COL 2: RUTAS */}
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                {clienteDelViaje && (
                                  <div className="flex items-center gap-2 mb-1 p-1.5 lg:p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-fit">
                                    <Briefcase className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-500" />
                                    <span className="text-[11px] lg:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 line-clamp-1">
                                      {clienteDelViaje}
                                    </span>
                                  </div>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`w-fit text-[9px] lg:text-xs px-2 py-0.5 uppercase font-black tracking-widest mb-1 ${isFull ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}
                                >
                                  {tipoViaje}
                                </Badge>
                                <div className="flex items-start gap-2 lg:gap-3">
                                  <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm lg:text-base font-bold text-foreground leading-tight line-clamp-2">
                                    {rutaPrincipal}
                                  </span>
                                </div>
                                {tieneAdicionales &&
                                  rutasAdicionales.map((rutaAd, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-2 ml-6"
                                    >
                                      <Route className="w-3 h-3 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm text-muted-foreground">
                                        {rutaAd.ruta}
                                      </span>
                                    </div>
                                  ))}
                                {tieneRegreso && (
                                  <div className="flex items-start gap-2">
                                    <ArrowLeftRight className="w-4 h-4 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-foreground">
                                      {viaje.ruta_regreso}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* COL 3: COSTOS Y KILÓMETROS */}
                            <div className="space-y-3">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">
                                    Kilómetros:
                                  </span>
                                  <span className="text-sm lg:text-base font-black text-foreground">
                                    {formatNumber(kmTotal, 0)} <span className="text-[10px] lg:text-xs font-medium opacity-60">KM</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">
                                    Litros:
                                  </span>
                                  <span className="text-sm lg:text-base font-black text-foreground text-right">
                                    {litros > 0 ? (
                                      <>
                                        {formatNumber(litros, 0)} <span className="text-[10px] lg:text-xs font-medium opacity-60">L</span>
                                      </>
                                    ) : (
                                      <span className="text-[9px] lg:text-[11px] font-black text-red-500 uppercase tracking-tighter bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/50">
                                        Sin consumo registrado
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {costoCombustible > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">
                                      Combustible:
                                    </span>
                                    <span className="text-sm lg:text-base font-black text-foreground">
                                      ${formatCurrency(costoCombustible)}
                                    </span>
                                  </div>
                                )}
                                {costoCasetas > 0 && (
                                  <div className="space-y-1.5 mt-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase">
                                        CASETAS:
                                      </span>
                                      <span className="text-sm lg:text-base font-black text-foreground">
                                        ${formatCurrency(costoCasetas)}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end space-y-0.5">
                                      <div className="flex items-center gap-1.5 lg:gap-2 px-1.5 lg:px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-border/40">
                                        <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase">Ida:</span>
                                        <span className="text-[10px] lg:text-[11px] font-black text-slate-700 dark:text-slate-300">${formatCurrency(viaje.casetas_ida || 0)}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 lg:gap-2 px-1.5 lg:px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-border/40">
                                        <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase">Vuelta:</span>
                                        <span className="text-[10px] lg:text-[11px] font-black text-slate-700 dark:text-slate-300">${formatCurrency(viaje.casetas_regreso || 0)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* COL 4: EFICIENCIA */}
                            <div className="space-y-3">
                              <div className="flex flex-col items-center justify-center h-full">
                                <Badge
                                  variant="outline"
                                  className={`${getEficienciaColor(eficiencia)} border font-semibold text-base px-4 py-2 mb-2`}
                                >
                                  <Gauge className="w-4 h-4 mr-2" />
                                  {formatNumber(eficiencia, 2)} km/L
                                </Badge>
                                {viaje.notas && (
                                  <p className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
                                    {viaje.notas}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* BOTONES */}
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirDialogEditar(viaje)}
                              className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmarEliminar(viaje)}
                              className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogAbierto} onOpenChange={cerrarDialog}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Editar Viaje
              </DialogTitle>
            </DialogHeader>
             <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {clienteDelFormData && (
                <div className="p-4 bg-slate-100/50 dark:bg-muted/30 border border-border rounded-xl flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente Programado</p>
                    <p className="font-bold text-lg text-foreground">{clienteDelFormData}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-fecha"
                    className="font-semibold text-foreground"
                  >
                    Salida <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors pointer-events-none" />
                    <Input
                      id="edit-fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha: e.target.value })
                      }
                      required
                      className="pl-10 bg-background border-input cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-fecha-llegada"
                    className="font-semibold text-foreground"
                  >
                    Llegada
                  </Label>
                  <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors pointer-events-none" />
                    <Input
                      id="edit-fecha-llegada"
                      type="date"
                      value={formData.fecha_llegada}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fecha_llegada: e.target.value,
                        })
                      }
                      className="pl-10 bg-background border-input cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-conductor"
                    className="font-semibold text-foreground"
                  >
                    Conductor
                  </Label>
                  <Select
                    value={formData.conductor_id}
                    onValueChange={handleConductorChange}
                  >
                    <SelectTrigger className="bg-background border-input">
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
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-camion"
                    className="font-semibold text-foreground"
                  >
                    Camión
                  </Label>
                  <Select
                    value={formData.camion_id}
                    onValueChange={handleCamionChange}
                  >
                    <SelectTrigger className="bg-background border-input">
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
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo_viaje}
                    onValueChange={(val) =>
                      setFormData({ ...formData, tipo_viaje: val })
                    }
                    required
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sencillo">Sencillo</SelectItem>
                      <SelectItem value="FULL">FULL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    Remolque 1
                  </Label>
                  <Select
                    value={formData.remolque_id}
                    onValueChange={(val) => setFormData({ ...formData, remolque_id: val })}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {remolques.map((r) => {
                        const abv = getAbreviacionTipo(r.tipo);
                        return (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {abv ? `[${abv}] ` : ""}{r.placas}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo_viaje === "FULL" && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Remolque 2
                    </Label>
                    <Select
                      value={formData.remolque2_id}
                      onValueChange={(val) => setFormData({ ...formData, remolque2_id: val })}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {remolques.map((r) => {
                          const abv = getAbreviacionTipo(r.tipo);
                          return (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {abv ? `[${abv}] ` : ""}{r.placas}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900">
                <h3 className="font-bold text-foreground">Ruta de Ida</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-ruta-ida"
                      className="font-semibold text-foreground"
                    >
                      Ruta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-ruta-ida"
                      value={formData.ruta_ida}
                      onChange={(e) =>
                        setFormData({ ...formData, ruta_ida: e.target.value })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-km-ida"
                      className="font-semibold text-foreground"
                    >
                      Kilómetros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-km-ida"
                      type="number"
                      step="0.1"
                      value={formData.kilometros_ida}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kilometros_ida: e.target.value,
                        })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground">
                    Rutas Adicionales
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarRutaAdicional}
                    className="gap-2 bg-background hover:bg-muted"
                  >
                    <Plus className="w-4 h-4" /> Agregar Ruta
                  </Button>
                </div>
                {Array.isArray(formData.rutas_adicionales) &&
                  formData.rutas_adicionales.length > 0 && (
                    <div className="space-y-3">
                      {formData.rutas_adicionales.map((ruta, index) => (
                        <div
                          key={index}
                          className="grid md:grid-cols-[1fr_auto_auto] gap-3 p-3 bg-background/50 rounded-lg border border-border"
                        >
                          <Input
                            placeholder="Ej: Ciudad B - Ciudad C"
                            value={ruta.ruta || ""}
                            onChange={(e) =>
                              actualizarRutaAdicional(
                                index,
                                "ruta",
                                e.target.value,
                              )
                            }
                            className="bg-background border-input"
                          />
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="km"
                            value={ruta.kilometros || ""}
                            onChange={(e) =>
                              actualizarRutaAdicional(
                                index,
                                "kilometros",
                                e.target.value,
                              )
                            }
                            className="w-32 bg-background border-input"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarRutaAdicional(index)}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className="space-y-4 p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900">
                <h3 className="font-bold text-foreground">Ruta de Regreso</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-ruta-regreso"
                      className="font-semibold text-foreground"
                    >
                      Ruta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-ruta-regreso"
                      value={formData.ruta_regreso}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ruta_regreso: e.target.value,
                        })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-km-regreso"
                      className="font-semibold text-foreground"
                    >
                      Kilómetros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-km-regreso"
                      type="number"
                      step="0.1"
                      value={formData.kilometros_regreso}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kilometros_regreso: e.target.value,
                        })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-bold text-foreground">Combustible</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/50">
                    <Checkbox 
                      id="edit-no-diesel" 
                      checked={formData.sinDiesel}
                      onCheckedChange={(checked) => setFormData({ ...formData, sinDiesel: !!checked, litros_combustible: !!checked ? 0 : formData.litros_combustible, costo_combustible: !!checked ? 0 : formData.costo_combustible })}
                    />
                    <Label htmlFor="edit-no-diesel" className="text-xs font-bold cursor-pointer text-green-700 dark:text-green-400">
                      Aún no ha cargado diesel
                    </Label>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-litros"
                      className="font-semibold text-foreground"
                    >
                      Litros
                    </Label>
                    <Input
                      id="edit-litros"
                      type="number"
                      step="0.01"
                      value={formData.sinDiesel ? "0" : formData.litros_combustible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          litros_combustible: e.target.value,
                        })
                      }
                      disabled={formData.sinDiesel}
                      className="bg-background border-input disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-costo"
                      className="font-semibold text-foreground"
                    >
                      Costo Combustible ($)
                    </Label>
                    <Input
                      id="edit-costo"
                      type="number"
                      step="0.01"
                      value={formData.sinDiesel ? "0" : formData.costo_combustible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costo_combustible: e.target.value,
                        })
                      }
                      disabled={formData.sinDiesel}
                      className="bg-background border-input disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* CASETAS */}
              <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-foreground">Casetas</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <Checkbox 
                      id="edit-no-casetas" 
                      checked={formData.sinCasetas}
                      onCheckedChange={(checked) => setFormData({ ...formData, sinCasetas: !!checked })}
                    />
                    <Label htmlFor="edit-no-casetas" className="text-xs font-bold cursor-pointer text-indigo-700 dark:text-indigo-400">
                      No pagó casetas
                    </Label>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Casetas Ida ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sinCasetas ? "0" : formData.casetas_ida}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          casetas_ida: e.target.value,
                        })
                      }
                      disabled={formData.sinCasetas}
                      className="bg-background border-input disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Casetas Regreso ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sinCasetas ? "0" : formData.casetas_regreso}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          casetas_regreso: e.target.value,
                        })
                      }
                      disabled={formData.sinCasetas}
                      className="bg-background border-input disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-notas"
                  className="font-semibold text-foreground"
                >
                  Notas Adicionales
                </Label>
                <Textarea
                  id="edit-notas"
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                  rows={4}
                  className="bg-background border-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrarDialog}
                  className="flex-1 bg-background hover:bg-muted"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={actualizarMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {actualizarMutation.isPending ? (
                    <>
                      {" "}
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      Guardando...{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <Save className="w-4 h-4 mr-2" /> Guardar Cambios{" "}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!viajeAEliminar}
          onOpenChange={() => setViajeAEliminar(null)}
        >
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background hover:bg-muted">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEliminar}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
