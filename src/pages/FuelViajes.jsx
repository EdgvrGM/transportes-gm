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
  Filter,
} from "lucide-react";
import { format, getISOWeek, getYear } from "date-fns";
import { es } from "date-fns/locale";
import FiltrosViajes from "@/components/fuel/FiltrosViajes";

export default function FuelViajes() {
  const queryClient = useQueryClient();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [conductorFiltro, setConductorFiltro] = useState("todos");
  const [camionFiltro, setCamionFiltro] = useState("todos");
  const [rutaFiltro, setRutaFiltro] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState("todos");
  const [viajeAEliminar, setViajeAEliminar] = useState(null);
  const [viajeEditando, setViajeEditando] = useState(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
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
    notas: "",
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajes"] });
      cerrarDialog();
    },
  });

  const viajesFiltrados = viajes.filter((viaje) => {
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
    setFormData({
      fecha: viaje.fecha,
      fecha_llegada: viaje.fecha_llegada || "",
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
    const litros = parseFloat(formData.litros_combustible) || 0;
    const datosViaje = {
      fecha: formData.fecha,
      fecha_llegada: formData.fecha_llegada || null,
      conductor_id: formData.conductor_id ? formData.conductor_id : null,
      conductor_nombre: formData.conductor_nombre,
      camion_id: formData.camion_id ? formData.camion_id : null,
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
      km_por_litro: litros > 0 ? kmTotal / litros : 0,
      costo_combustible: formData.costo_combustible
        ? parseFloat(formData.costo_combustible)
        : null,
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
            rutaFiltro={rutaFiltro}
            setRutaFiltro={setRutaFiltro}
            periodoFiltro={periodoFiltro}
            setPeriodoFiltro={setPeriodoFiltro}
            conductores={conductores}
            camiones={camiones}
            limpiarFiltros={limpiarFiltros}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* (Tarjetas de Estadísticas iguales) */}
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
                    {viajesFiltrados.length}
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
                    {viajesFiltrados
                      .reduce((sum, v) => sum + (v.kilometros_total || 0), 0)
                      .toFixed(0)}
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
                    {viajesFiltrados
                      .reduce((sum, v) => sum + (v.litros_combustible || 0), 0)
                      .toFixed(0)}
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
                        ? (totalKm / totalLitros).toFixed(2)
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
            <CardTitle className="text-xl font-bold text-foreground">
              Historial de Viajes
            </CardTitle>
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
                  const kmTotal =
                    viaje.kilometros_total || viaje.kilometros || 0;
                  const litros = viaje.litros_combustible || 0;
                  const eficiencia = viaje.km_por_litro || 0;

                  const tipoViaje = viaje.tipo_viaje || "Sencillo";
                  const isFull = tipoViaje === "FULL";

                  return (
                    <Card
                      key={viaje.id}
                      className="border border-border bg-card hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid md:grid-cols-4 gap-6">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                  <div>
                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                      Salida
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {format(
                                        new Date(`${viaje.fecha}T12:00:00`),
                                        "dd MMM",
                                        { locale: es },
                                      )}
                                    </span>
                                  </div>
                                </div>
                                {viaje.fecha_llegada && (
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                                    <div>
                                      <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                        Llegada
                                      </span>
                                      <span className="text-sm font-semibold text-foreground">
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
                              <div className="pt-2 border-t border-border mt-2 space-y-2">
                                {viaje.conductor_nombre && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm text-foreground">
                                      {viaje.conductor_nombre}
                                    </span>
                                  </div>
                                )}
                                {viaje.camion_nombre && (
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm text-foreground">
                                      {viaje.camion_nombre}{" "}
                                      <span className="text-xs text-muted-foreground">
                                        ({viaje.camion_placas})
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                {/* CAMBIO: Etiqueta debajo de la ruta en la tarjeta móvil */}
                                {/* Columna 2: RUTAS CORREGIDA */}
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Badge
                                      variant="outline"
                                      className={`w-fit text-[10px] px-1.5 py-0 uppercase font-bold tracking-wider mb-1 ${
                                        isFull
                                          ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                                          : "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                                      }`}
                                    >
                                      {tipoViaje}
                                    </Badge>

                                    {/* RUTA DE IDA */}
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm text-foreground">
                                        {rutaPrincipal}
                                      </span>
                                    </div>

                                    {/* RUTAS ADICIONALES */}
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

                                    {/* RUTA DE REGRESO (Una sola vez) */}
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
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Kilómetros:
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {kmTotal.toFixed(1)} km
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Litros:
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {litros.toFixed(2)} L
                                  </span>
                                </div>
                                {viaje.costo_combustible && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                      Costo:
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                      ${viaje.costo_combustible.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-col items-center justify-center h-full">
                                <Badge
                                  variant="outline"
                                  className={`${getEficienciaColor(eficiencia)} border font-semibold text-base px-4 py-2 mb-2`}
                                >
                                  <Gauge className="w-4 h-4 mr-2" />
                                  {eficiencia.toFixed(2)} km/L
                                </Badge>
                                {viaje.notas && (
                                  <p className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
                                    {viaje.notas}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Editar Viaje
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* CAMBIO: Grid ajustado a 5 columnas con el campo Tipo */}
              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-fecha"
                    className="font-semibold text-foreground"
                  >
                    Salida <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    required
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-fecha-llegada"
                    className="font-semibold text-foreground"
                  >
                    Llegada
                  </Label>
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
                    className="bg-background border-input"
                  />
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
                <h3 className="font-bold text-foreground">
                  Consumo de Combustible
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-litros"
                      className="font-semibold text-foreground"
                    >
                      Litros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-litros"
                      type="number"
                      step="0.01"
                      value={formData.litros_combustible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          litros_combustible: e.target.value,
                        })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-costo"
                      className="font-semibold text-foreground"
                    >
                      Costo Total
                    </Label>
                    <Input
                      id="edit-costo"
                      type="number"
                      step="0.01"
                      value={formData.costo_combustible}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costo_combustible: e.target.value,
                        })
                      }
                      className="bg-background border-input"
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
