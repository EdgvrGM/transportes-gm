import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Phone, CreditCard, Loader2, Trash2 } from "lucide-react";

export default function FuelConductores() {
  const queryClient = useQueryClient();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [conductorEditando, setConductorEditando] = useState(null);
  const [conductorAEliminar, setConductorAEliminar] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    licencia: "",
    telefono: "",
    estado: "activo",
  });

  const { data: conductores = [], isLoading } = useQuery({
    queryKey: ['conductores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('Conductor').select('*');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: viajes = [] } = useQuery({
    queryKey: ['viajes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('Viaje').select('*');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const crearMutation = useMutation({
    mutationFn: async (data) => {
        const { data: result, error } = await supabase.from('Conductor').insert([data]).select();
        if (error) throw new Error(error.message);
        return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductores'] });
      cerrarDialog();
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
        const { data: result, error } = await supabase.from('Conductor').update(data).eq('id', id).select();
        if (error) throw new Error(error.message);
        return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductores'] });
      cerrarDialog();
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
        const { error } = await supabase.from('Conductor').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conductores'] });
      setConductorAEliminar(null);
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
    setConductorAEliminar(conductor);
  };

  const handleEliminar = () => {
    if (conductorAEliminar) {
      eliminarMutation.mutate(conductorAEliminar.id);
    }
  };

  const obtenerEstadisticasConductor = (conductorId) => {
    const viajesConductor = viajes.filter(v => v.conductor_id === conductorId);
    const totalViajes = viajesConductor.length;
    const totalKm = viajesConductor.reduce((sum, v) => sum + (v.kilometros_total || v.kilometros || 0), 0);
    const totalLitros = viajesConductor.reduce((sum, v) => sum + (v.litros_combustible || 0), 0);
    const promedio = totalLitros > 0 ? totalKm / totalLitros : 0;

    return { totalViajes, totalKm, promedio };
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
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Conductores</h1>
            <p className="text-slate-600">Gestiona tu equipo de conductores</p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Conductor
          </Button>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-xl font-bold text-slate-900">Lista de Conductores</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-slate-700">Nombre</TableHead>
                    <TableHead className="font-semibold text-slate-700">Licencia</TableHead>
                    <TableHead className="font-semibold text-slate-700">Teléfono</TableHead>
                    <TableHead className="font-semibold text-slate-700">Estado</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Viajes</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Eficiencia</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conductores.map((conductor) => {
                    const stats = obtenerEstadisticasConductor(conductor.id);
                    return (
                      <TableRow key={conductor.id} className="hover:bg-slate-50 transition-colors duration-150">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                              <span className="text-white font-bold">
                                {conductor.nombre[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-semibold text-slate-900">{conductor.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-700">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                            {conductor.licencia || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {conductor.telefono || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={conductor.estado === 'activo' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {conductor.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-900">
                          {stats.totalViajes}
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
                              onClick={() => abrirDialog(conductor)}
                              className="hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmarEliminar(conductor)}
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
                {conductorEditando ? 'Editar Conductor' : 'Nuevo Conductor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-semibold">
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licencia" className="font-semibold">Número de Licencia</Label>
                <Input
                  id="licencia"
                  value={formData.licencia}
                  onChange={(e) => setFormData({...formData, licencia: e.target.value})}
                  placeholder="A-12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono" className="font-semibold">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  placeholder="+1 234 567 890"
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
                  disabled={crearMutation.isPending || actualizarMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {(crearMutation.isPending || actualizarMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    conductorEditando ? 'Actualizar' : 'Crear'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!conductorAEliminar} onOpenChange={() => setConductorAEliminar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente al conductor <strong>{conductorAEliminar?.nombre}</strong>.
                Los viajes registrados con este conductor no se eliminarán, pero quedarán sin conductor asignado.
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
                  'Eliminar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

