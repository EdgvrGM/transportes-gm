import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

const CATEGORIAS = [
  { value: "preventivo", label: "Preventivo", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { value: "correctivo", label: "Correctivo", color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800" },
  { value: "emergencia", label: "Emergencia", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
];

const FORM_VACIO = {
  nombre: "",
  categoria: "preventivo",
  intervalo_km: "",
  intervalo_meses: "",
  intervalo_horas_motor: "",
  instrucciones: "",
};

const LINEA_VACIA = {
  descripcion: "",
  tipo: "refaccion",
  cantidad_estimada: "",
  unidad: "",
  costo_estimado: "",
};

function categoriaInfo(value) {
  return CATEGORIAS.find((c) => c.value === value) ?? CATEGORIAS[0];
}

function formatIntervalos(s) {
  const parts = [];
  if (s.intervalo_km) parts.push(`${s.intervalo_km.toLocaleString("es-MX")} km`);
  if (s.intervalo_meses) parts.push(`${s.intervalo_meses} meses`);
  if (s.intervalo_horas_motor) parts.push(`${s.intervalo_horas_motor} h motor`);
  return parts.length > 0 ? parts.join(" / ") : "—";
}

function buildLineasPayload(lineas, servicioId) {
  return lineas.map((l, i) => ({
    catalogo_servicio_id: servicioId,
    descripcion: l.descripcion,
    tipo: l.tipo,
    cantidad_estimada: l.cantidad_estimada !== "" ? parseFloat(l.cantidad_estimada) : null,
    unidad: l.unidad || null,
    costo_estimado: l.costo_estimado !== "" ? parseFloat(l.costo_estimado) : null,
    orden: i,
  }));
}

function buildServicioPayload(formData) {
  return {
    nombre: formData.nombre,
    categoria: formData.categoria,
    intervalo_km: formData.intervalo_km !== "" ? parseInt(formData.intervalo_km) : null,
    intervalo_meses: formData.intervalo_meses !== "" ? parseInt(formData.intervalo_meses) : null,
    intervalo_horas_motor: formData.intervalo_horas_motor !== "" ? parseInt(formData.intervalo_horas_motor) : null,
    instrucciones: formData.instrucciones || null,
  };
}

export default function CatalogoServicios() {
  const queryClient = useQueryClient();

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [servicioAEliminar, setServicioAEliminar] = useState(null);
  const [formData, setFormData] = useState(FORM_VACIO);
  const [lineas, setLineas] = useState([]);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const { data: servicios = [], isLoading } = useQuery({
    queryKey: ["catalogo-servicios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("CatalogoServicio")
        .select("*, CatalogoServicioLinea(*)")
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const crearMutation = useMutation({
    mutationFn: async ({ formData, lineas }) => {
      const { data: servicio, error } = await supabase
        .from("CatalogoServicio")
        .insert(buildServicioPayload(formData))
        .select("id")
        .single();
      if (error) throw error;
      if (lineas.length > 0) {
        const { error: err } = await supabase
          .from("CatalogoServicioLinea")
          .insert(buildLineasPayload(lineas, servicio.id));
        if (err) throw err;
      }
    },
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, formData, lineas }) => {
      const { error } = await supabase
        .from("CatalogoServicio")
        .update(buildServicioPayload(formData))
        .eq("id", id);
      if (error) throw error;
      const { error: delErr } = await supabase
        .from("CatalogoServicioLinea")
        .delete()
        .eq("catalogo_servicio_id", id);
      if (delErr) throw delErr;
      if (lineas.length > 0) {
        const { error: insErr } = await supabase
          .from("CatalogoServicioLinea")
          .insert(buildLineasPayload(lineas, id));
        if (insErr) throw insErr;
      }
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("CatalogoServicio").delete().eq("id", id);
      if (error) throw error;
    },
  });

  const abrirCrear = () => {
    setServicioEditando(null);
    setFormData(FORM_VACIO);
    setLineas([]);
    setFormError(null);
    setDialogAbierto(true);
  };

  const abrirEditar = (s) => {
    setServicioEditando(s);
    setFormData({
      nombre: s.nombre,
      categoria: s.categoria,
      intervalo_km: s.intervalo_km ?? "",
      intervalo_meses: s.intervalo_meses ?? "",
      intervalo_horas_motor: s.intervalo_horas_motor ?? "",
      instrucciones: s.instrucciones ?? "",
    });
    setLineas(
      [...(s.CatalogoServicioLinea ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .map((l) => ({
          descripcion: l.descripcion,
          tipo: l.tipo,
          cantidad_estimada: l.cantidad_estimada ?? "",
          unidad: l.unidad ?? "",
          costo_estimado: l.costo_estimado ?? "",
        }))
    );
    setFormError(null);
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setServicioEditando(null);
    setFormData(FORM_VACIO);
    setLineas([]);
    setFormError(null);
  };

  const agregarLinea = () => setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  const eliminarLineaIdx = (i) => setLineas((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarLinea = (i, campo, valor) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (servicioEditando) {
        await editarMutation.mutateAsync({ id: servicioEditando.id, formData, lineas });
      } else {
        await crearMutation.mutateAsync({ formData, lineas });
      }
      queryClient.invalidateQueries({ queryKey: ["catalogo-servicios"] });
      cerrarDialog();
    } catch (err) {
      setFormError(err.message ?? "Error al guardar");
    }
  };

  const confirmarEliminar = (s) => {
    setDeleteError(null);
    setServicioAEliminar(s);
  };

  const handleEliminar = async () => {
    setDeleteError(null);
    try {
      await eliminarMutation.mutateAsync(servicioAEliminar.id);
      queryClient.invalidateQueries({ queryKey: ["catalogo-servicios"] });
      setServicioAEliminar(null);
    } catch (err) {
      setDeleteError(err.message ?? "Error al eliminar");
    }
  };

  const isPending = crearMutation.isPending || editarMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Catálogo de Servicios</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Servicios predefinidos con refacciones y costos estimados.
          </p>
        </div>
        <Button onClick={abrirCrear} className="gap-2 bg-gm-primary text-slate-900 hover:bg-yellow-400">
          <Plus className="w-4 h-4" />
          Nuevo Servicio
        </Button>
      </div>

      {servicios.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
          <p className="font-semibold mb-1">Sin servicios registrados</p>
          <p className="text-sm">Crea el primer servicio del catálogo.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-transparent border-b border-border">
                <TableHead className="pl-6 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Servicio</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Categoría</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Intervalos</TableHead>
                <TableHead className="text-center font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Líneas</TableHead>
                <TableHead className="pr-6 text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicios.map((s) => {
                const cat = categoriaInfo(s.categoria);
                return (
                  <TableRow key={s.id} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                    <TableCell className="pl-6 py-4">
                      <p className="font-semibold text-foreground">{s.nombre}</p>
                      {s.instrucciones && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.instrucciones}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${cat.color}`}>
                        {cat.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatIntervalos(s)}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium text-foreground">
                      {s.CatalogoServicioLinea?.length ?? 0}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEditar(s)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmarEliminar(s)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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
      )}

      {/* Dialog crear / editar */}
      <Dialog open={dialogAbierto} onOpenChange={(open) => !open && cerrarDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>{servicioEditando ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej. Cambio de aceite y filtros"
                className="bg-background border-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoría <span className="text-red-500">*</span></Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventivo">Preventivo</SelectItem>
                  <SelectItem value="correctivo">Correctivo</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="intervalo_km">Cada (km)</Label>
                <Input
                  id="intervalo_km"
                  type="number"
                  min="0"
                  value={formData.intervalo_km}
                  onChange={(e) => setFormData({ ...formData, intervalo_km: e.target.value })}
                  placeholder="Ej. 10000"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intervalo_meses">Cada (meses)</Label>
                <Input
                  id="intervalo_meses"
                  type="number"
                  min="0"
                  value={formData.intervalo_meses}
                  onChange={(e) => setFormData({ ...formData, intervalo_meses: e.target.value })}
                  placeholder="Ej. 6"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intervalo_horas_motor">Cada (h motor)</Label>
                <Input
                  id="intervalo_horas_motor"
                  type="number"
                  min="0"
                  value={formData.intervalo_horas_motor}
                  onChange={(e) => setFormData({ ...formData, intervalo_horas_motor: e.target.value })}
                  placeholder="Ej. 500"
                  className="bg-background border-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instrucciones">Instrucciones</Label>
              <Textarea
                id="instrucciones"
                value={formData.instrucciones}
                onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                placeholder="Procedimiento o notas del servicio..."
                rows={3}
                className="bg-background border-input resize-none"
              />
            </div>

            {/* Líneas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Refacciones / Servicios</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarLinea}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" /> Agregar línea
                </Button>
              </div>

              {lineas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  Sin líneas — el servicio no tiene refacciones predefinidas.
                </p>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  {lineas.map((linea, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50 min-w-0"
                    >
                      <Input
                        value={linea.descripcion}
                        onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)}
                        placeholder="Descripción *"
                        required
                        className="bg-background border-input text-sm h-8 min-w-0 flex-1"
                      />
                      <Select
                        value={linea.tipo}
                        onValueChange={(v) => actualizarLinea(i, "tipo", v)}
                      >
                        <SelectTrigger className="bg-background border-input text-sm h-8 w-28 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refaccion">Refacción</SelectItem>
                          <SelectItem value="servicio">Servicio</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        value={linea.cantidad_estimada}
                        onChange={(e) => actualizarLinea(i, "cantidad_estimada", e.target.value)}
                        placeholder="Cant."
                        className="bg-background border-input text-sm h-8 w-16 shrink-0"
                      />
                      <Input
                        value={linea.unidad}
                        onChange={(e) => actualizarLinea(i, "unidad", e.target.value)}
                        placeholder="Unidad"
                        className="bg-background border-input text-sm h-8 w-20 shrink-0"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={linea.costo_estimado}
                        onChange={(e) => actualizarLinea(i, "costo_estimado", e.target.value)}
                        placeholder="$ est."
                        className="bg-background border-input text-sm h-8 w-24 shrink-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => eliminarLineaIdx(i)}
                        className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex gap-3 pt-1">
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
                disabled={isPending}
                className="flex-1 bg-gm-primary text-slate-900 hover:bg-yellow-400"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                ) : servicioEditando ? (
                  "Actualizar"
                ) : (
                  "Crear"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog eliminar */}
      <AlertDialog
        open={!!servicioAEliminar}
        onOpenChange={(open) => { if (!open) { setServicioAEliminar(null); setDeleteError(null); } }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{servicioAEliminar?.nombre}</strong> junto con todas sus líneas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleEliminar}
              disabled={eliminarMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminarMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
              ) : (
                "Eliminar"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
