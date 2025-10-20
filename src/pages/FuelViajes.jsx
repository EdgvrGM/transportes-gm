import React, { useState } from "react";
import { supabase } from "@/supabaseClient"; // Importar supabase
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

  const viajesFiltrados = viajes.filter((viaje) => {
    let cumpleFiltros = true;
    const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "";

    if (fechaInicio && viaje.fecha < fechaInicio) cumpleFiltros = false;
    if (fechaFin && viaje.fecha > fechaFin) cumpleFiltros = false;
    if (conductorFiltro !== "todos" && viaje.conductor_id !== conductorFiltro)
      cumpleFiltros = false;
    if (camionFiltro !== "todos" && viaje.camion_id !== camionFiltro)
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

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Registro de Viajes
          </h1>
          <p className="text-slate-600">
            Consulta el historial completo de viajes realizados
          </p>
        </div>

        {/* Filtros */}
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
                      <SelectItem key={conductor.id} value={conductor.id}>
                        {conductor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                      <SelectItem key={camion.id} value={camion.id}>
                        {camion.nombre} - {camion.placas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              <X className="w-4 h-4" />
              Limpiar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Viajes
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {viajesFiltrados.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Kilómetros
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {viajesFiltrados
                      .reduce((sum, v) => sum + (v.kilometros_total || 0), 0)
                      .toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Litros</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {viajesFiltrados
                      .reduce((sum, v) => sum + (v.litros_combustible || 0), 0)
                      .toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-white" />
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
                  const tieneRegreso =
                    viaje.ruta_regreso && viaje.kilometros_regreso;
                  const tieneAdicionales =
                    viaje.rutas_adicionales &&
                    viaje.rutas_adicionales.length > 0;
                  const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "-";
                  const kmTotal =
                    viaje.kilometros_total || viaje.kilometros || 0;
                  const litros = viaje.litros_combustible || 0;
                  const eficiencia = viaje.km_por_litro || 0;

                  return (
                    <Card
                      key={viaje.id}
                      className="border border-slate-200 hover:shadow-md transition-shadow relative"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmarEliminar(viaje)}
                        className="absolute top-4 right-4 hover:bg-red-50 hover:text-red-700 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pr-12">
                          {/* Columna 1: Fecha y conductor */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="font-semibold text-slate-900">
                                {format(new Date(viaje.fecha), "dd MMM yyyy", {
                                  locale: es,
                                })}
                              </span>
                            </div>
                            {viaje.conductor_nombre && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" />
                                <span className="text-slate-700">
                                  {viaje.conductor_nombre}
                                </span>
                              </div>
                            )}
                            {viaje.camion_nombre && (
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-green-500" />
                                <span className="text-slate-700">
                                  {viaje.camion_nombre}
                                </span>
                                {viaje.camion_placas && (
                                  <span className="text-xs text-slate-500">
                                    ({viaje.camion_placas})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Columna 2: Rutas */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                              <span className="text-slate-700">
                                {rutaPrincipal}
                              </span>
                            </div>
                            {tieneAdicionales &&
                              viaje.rutas_adicionales.map((rutaAd, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 ml-6"
                                >
                                  <Route className="w-3 h-3 text-purple-500 mt-1 flex-shrink-0" />
                                  <span className="text-sm text-slate-600">
                                    {rutaAd.ruta}
                                  </span>
                                </div>
                              ))}
                            {tieneRegreso && (
                              <div className="flex items-start gap-2">
                                <ArrowLeftRight className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                                <span className="text-slate-700">
                                  {viaje.ruta_regreso}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Columna 3: Métricas */}
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-500">
                                Kilómetros:
                              </span>
                              <span className="font-semibold text-slate-900">
                                {kmTotal.toFixed(1)} km
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-500">
                                Litros:
                              </span>
                              <span className="font-semibold text-slate-900">
                                {litros.toFixed(2)} L
                              </span>
                            </div>
                            {viaje.costo_combustible && (
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-500">
                                  Costo:
                                </span>
                                <span className="font-semibold text-slate-900">
                                  ${viaje.costo_combustible.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Columna 4: Eficiencia */}
                          <div className="flex flex-col items-center justify-center">
                            <Badge
                              variant="outline"
                              className={`${getEficienciaColor(
                                eficiencia
                              )} border font-semibold text-lg px-4 py-2`}
                            >
                              <Gauge className="w-4 h-4 mr-2" />
                              {eficiencia.toFixed(2)} km/L
                            </Badge>
                            {viaje.notas && (
                              <p className="text-xs text-slate-500 mt-2 text-center">
                                {viaje.notas}
                              </p>
                            )}
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

        {/* Alert Dialog para confirmar eliminación */}
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
                      new Date(viajeAEliminar.fecha),
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
