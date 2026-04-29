import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  Briefcase,
  Building2,
} from "lucide-react";

export default function Clientes() {
  const queryClient = useQueryClient();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [formData, setFormData] = useState({ id: null, nombre: "", rfc: "" });

  // Obtener Clientes
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Cliente")
        .select("*")
        .order("nombre");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Guardar Cliente (Crear / Editar)
  const guardarMutation = useMutation({
    mutationFn: async (datos) => {
      if (datos.id) {
        const { error } = await supabase
          .from("Cliente")
          .update({ nombre: datos.nombre, rfc: datos.rfc })
          .eq("id", datos.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("Cliente")
          .insert([{ nombre: datos.nombre, rfc: datos.rfc }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setDialogAbierto(false);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  // Eliminar Cliente
  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("Cliente").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setClienteAEliminar(null);
    },
  });

  const abrirDialogNuevo = () => {
    setErrorMsg(null);
    setFormData({ id: null, nombre: "", rfc: "" });
    setDialogAbierto(true);
  };

  const abrirDialogEditar = (cliente) => {
    setErrorMsg(null);
    setFormData(cliente);
    setDialogAbierto(true);
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              Catálogo de Clientes
            </h1>
            <p className="text-muted-foreground">
              Administra los clientes para asignarles viajes.
            </p>
          </div>
          <Button
            onClick={abrirDialogNuevo}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl gap-2 px-6 h-12 rounded-xl"
          >
            <Plus className="w-5 h-5" /> Nuevo Cliente
          </Button>
        </div>

        {/* Tarjeta con Tabla de Datos */}
        <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Directorio de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {clientes.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-foreground">
                  No hay clientes registrados
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Haz clic en "Nuevo Cliente" para agregar uno a la base de
                  datos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px] text-center font-bold">
                        Icono
                      </TableHead>
                      <TableHead className="font-bold">
                        Razón Social / Nombre
                      </TableHead>
                      <TableHead className="font-bold">RFC</TableHead>
                      <TableHead className="text-right font-bold pr-8">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((cliente) => (
                      <TableRow
                        key={cliente.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="text-center">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                            <Briefcase className="w-4 h-4" />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {cliente.nombre}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-medium">
                          {cliente.rfc || "N/A"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                              onClick={() => abrirDialogEditar(cliente)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              onClick={() => setClienteAEliminar(cliente.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MODAL CREAR/EDITAR CLIENTE */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="max-w-md bg-card border-border rounded-[2rem] p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="px-8 py-6 bg-slate-50 dark:bg-zinc-900 border-b border-border">
              <DialogTitle className="text-2xl font-black">
                {formData.id ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription className="font-medium text-xs uppercase tracking-widest mt-1">
                Ingresa los datos correspondientes
              </DialogDescription>
            </DialogHeader>

            <div className="p-8 space-y-6">
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  Nombre del Cliente / Razón Social{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej. Walmart de México"
                  className="h-12 rounded-xl bg-slate-50 dark:bg-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  RFC (Opcional)
                </Label>
                <Input
                  value={formData.rfc}
                  onChange={(e) =>
                    setFormData({ ...formData, rfc: e.target.value })
                  }
                  placeholder="Ej. WME920220A91"
                  className="h-12 rounded-xl bg-slate-50 dark:bg-zinc-900 uppercase"
                />
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 dark:bg-zinc-900 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogAbierto(false)}
                className="rounded-xl h-11 font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => guardarMutation.mutate(formData)}
                disabled={!formData.nombre || guardarMutation.isPending}
                className="rounded-xl h-11 font-bold shadow-md bg-primary text-primary-foreground gap-2"
              >
                {guardarMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}{" "}
                Guardar Cliente
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL ELIMINAR */}
        <AlertDialog
          open={!!clienteAEliminar}
          onOpenChange={() => setClienteAEliminar(null)}
        >
          <AlertDialogContent className="rounded-[2rem] border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">
                ¿Eliminar cliente?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-base">
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl border border-border font-bold">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => eliminarMutation.mutate(clienteAEliminar)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md"
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
