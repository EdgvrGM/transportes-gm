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

  const { data: camiones = [], isLoading } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: viajes = [] } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Viaje").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

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
      0,
    );
    const totalLitros = viajesCamion.reduce(
      (sum, v) => sum + (v.litros_combustible || 0),
      0,
    );
    const promedio = totalLitros > 0 ? totalKm / totalLitros : 0;

    return { totalViajes, totalKm, promedio };
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "activo":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      case "mantenimiento":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "inactivo":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
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
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // CAMBIO: Fondo dinámico
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Camiones
            </h1>
            <p className="text-muted-foreground">
              Gestiona tu flota de vehículos
            </p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 shadow-lg gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Camión
          </Button>
        </div>

        {/* CAMBIO: Fondo Card y Tabla dinámicos */}
        <Card className="border-none shadow-xl bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-bold text-foreground">
              Lista de Camiones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="font-semibold text-muted-foreground">
                      Nombre
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                      Placas
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                      Estado
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-center">
                      Viajes
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-center">
                      Kilómetros
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-center">
                      Eficiencia
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-center">
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
                        className="hover:bg-muted/50 transition-colors duration-150 border-border"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center shadow-md">
                              <Truck className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold text-foreground">
                              {camion.nombre}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {camion.placas}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getEstadoColor(
                              camion.estado,
                            )} border font-semibold`}
                          >
                            {getEstadoTexto(camion.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-foreground">
                          {stats.totalViajes}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-foreground">
                          {stats.totalKm.toFixed(0)} km
                        </TableCell>
                        <TableCell className="text-center">
                          {stats.totalViajes > 0 ? (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {stats.promedio.toFixed(2)} km/L
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDialog(camion)}
                              className="hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmarEliminar(camion)}
                              className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400"
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

        {/* CAMBIO: Dialog con colores dinámicos */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {camionEditando ? "Editar Camión" : "Nuevo Camión"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="nombre"
                  className="font-semibold text-foreground"
                >
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
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="placas"
                  className="font-semibold text-foreground"
                >
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
                  disabled={
                    crearMutation.isPending || actualizarMutation.isPending
                  }
                  className="flex-1 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
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
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Esta acción eliminará permanentemente el camión{" "}
                <strong>{camionAEliminar?.nombre}</strong> (
                {camionAEliminar?.placas}). Los viajes registrados con este
                camión no se eliminarán, pero quedarán sin camión asignado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background hover:bg-muted">
                Cancelar
              </AlertDialogCancel>
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
