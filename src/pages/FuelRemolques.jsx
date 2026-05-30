import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Edit, Trash2, Package } from "lucide-react";
import { TrailerIcon } from "./Layout";

const FECHA_LIMITE_ARCHIVO = '2026-04-24';

export default function FuelRemolques() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [remolqueAEliminar, setRemolqueAEliminar] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const [formData, setFormData] = useState({ id: null, placas: "", tipo: "Caja Seca" });

  const { data: remolques = [], isLoading } = useQuery({
    queryKey: ["remolques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Remolque")
        .select("*")
        .order("tipo")
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
          .update({ placas: datos.placas, tipo: datos.tipo })
          .eq("id", datos.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("Remolque")
          .insert([{ placas: datos.placas, tipo: datos.tipo }]);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["remolques"] });
      setDialogAbierto(false);
      toast({
        title: variables?.id ? "Remolque actualizado" : "Remolque creado",
        description: "Los cambios se guardaron correctamente.",
      });
    },
    onError: (err) => {
      // SI HAY ERROR, LO MOSTRAMOS EN EL FORMULARIO
      setErrorMsg(err.message || "Ocurrió un error al guardar.");
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      // Verificar si tiene viajes activos (post-archivo)
      const { data: viajesActivos } = await supabase
        .from("Viaje")
        .select("id")
        .eq("remolque_id", id)
        .gte("fecha", FECHA_LIMITE_ARCHIVO)
        .limit(1);

      if (viajesActivos?.length > 0) {
        throw new Error("TIENE_VIAJES_ACTIVOS");
      }

      // Sin viajes activos — desligar registros históricos para poder eliminar
      await supabase.from("Viaje").update({ remolque_id: null }).eq("remolque_id", id);

      const { error } = await supabase.from("Remolque").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remolques"] });
      setRemolqueAEliminar(null);
      setDeleteError(null);
      toast({ title: "Remolque eliminado", description: "El registro se eliminó correctamente." });
    },
    onError: (err) => {
      if (err.message === "TIENE_VIAJES_ACTIVOS") {
        setDeleteError("Este remolque tiene viajes activos y no puede eliminarse.");
      } else {
        setDeleteError(err.message || "No se pudo eliminar el remolque.");
      }
    },
  });

  const abrirDialog = (remolque = null) => {
    setErrorMsg(null); // Limpiamos errores pasados
    if (remolque) {
      setFormData({
        id: remolque.id,
        placas: remolque.placas,
        tipo: remolque.tipo || "Caja Seca",
      });
    } else {
      setFormData({ id: null, placas: "", tipo: "Caja Seca" });
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
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              Catálogo de Remolques
            </h1>
            <p className="text-muted-foreground">
              Administra las placas de las cajas y remolques de tu flotilla.
            </p>
          </div>
          <Button
            onClick={() => abrirDialog()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl gap-2 px-6 h-12 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5" /> Nuevo Remolque
          </Button>
        </div>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-bold text-foreground">
              Lista de Remolques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* ── VISTA MOBILE: Cards ── */}
            <div className="md:hidden divide-y divide-border">
              {remolques.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No hay remolques registrados.</p>
              ) : (
                remolques.map((remolque) => (
                  <div key={remolque.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                        <TrailerIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">{remolque.placas}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">{remolque.tipo || "Caja Seca"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirDialog(remolque)}
                        className="h-9 w-9 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setRemolqueAEliminar(remolque.id)}
                        className="h-9 w-9 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── VISTA DESKTOP: Tabla ── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-zinc-900/80 hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[33%] pl-8 font-bold text-[10px] uppercase tracking-widest text-slate-500">Placas del Remolque</TableHead>
                    <TableHead className="w-[33%] text-center font-bold text-[10px] uppercase tracking-widest text-slate-500">Tipo de Remolque</TableHead>
                    <TableHead className="w-[33%] text-right font-bold text-[10px] uppercase tracking-widest text-slate-500 pr-10">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remolques.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-16">
                        <Package className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 font-bold text-sm">No hay remolques registrados</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    remolques.map((remolque) => (
                      <TableRow key={remolque.id} className="group relative border-l-4 border-transparent hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-indigo-900/10 transition-all duration-300 border-b border-border/40 last:border-0">
                        <TableCell className="py-4 pl-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                              <TrailerIcon className="w-5 h-5" />
                            </div>
                            <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight">{remolque.placas}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex px-3 py-1 rounded-lg bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-400 font-bold text-[10px] uppercase tracking-tight shadow-sm">
                            {remolque.tipo || "Caja Seca"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="icon" onClick={() => abrirDialog(remolque)}
                              className="h-9 w-9 text-blue-600 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRemolqueAEliminar(remolque.id)}
                              className="h-9 w-9 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(val) => setFormData({ ...formData, tipo: val })}
                    required
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Caja Seca">Caja Seca</SelectItem>
                      <SelectItem value="Chasis Porta Contenedor">Chasis Porta Contenedor</SelectItem>
                      <SelectItem value="Plataforma">Plataforma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          onOpenChange={() => { setRemolqueAEliminar(null); setDeleteError(null); }}
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
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                {deleteError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background" disabled={eliminarMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <Button
                onClick={() => eliminarMutation.mutate(remolqueAEliminar)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={eliminarMutation.isPending}
              >
                {eliminarMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
