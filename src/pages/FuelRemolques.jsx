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
import { Loader2, Plus, Edit, Trash2, Package } from "lucide-react";
import { TrailerIcon } from "./Layout";

export default function FuelRemolques() {
  const queryClient = useQueryClient();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [remolqueAEliminar, setRemolqueAEliminar] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null); // <-- NUEVO ESTADO PARA ERRORES

  const [formData, setFormData] = useState({ id: null, placas: "" });

  const { data: remolques = [], isLoading } = useQuery({
    queryKey: ["remolques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Remolque")
        .select("*")
        .order("placas");
      if (error) throw error;
      return data || [];
    },
  });

  const guardarMutation = useMutation({
    mutationFn: async (datos) => {
      if (datos.id) {
        const { error } = await supabase
          .from("Remolque")
          .update({ placas: datos.placas })
          .eq("id", datos.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("Remolque")
          .insert([{ placas: datos.placas }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remolques"] });
      setDialogAbierto(false);
    },
    onError: (err) => {
      // SI HAY ERROR, LO MOSTRAMOS
      setErrorMsg(err.message || "Ocurrió un error al guardar.");
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("Remolque").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remolques"] });
      setRemolqueAEliminar(null);
    },
  });

  const abrirDialog = (remolque = null) => {
    setErrorMsg(null); // Limpiamos errores pasados
    if (remolque) {
      setFormData(remolque);
    } else {
      setFormData({ id: null, placas: "" });
    }
    setDialogAbierto(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    guardarMutation.mutate(formData);
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Catálogo de Remolques
            </h1>
            <p className="text-muted-foreground">
              Administra las placas de las cajas y remolques de tu flotilla.
            </p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2"
          >
            <Plus className="w-5 h-5" /> Nuevo Remolque
          </Button>
        </div>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrailerIcon className="w-5 h-5 text-primary" />
              Lista de Remolques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">
                    Placas del Remolque
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remolques.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hay remolques registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  remolques.map((remolque) => (
                    <TableRow key={remolque.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        {remolque.placas}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirDialog(remolque)}
                          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemolqueAEliminar(remolque.id)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* MODAL CREAR/EDITAR */}
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {formData.id ? "Editar Remolque" : "Nuevo Remolque"}
              </DialogTitle>
            </DialogHeader>

            {/* ALERTA DE ERROR VISIBLE */}
            {errorMsg && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">
                  Placas <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={formData.placas}
                  onChange={(e) =>
                    setFormData({ ...formData, placas: e.target.value })
                  }
                  placeholder="Ej. 123-TR-4"
                  className="bg-background"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogAbierto(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={guardarMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground"
                >
                  {guardarMutation.isPending ? (
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  ) : null}{" "}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL ELIMINAR */}
        <AlertDialog
          open={!!remolqueAEliminar}
          onOpenChange={() => setRemolqueAEliminar(null)}
        >
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                ¿Estás seguro?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará este remolque permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => eliminarMutation.mutate(remolqueAEliminar)}
                className="bg-red-600"
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
