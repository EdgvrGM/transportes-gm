import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Truck, FileText, Loader2, Trash2 } from "lucide-react";

export default function FuelCamiones() {
  const queryClient = useQueryClient();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [camionEditando, setCamionEditando] = useState(null);
  const [camionAEliminar, setCamionAEliminar] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    placas: "",
    estado: "activo",
  });

  // Query para obtener camiones desde Supabase
  const { data: camiones = [], isLoading } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Query para obtener viajes (necesario para las estadísticas)
  const { data: viajes = [] } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Viaje").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Mutación para crear un camión en Supabase
  const crearMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("Camion")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camiones"] });
      cerrarDialog();
    },
  });

  // Mutación para actualizar un camión en Supabase
  const actualizarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: result, error } = await supabase
        .from("Camion")
        .update(data)
        .eq("id", id)
        .select();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camiones"] });
      cerrarDialog();
    },
  });

  // Mutación para eliminar un camión en Supabase
  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("Camion").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camiones"] });
      setCamionAEliminar(null);
    },
  });

  const abrirDialog = (camion = null) => {
    if (camion) {
      setCamionEditando(camion);
      setFormData({
        nombre: camion.nombre,
        placas: camion.placas,
        estado: camion.estado || "activo",
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setCamionEditando(null);
    setFormData({ nombre: "", placas: "", estado: "activo" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (camionEditando) {
      actualizarMutation.mutate({ id: camionEditando.id, data: formData });
    } else {
      crearMutation.mutate(formData);
    }
  };

  const confirmarEliminar = (camion) => {
    setCamionAEliminar(camion);
  };

  const handleEliminar = () => {
    if (camionAEliminar) {
      eliminarMutation.mutate(camionAEliminar.id);
    }
  };

  const obtenerEstadisticasCamion = (camionId) => {
    const viajesCamion = viajes.filter((v) => v.camion_id === camionId);
    const totalViajes = viajesCamion.length;
    const totalKm = viajesCamion.reduce(
      (sum, v) => sum + (v.kilometros_total || 0),
      0
    );
    const totalLitros = viajesCamion.reduce(
      (sum, v) => sum + (v.litros_combustible || 0),
      0
    );
    const promedio = totalLitros > 0 ? totalKm / totalLitros : 0;

    return { totalViajes, totalKm, promedio };
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "activo":
        return "bg-green-100 text-green-800 border-green-200";
      case "mantenimiento":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "inactivo":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case "activo":
        return "Activo";
      case "mantenimiento":
        return "Mantenimiento";
      case "inactivo":
        return "Inactivo";
      default:
        return estado;
    }
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Camiones
            </h1>
            <p className="text-slate-600">Gestiona tu flota de vehículos</p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Camión
          </Button>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-xl font-bold text-slate-900">
              Lista de Camiones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">
                      Nombre
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Placas
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Estado
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">
                      Viajes
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">
                      Kilómetros
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">
                      Eficiencia
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {camiones.map((camion) => {
                    const stats = obtenerEstadisticasCamion(camion.id);
                    return (
                      <TableRow
                        key={camion.id}
                        className="hover:bg-slate-50 transition-colors duration-150"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                              <Truck className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold text-slate-900">
                              {camion.nombre}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-700">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {camion.placas}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getEstadoColor(
                              camion.estado
                            )} border font-semibold`}
                          >
                            {getEstadoTexto(camion.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-900">
                          {stats.totalViajes}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-900">
                          {stats.totalKm.toFixed(0)} km
                        </TableCell>
                        <TableCell className="text-center">
                          {stats.totalViajes > 0 ? (
                            <span className="font-semibold text-green-700">
                              {stats.promedio.toFixed(2)} km/L
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDialog(camion)}
                              className="hover:bg-green-50 hover:text-green-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmarEliminar(camion)}
                              className="hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {camionEditando ? "Editar Camión" : "Nuevo Camión"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-semibold">
                  Nombre del Camión <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  required
                  placeholder="Camión 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placas" className="font-semibold">
                  Placas <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="placas"
                  value={formData.placas}
                  onChange={(e) =>
                    setFormData({ ...formData, placas: e.target.value })
                  }
                  required
                  placeholder="ABC-123"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrarDialog}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    crearMutation.isPending || actualizarMutation.isPending
                  }
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  {crearMutation.isPending || actualizarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : camionEditando ? (
                    "Actualizar"
                  ) : (
                    "Crear"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!camionAEliminar}
          onOpenChange={() => setCamionAEliminar(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el camión{" "}
                <strong>{camionAEliminar?.nombre}</strong> (
                {camionAEliminar?.placas}). Los viajes registrados con este
                camión no se eliminarán, pero quedarán sin camión asignado.
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
