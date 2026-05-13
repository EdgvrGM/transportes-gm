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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Phone, CreditCard, Loader2, Trash2, User } from "lucide-react";

const FECHA_LIMITE_ARCHIVO = '2026-04-24';

export default function FuelConductores() {
  const queryClient = useQueryClient();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [conductorEditando, setConductorEditando] = useState(null);
  const [conductorAEliminar, setConductorAEliminar] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    licencia: "",
    telefono: "",
    estado: "activo",
  });

  const { data: conductores = [], isLoading } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Conductor")
        .select("*")
        .order("estado", { ascending: true })
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
        .from("Conductor")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      cerrarDialog();
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: result, error } = await supabase
        .from("Conductor")
        .update(data)
        .eq("id", id)
        .select();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      cerrarDialog();
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      // Verificar si tiene viajes activos (post-archivo)
      const { data: viajesActivos } = await supabase
        .from("Viaje")
        .select("id")
        .eq("conductor_id", id)
        .gte("fecha", FECHA_LIMITE_ARCHIVO)
        .limit(1);

      if (viajesActivos?.length > 0) {
        throw new Error("TIENE_VIAJES_ACTIVOS");
      }

      // Sin viajes activos — desligar registros históricos para poder eliminar
      await supabase.from("viajes_registrados").update({ conductor_id: null }).eq("conductor_id", id);
      await supabase.from("Viaje").update({ conductor_id: null }).eq("conductor_id", id);

      const { error } = await supabase.from("Conductor").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      setConductorAEliminar(null);
      setDeleteError(null);
    },
    onError: (err) => {
      if (err.message === "TIENE_VIAJES_ACTIVOS") {
        setDeleteError("FK");
      } else {
        setDeleteError(err.message || "No se pudo eliminar el conductor.");
      }
    },
  });

  const desactivarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("Conductor")
        .update({ estado: "inactivo" })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      setConductorAEliminar(null);
      setDeleteError(null);
    },
    onError: (err) => {
      setDeleteError(err.message || "No se pudo desactivar el conductor.");
    },
  });

  const abrirDialog = (conductor = null) => {
    if (conductor) {
      setConductorEditando(conductor);
      setFormData({
        nombre: conductor.nombre,
        licencia: conductor.licencia || "",
        telefono: conductor.telefono || "",
        estado: conductor.estado || "activo",
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setConductorEditando(null);
    setFormData({ nombre: "", licencia: "", telefono: "", estado: "activo" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (conductorEditando) {
      actualizarMutation.mutate({ id: conductorEditando.id, data: formData });
    } else {
      crearMutation.mutate(formData);
    }
  };

  const confirmarEliminar = (conductor) => {
    setDeleteError(null);
    setConductorAEliminar(conductor);
  };

  const handleEliminar = () => {
    if (conductorAEliminar) {
      eliminarMutation.mutate(conductorAEliminar.id);
    }
  };

  const obtenerEstadisticasConductor = (conductorId) => {
    // Solo tomar viajes con combustible registrado y después de la fecha límite
    const viajesConductor = viajes.filter(
      (v) => 
        v.conductor_id === conductorId && 
        (parseFloat(v.litros_combustible) || 0) > 0 &&
        (parseFloat(v.kilometros_total || v.kilometros) || 0) > 0
    );

    const totalViajes = viajesConductor.length;
    const totalKm = viajesConductor.reduce(
      (sum, v) => sum + (v.kilometros_total || v.kilometros || 0),
      0,
    );
    const totalLitros = viajesConductor.reduce(
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
              Conductores
            </h1>
            <p className="text-muted-foreground">
              Gestiona tu equipo de conductores
            </p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl gap-2 px-6 h-12 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5" />
            Nuevo Conductor
          </Button>
        </div>

        {/* CAMBIO: Card con fondo dinámico */}
        <Card className="border-none shadow-xl bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-bold text-foreground">
              Lista de Conductores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* ── VISTA MOBILE: Cards ── */}
            <div className="md:hidden divide-y divide-border">
              {conductores.map((conductor) => {
                const stats = obtenerEstadisticasConductor(conductor.id);
                return (
                  <div key={conductor.id} className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center shadow-md shrink-0">
                      <span className="text-white font-bold text-sm">
                        {conductor.nombre[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{conductor.nombre}</p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] px-1.5 py-0 ${
                            conductor.estado === "activo"
                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {conductor.estado === "activo" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> {conductor.licencia || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {conductor.telefono || "-"}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span><span className="font-bold text-foreground">{stats.totalViajes}</span> viajes</span>
                          {stats.totalViajes > 0 && (
                            <span className="font-semibold text-green-600 dark:text-green-400">{stats.promedio.toFixed(2)} km/L</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirDialog(conductor)}
                            className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmarEliminar(conductor)}
                            className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {conductores.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No hay conductores registrados.</p>
              )}
            </div>

            {/* ── VISTA DESKTOP: Tabla ── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-zinc-900/80 hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[25%] pl-8 font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Nombre del Conductor</TableHead>
                    <TableHead className="w-[12%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Estado</TableHead>
                    <TableHead className="w-[15%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Licencia</TableHead>
                    <TableHead className="w-[18%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Teléfono</TableHead>
                    <TableHead className="w-[15%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500 py-4">Eficiencia</TableHead>
                    <TableHead className="w-[15%] text-right font-bold text-[10px] uppercase tracking-widest text-slate-500 pr-10 py-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* CONDUCTORES ACTIVOS */}
                  {conductores
                    .filter((c) => c.estado === "activo")
                    .map((conductor) => {
                      const stats = obtenerEstadisticasConductor(conductor.id);
                      return (
                        <TableRow key={conductor.id} className="group relative border-l-4 border-transparent hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all duration-300 border-b border-border/40 last:border-0">
                          <TableCell className="py-3 pl-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-100/80 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
                                <User className="w-5 h-5" />
                              </div>
                              <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight">{conductor.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-tighter bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                              Activo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-3 font-black text-slate-500 dark:text-slate-400 text-xs uppercase tracking-tighter">
                            {conductor.licencia || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                              <Phone className="w-3.5 h-3.5 text-indigo-500/70" />
                              {conductor.telefono || "-"}
                            </div>
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
                              <Button variant="ghost" size="icon" onClick={() => abrirDialog(conductor)}
                                className="h-9 w-9 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmarEliminar(conductor)}
                                className="h-9 w-9 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                  {/* SECCIÓN PLEGABLE PARA INACTIVOS */}
                  {conductores.filter((c) => c.estado !== "activo").length > 0 && (
                    <TableRow 
                      className="bg-slate-50/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                      onClick={() => setMostrarInactivos(!mostrarInactivos)}
                    >
                      <TableCell colSpan={6} className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                          <span>{mostrarInactivos ? "Ocultar" : "Mostrar"} Conductores Inactivos ({conductores.filter((c) => c.estado !== "activo").length})</span>
                          <Plus className={`w-3 h-3 transition-transform duration-300 ${mostrarInactivos ? "rotate-45" : ""}`} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* CONDUCTORES INACTIVOS (CONDICIONAL) */}
                  {mostrarInactivos && conductores
                    .filter((c) => c.estado !== "activo")
                    .map((conductor) => {
                      const stats = obtenerEstadisticasConductor(conductor.id);
                      return (
                        <TableRow key={conductor.id} className="group relative border-l-4 border-transparent hover:border-red-600 bg-red-50/5 dark:bg-red-900/5 hover:bg-red-50/20 dark:hover:bg-red-900/10 transition-all duration-300 border-b border-border/40 last:border-0 opacity-80">
                          <TableCell className="py-3 pl-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100/80 dark:bg-zinc-800/80 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm">
                                <User className="w-5 h-5" />
                              </div>
                              <span className="font-black text-slate-500 dark:text-slate-400 tracking-tight">{conductor.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-black text-[10px] uppercase tracking-tighter bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                              Inactivo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-3 font-black text-slate-400 text-xs uppercase tracking-tighter">
                            {conductor.licencia || "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-400 font-bold text-xs">
                              <Phone className="w-3.5 h-3.5 opacity-50" />
                              {conductor.telefono || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-slate-400 text-xs">-</span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1.5">
                              <Button variant="ghost" size="icon" onClick={() => abrirDialog(conductor)}
                                className="h-9 w-9 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmarEliminar(conductor)}
                                className="h-9 w-9 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
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

        {/* CAMBIO: Dialog con colores de fondo correctos */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {conductorEditando ? "Editar Conductor" : "Nuevo Conductor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="nombre"
                  className="font-semibold text-foreground"
                >
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  required
                  placeholder="Juan Pérez"
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="licencia"
                  className="font-semibold text-foreground"
                >
                  Número de Licencia
                </Label>
                <Input
                  id="licencia"
                  value={formData.licencia}
                  onChange={(e) =>
                    setFormData({ ...formData, licencia: e.target.value })
                  }
                  placeholder="A-12345678"
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="telefono"
                  className="font-semibold text-foreground"
                >
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  placeholder="+1 234 567 890"
                  className="bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-foreground">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(val) => setFormData({ ...formData, estado: val })}
                >
                  <SelectTrigger className="bg-background border-input rounded-xl">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
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
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {crearMutation.isPending || actualizarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : conductorEditando ? (
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
          open={!!conductorAEliminar}
          onOpenChange={() => { setConductorAEliminar(null); setDeleteError(null); }}
        >
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Esta acción eliminará permanentemente al conductor{" "}
                <strong>{conductorAEliminar?.nombre}</strong>. Los viajes
                registrados con este conductor no se eliminarán, pero quedarán
                sin conductor asignado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError === "FK" ? (
              <div className="px-1 py-2 space-y-3">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Este conductor tiene viajes registrados y no puede eliminarse.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Puedes marcarlo como inactivo para que no aparezca en las listas activas.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel className="bg-background hover:bg-muted">
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    onClick={() => desactivarMutation.mutate(conductorAEliminar.id)}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={desactivarMutation.isPending}
                  >
                    {desactivarMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Desactivando...</>
                    ) : (
                      "Marcar como Inactivo"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {deleteError && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                    {deleteError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-background hover:bg-muted" disabled={eliminarMutation.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    onClick={handleEliminar}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={eliminarMutation.isPending}
                  >
                    {eliminarMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
                    ) : (
                      "Eliminar"
                    )}
                  </Button>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
