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

const FECHA_LIMITE_ARCHIVO = '2026-04-24';

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
      const { data, error } = await supabase
        .from("Camion")
        .select("*")
        .order("nombre", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: viajes = [] } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Viaje")
        .select("*")
        .gte("fecha", FECHA_LIMITE_ARCHIVO);
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
    // Solo tomar viajes con combustible registrado y después de la fecha límite
    const viajesCamion = viajes.filter(
      (v) => 
        v.camion_id === camionId && 
        (parseFloat(v.litros_combustible) || 0) > 0 &&
        (parseFloat(v.kilometros_total || v.kilometros) || 0) > 0
    );

    const totalViajes = viajesCamion.length;
    const totalKm = viajesCamion.reduce(
      (sum, v) => sum + (v.kilometros_total || v.kilometros || 0),
      0,
    );
    const totalLitros = viajesCamion.reduce(
      (sum, v) => sum + (v.litros_combustible || 0),
      0,
    );
    const promedio = totalLitros > 0 ? totalKm / totalLitros : 0;

    return { totalViajes, totalKm, promedio };
  };

  const getEficienciaColor = (kmPorLitro) => {
    if (!kmPorLitro || kmPorLitro === 0) return "text-slate-400";
    if (kmPorLitro > 2.25) return "text-green-600 dark:text-green-400";
    if (kmPorLitro >= 2.0) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
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
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              Camiones
            </h1>
            <p className="text-muted-foreground">
              Gestiona tu flota de vehículos
            </p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl gap-2 px-6 h-12 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5" />
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
            {/* ── VISTA MOBILE: Cards ── */}
            <div className="md:hidden divide-y divide-border">
              {camiones.map((camion) => {
                const stats = obtenerEstadisticasCamion(camion.id);
                return (
                  <div key={camion.id} className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center shadow-md shrink-0">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{camion.nombre}</p>
                        <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 border ${getEstadoColor(camion.estado)}`}>
                          {getEstadoTexto(camion.estado)}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {camion.placas}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span><span className="font-bold text-foreground">{stats.totalViajes}</span> viajes</span>
                          <span><span className="font-bold text-foreground">{stats.totalKm.toFixed(0)}</span> km</span>
                          {stats.totalViajes > 0 && (
                            <span className="font-semibold text-green-600 dark:text-green-400">{stats.promedio.toFixed(2)} km/L</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirDialog(camion)}
                            className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmarEliminar(camion)}
                            className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {camiones.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No hay camiones registrados.</p>
              )}
            </div>

            {/* ── VISTA DESKTOP: Tabla ── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-zinc-900/80 hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[30%] pl-8 font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Unidad / Placas</TableHead>
                    <TableHead className="w-[25%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Kilometraje Total</TableHead>
                    <TableHead className="w-[25%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Eficiencia Promedio</TableHead>
                    <TableHead className="w-[20%] text-right font-bold text-[10px] uppercase tracking-widest text-slate-500 pr-10 py-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {camiones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                        <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-black text-lg">No hay camiones registrados</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    camiones.map((camion) => {
                      const stats = obtenerEstadisticasCamion(camion.id);
                      return (
                        <TableRow key={camion.id} className="group relative border-l-4 border-transparent hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-all duration-300 border-b border-border/40 last:border-0">
                          <TableCell className="py-3 pl-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-orange-100/80 dark:bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-600 transition-all group-hover:bg-orange-600 group-hover:text-white group-hover:scale-110 shadow-sm border border-orange-200/50 dark:border-orange-800/50">
                                <Truck className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">{camion.nombre}</span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase mt-1.5">{camion.placas}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-3 font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                            {stats.totalKm.toFixed(0)} KM
                          </TableCell>
                          <TableCell className="text-center">
                            {stats.totalViajes > 0 ? (
                              <span className={`font-black text-xs ${getEficienciaColor(stats.promedio)}`}>{stats.promedio.toFixed(2)} KM/L</span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="ghost" size="icon" onClick={() => abrirDialog(camion)}
                                className="h-9 w-9 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmarEliminar(camion)}
                                className="h-9 w-9 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
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
