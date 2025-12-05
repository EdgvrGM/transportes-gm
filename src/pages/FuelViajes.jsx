import React, { useState } from "react";
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
  Filter,
  X,
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FuelViajes() {
  const queryClient = useQueryClient();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [conductorFiltro, setConductorFiltro] = useState("todos");
  const [camionFiltro, setCamionFiltro] = useState("todos");
  const [rutaFiltro, setRutaFiltro] = useState("");
  const [viajeAEliminar, setViajeAEliminar] = useState(null);
  const [viajeEditando, setViajeEditando] = useState(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [formData, setFormData] = useState({
    fecha: "",
    conductor_id: "",
    conductor_nombre: "",
    camion_id: "",
    camion_nombre: "",
    camion_placas: "",
    ruta_ida: "",
    kilometros_ida: "",
    rutas_adicionales: [],
    ruta_regreso: "",
    kilometros_regreso: "",
    litros_combustible: "",
    costo_combustible: "",
    notas: "",
  });

  // *** CAMBIO: Usar supabase para obtener viajes ***
  const { data: viajes = [], isLoading } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Viaje")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // *** CAMBIO: Usar supabase para obtener conductores ***
  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // *** CAMBIO: Usar supabase para obtener camiones ***
  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // *** CAMBIO: Usar supabase para eliminar viajes ***
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

  // *** CAMBIO: Usar supabase para actualizar viajes ***
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajes"] });
      cerrarDialog();
    },
  });

  // --- Lógica de filtrado, limpieza, confirmación (sin cambios) ---
  const viajesFiltrados = viajes.filter((viaje) => {
    let cumpleFiltros = true;
    const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "";

    if (fechaInicio && viaje.fecha < fechaInicio) cumpleFiltros = false;
    if (fechaFin && viaje.fecha > fechaFin) cumpleFiltros = false;
    // Corregir comparación de ID (usar === en lugar de !== para comparar IDs numéricos/UUIDs)
    if (
      conductorFiltro !== "todos" &&
      String(viaje.conductor_id) !== conductorFiltro
    )
      cumpleFiltros = false;
    if (camionFiltro !== "todos" && String(viaje.camion_id) !== camionFiltro)
      cumpleFiltros = false;
    if (
      rutaFiltro &&
      !rutaPrincipal.toLowerCase().includes(rutaFiltro.toLowerCase())
    )
      cumpleFiltros = false;

    return cumpleFiltros;
  });

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setConductorFiltro("todos");
    setCamionFiltro("todos");
    setRutaFiltro("");
  };

  const confirmarEliminar = (viaje) => {
    setViajeAEliminar(viaje);
  };

  const handleEliminar = () => {
    if (viajeAEliminar) {
      eliminarMutation.mutate(viajeAEliminar.id);
    }
  };

  // --- Lógica del diálogo de edición (sin cambios en la lógica interna, solo llamadas a Supabase) ---
  const abrirDialogEditar = (viaje) => {
    setViajeEditando(viaje);
    // Asegurarse que rutas_adicionales sea un array
    const rutasAdicionales = Array.isArray(viaje.rutas_adicionales)
      ? viaje.rutas_adicionales
      : [];
    setFormData({
      fecha: viaje.fecha,
      // Asegurar que los IDs sean strings para Select
      conductor_id: viaje.conductor_id ? String(viaje.conductor_id) : "",
      conductor_nombre: viaje.conductor_nombre || "",
      camion_id: viaje.camion_id ? String(viaje.camion_id) : "",
      camion_nombre: viaje.camion_nombre || "",
      camion_placas: viaje.camion_placas || "",
      ruta_ida: viaje.ruta_ida || viaje.ruta || "",
      kilometros_ida: viaje.kilometros_ida || viaje.kilometros || "",
      rutas_adicionales: rutasAdicionales, // Usar el array asegurado
      ruta_regreso: viaje.ruta_regreso || "",
      kilometros_regreso: viaje.kilometros_regreso || "",
      litros_combustible: viaje.litros_combustible || "",
      costo_combustible: viaje.costo_combustible || "",
      notas: viaje.notas || "",
    });
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setViajeEditando(null);
    setFormData({
      fecha: "",
      conductor_id: "",
      conductor_nombre: "",
      camion_id: "",
      camion_nombre: "",
      camion_placas: "",
      ruta_ida: "",
      kilometros_ida: "",
      rutas_adicionales: [],
      ruta_regreso: "",
      kilometros_regreso: "",
      litros_combustible: "",
      costo_combustible: "",
      notas: "",
    });
  };

  const handleConductorChange = (conductorId) => {
    const conductor = conductores.find((c) => String(c.id) === conductorId); // Comparar como strings
    setFormData((prev) => ({
      ...prev,
      conductor_id: conductorId,
      conductor_nombre: conductor?.nombre || "",
    }));
  };

  const handleCamionChange = (camionId) => {
    const camion = camiones.find((c) => String(c.id) === camionId); // Comparar como strings
    setFormData((prev) => ({
      ...prev,
      camion_id: camionId,
      camion_nombre: camion?.nombre || "",
      camion_placas: camion?.placas || "",
    }));
  };

  const agregarRutaAdicional = () => {
    // Asegurar que rutas_adicionales sea un array antes de añadir
    const currentRutas = Array.isArray(formData.rutas_adicionales)
      ? formData.rutas_adicionales
      : [];
    setFormData((prev) => ({
      ...prev,
      rutas_adicionales: [...currentRutas, { ruta: "", kilometros: "" }],
    }));
  };

  const eliminarRutaAdicional = (index) => {
    // Asegurar que rutas_adicionales sea un array antes de filtrar
    const currentRutas = Array.isArray(formData.rutas_adicionales)
      ? formData.rutas_adicionales
      : [];
    setFormData((prev) => ({
      ...prev,
      rutas_adicionales: currentRutas.filter((_, i) => i !== index),
    }));
  };

  const actualizarRutaAdicional = (index, campo, valor) => {
    // Asegurar que rutas_adicionales sea un array antes de actualizar
    const currentRutas = Array.isArray(formData.rutas_adicionales)
      ? formData.rutas_adicionales
      : [];
    const nuevasRutas = [...currentRutas];
    // Asegurar que el elemento exista
    if (nuevasRutas[index]) {
      nuevasRutas[index][campo] = valor;
      setFormData((prev) => ({ ...prev, rutas_adicionales: nuevasRutas }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const kmIda = parseFloat(formData.kilometros_ida) || 0;
    const kmRegreso = parseFloat(formData.kilometros_regreso) || 0;
    // Asegurar que rutas_adicionales sea un array antes de reducir
    const currentRutas = Array.isArray(formData.rutas_adicionales)
      ? formData.rutas_adicionales
      : [];
    const kmAdicionales = currentRutas.reduce((sum, ruta) => {
      return sum + parseFloat(ruta.kilometros || 0);
    }, 0);
    const kmTotal = kmIda + kmAdicionales + kmRegreso;
    const litros = parseFloat(formData.litros_combustible) || 0;

    const datosViaje = {
      fecha: formData.fecha,
      // Convertir IDs de vuelta a número si es necesario para Supabase (ajustar según tu esquema)
      conductor_id: formData.conductor_id ? formData.conductor_id : null, // O usar parseInt si son numéricos
      conductor_nombre: formData.conductor_nombre,
      camion_id: formData.camion_id ? formData.camion_id : null, // O usar parseInt si son numéricos
      camion_nombre: formData.camion_nombre,
      camion_placas: formData.camion_placas,
      ruta_ida: formData.ruta_ida,
      kilometros_ida: kmIda,
      rutas_adicionales: currentRutas.map((r) => ({
        // Usar currentRutas
        ruta: r.ruta,
        kilometros: parseFloat(r.kilometros || 0), // Asegurar que sea número
      })),
      ruta_regreso: formData.ruta_regreso,
      kilometros_regreso: kmRegreso,
      kilometros_total: kmTotal,
      litros_combustible: litros,
      km_por_litro: litros > 0 ? kmTotal / litros : 0,
      costo_combustible: formData.costo_combustible
        ? parseFloat(formData.costo_combustible)
        : null,
      notas: formData.notas,
    };

    if (viajeEditando) {
      actualizarMutation.mutate({ id: viajeEditando.id, data: datosViaje });
    }
  };

  // --- Lógica de colores y estado de carga (sin cambios) ---
  const getEficienciaColor = (kmPorLitro) => {
    if (kmPorLitro > 2.25)
      return "bg-green-100 text-green-800 border-green-200";
    if (kmPorLitro >= 2.0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // --- JSX (interfaz de usuario) ---
  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Título y Filtros (sin cambios significativos en JSX) */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Registro de Viajes
          </h1>
          <p className="text-slate-600">
            Consulta el historial completo de viajes realizados
          </p>
        </div>

        <Card className="border-none shadow-lg mb-8">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg font-bold text-slate-900">
                Filtros de Búsqueda
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Inputs de fecha */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Fecha Inicio
                </label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Fecha Fin
                </label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border-slate-200"
                />
              </div>
              {/* Select Conductor */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Conductor
                </label>
                <Select
                  value={conductorFiltro}
                  onValueChange={setConductorFiltro}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {conductores.map((conductor) => (
                      // Usar String(id) como value para consistencia
                      <SelectItem
                        key={conductor.id}
                        value={String(conductor.id)}
                      >
                        {conductor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Select Camión */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Camión
                </label>
                <Select value={camionFiltro} onValueChange={setCamionFiltro}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {camiones.map((camion) => (
                      // Usar String(id) como value para consistencia
                      <SelectItem key={camion.id} value={String(camion.id)}>
                        {camion.nombre} - {camion.placas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Input Ruta */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Ruta
                </label>
                <Input
                  type="text"
                  value={rutaFiltro}
                  onChange={(e) => setRutaFiltro(e.target.value)}
                  placeholder="Buscar ruta..."
                  className="border-slate-200"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={limpiarFiltros}
              className="gap-2 hover:bg-slate-50"
            >
              <X className="w-4 h-4" /> Limpiar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Resumen (sin cambios en JSX) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Card Total Viajes */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  {" "}
                  <FileText className="w-6 h-6 text-white" />{" "}
                </div>
                <div>
                  {" "}
                  <p className="text-sm text-slate-500 font-medium">
                    Total Viajes
                  </p>{" "}
                  <p className="text-2xl font-bold text-slate-900">
                    {viajesFiltrados.length}
                  </p>{" "}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card Kilómetros */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  {" "}
                  <MapPin className="w-6 h-6 text-white" />{" "}
                </div>
                <div>
                  {" "}
                  <p className="text-sm text-slate-500 font-medium">
                    Kilómetros
                  </p>{" "}
                  <p className="text-2xl font-bold text-slate-900">
                    {viajesFiltrados
                      .reduce((sum, v) => sum + (v.kilometros_total || 0), 0)
                      .toFixed(0)}
                  </p>{" "}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card Litros */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  {" "}
                  <Gauge className="w-6 h-6 text-white" />{" "}
                </div>
                <div>
                  {" "}
                  <p className="text-sm text-slate-500 font-medium">
                    Litros
                  </p>{" "}
                  <p className="text-2xl font-bold text-slate-900">
                    {viajesFiltrados
                      .reduce((sum, v) => sum + (v.litros_combustible || 0), 0)
                      .toFixed(0)}
                  </p>{" "}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Card Promedio */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  {" "}
                  <Gauge className="w-6 h-6 text-white" />{" "}
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Promedio</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(() => {
                      const totalKm = viajesFiltrados.reduce(
                        (sum, v) => sum + (v.kilometros_total || 0),
                        0
                      );
                      const totalLitros = viajesFiltrados.reduce(
                        (sum, v) => sum + (v.litros_combustible || 0),
                        0
                      );
                      return totalLitros > 0
                        ? (totalKm / totalLitros).toFixed(2)
                        : "0.00";
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Viajes */}
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-xl font-bold text-slate-900">
              Historial de Viajes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {viajesFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  No hay viajes que coincidan con los filtros
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {viajesFiltrados.map((viaje) => {
                  // Asegurarse que rutas_adicionales sea un array
                  const rutasAdicionales = Array.isArray(
                    viaje.rutas_adicionales
                  )
                    ? viaje.rutas_adicionales
                    : [];
                  const tieneRegreso =
                    viaje.ruta_regreso && viaje.kilometros_regreso;
                  const tieneAdicionales = rutasAdicionales.length > 0;
                  const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "-";
                  const kmTotal =
                    viaje.kilometros_total || viaje.kilometros || 0;
                  const litros = viaje.litros_combustible || 0;
                  const eficiencia = viaje.km_por_litro || 0;

                  return (
                    // Card individual de viaje (JSX modificado para mejor layout)
                    <Card
                      key={viaje.id}
                      className="border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid md:grid-cols-4 gap-6">
                            {/* Columna 1: Información General */}
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <span className="text-sm font-semibold text-slate-900">
                                    {format(
                                      new Date(`${viaje.fecha}T12:00:00`),
                                      "dd MMM yyyy",
                                      { locale: es }
                                    )}
                                  </span>
                                </div>
                                {viaje.conductor_nombre && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm text-slate-700">
                                      {viaje.conductor_nombre}
                                    </span>
                                  </div>
                                )}
                                {viaje.camion_nombre && (
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <div className="flex flex-col">
                                      <span className="text-sm text-slate-700">
                                        {viaje.camion_nombre}
                                      </span>
                                      {viaje.camion_placas && (
                                        <span className="text-xs text-slate-500">
                                          {viaje.camion_placas}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Columna 2: Rutas */}
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-slate-700">
                                    {rutaPrincipal}
                                  </span>
                                </div>
                                {tieneAdicionales &&
                                  rutasAdicionales.map(
                                    (
                                      rutaAd,
                                      idx // Usar rutasAdicionales
                                    ) => (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-2 ml-6"
                                      >
                                        <Route className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-slate-600">
                                          {rutaAd.ruta}
                                        </span>
                                      </div>
                                    )
                                  )}
                                {tieneRegreso && (
                                  <div className="flex items-start gap-2">
                                    <ArrowLeftRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-slate-700">
                                      {viaje.ruta_regreso}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Columna 3: Métricas */}
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">
                                    Kilómetros:
                                  </span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {kmTotal.toFixed(1)} km
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">
                                    Litros:
                                  </span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {litros.toFixed(2)} L
                                  </span>
                                </div>
                                {viaje.costo_combustible && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                      Costo:
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">
                                      ${viaje.costo_combustible.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Columna 4: Eficiencia */}
                            <div className="space-y-3">
                              <div className="flex flex-col items-center justify-center h-full">
                                <Badge
                                  variant="outline"
                                  className={`${getEficienciaColor(
                                    eficiencia
                                  )} border font-semibold text-base px-4 py-2 mb-2`}
                                >
                                  <Gauge className="w-4 h-4 mr-2" />
                                  {eficiencia.toFixed(2)} km/L
                                </Badge>
                                {viaje.notas && (
                                  <p className="text-xs text-slate-500 text-center mt-2 line-clamp-2">
                                    {viaje.notas}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Botones de acción */}
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirDialogEditar(viaje)}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-700"
                              aria-label="Editar viaje"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmarEliminar(viaje)}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-700"
                              aria-label="Eliminar viaje"
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

        {/* Dialog de Edición (JSX sin cambios significativos) */}
        <Dialog open={dialogAbierto} onOpenChange={cerrarDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">
                Editar Viaje
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Campos generales */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fecha" className="font-semibold">
                    Fecha <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-conductor" className="font-semibold">
                    Conductor
                  </Label>
                  <Select
                    value={formData.conductor_id}
                    onValueChange={handleConductorChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {conductores.map((conductor) => (
                        // Usar String(id) como value
                        <SelectItem
                          key={conductor.id}
                          value={String(conductor.id)}
                        >
                          {conductor.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-camion" className="font-semibold">
                    Camión
                  </Label>
                  <Select
                    value={formData.camion_id}
                    onValueChange={handleCamionChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar camión" />
                    </SelectTrigger>
                    <SelectContent>
                      {camiones.map((camion) => (
                        // Usar String(id) como value
                        <SelectItem key={camion.id} value={String(camion.id)}>
                          {camion.nombre} - {camion.placas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Ruta Ida */}
              <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <h3 className="font-bold text-slate-900">Ruta de Ida</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-ruta-ida" className="font-semibold">
                      Ruta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-ruta-ida"
                      placeholder="Ej: Ciudad A - Ciudad B"
                      value={formData.ruta_ida}
                      onChange={(e) =>
                        setFormData({ ...formData, ruta_ida: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-km-ida" className="font-semibold">
                      Kilómetros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-km-ida"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.kilometros_ida}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kilometros_ida: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
              {/* Rutas Adicionales */}
              <div className="space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">
                    Rutas Adicionales
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarRutaAdicional}
                    className="gap-2"
                  >
                    {" "}
                    <Plus className="w-4 h-4" /> Agregar Ruta{" "}
                  </Button>
                </div>
                {/* Asegurar que formData.rutas_adicionales sea un array antes de mapear */}
                {Array.isArray(formData.rutas_adicionales) &&
                  formData.rutas_adicionales.length > 0 && (
                    <div className="space-y-3">
                      {formData.rutas_adicionales.map((ruta, index) => (
                        <div
                          key={index}
                          className="grid md:grid-cols-[1fr_auto_auto] gap-3 p-3 bg-white rounded-lg border border-purple-200"
                        >
                          <Input
                            placeholder="Ej: Ciudad B - Ciudad C"
                            value={ruta.ruta || ""}
                            onChange={(e) =>
                              actualizarRutaAdicional(
                                index,
                                "ruta",
                                e.target.value
                              )
                            }
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
                                e.target.value
                              )
                            }
                            className="w-32"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarRutaAdicional(index)}
                            className="hover:bg-red-50 hover:text-red-700"
                          >
                            {" "}
                            <X className="w-4 h-4" />{" "}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              {/* Ruta Regreso */}
              <div className="space-y-4 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                <h3 className="font-bold text-slate-900">Ruta de Regreso</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-ruta-regreso"
                      className="font-semibold"
                    >
                      Ruta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-ruta-regreso"
                      placeholder="Ej: Ciudad B - Ciudad A"
                      value={formData.ruta_regreso}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ruta_regreso: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-km-regreso" className="font-semibold">
                      Kilómetros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-km-regreso"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.kilometros_regreso}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kilometros_regreso: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
              {/* Combustible */}
              <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100">
                <h3 className="font-bold text-slate-900">
                  Consumo de Combustible
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-litros" className="font-semibold">
                      Litros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-litros"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.litros_combustible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          litros_combustible: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-costo" className="font-semibold">
                      Costo Total
                    </Label>
                    <Input
                      id="edit-costo"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.costo_combustible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costo_combustible: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="edit-notas" className="font-semibold">
                  Notas Adicionales
                </Label>
                <Textarea
                  id="edit-notas"
                  placeholder="Observaciones..."
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                  rows={4}
                />
              </div>
              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrarDialog}
                  className="flex-1"
                >
                  {" "}
                  Cancelar{" "}
                </Button>
                <Button
                  type="submit"
                  disabled={actualizarMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2"
                >
                  {actualizarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* AlertDialog Eliminar (sin cambios en JSX) */}
        <AlertDialog
          open={!!viajeAEliminar}
          onOpenChange={() => setViajeAEliminar(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el viaje del{" "}
                <strong>
                  {viajeAEliminar &&
                    format(
                      new Date(`${viajeAEliminar.fecha}T12:00:00`),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: es }
                    )}
                </strong>
                {viajeAEliminar?.ruta_ida && (
                  <>
                    {" "}
                    con ruta <strong>{viajeAEliminar.ruta_ida}</strong>
                  </>
                )}
                . Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEliminar}
                className="bg-red-600 hover:bg-red-700"
                disabled={eliminarMutation.isPending}
              >
                {eliminarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
