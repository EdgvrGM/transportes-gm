import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Loader2, X, ChevronLeft, ChevronRight, CheckCircle2, CheckCheck } from "lucide-react";
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

const ESTADOS = [
  { value: "abierta", label: "Abierta", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
  { value: "en_progreso", label: "En progreso", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { value: "en_espera", label: "En espera", className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-700 dark:border-yellow-800" },
  { value: "completada", label: "Completada", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
];

const TIPOS = [
  { value: "preventivo", label: "Mantenimiento preventivo", shortLabel: "Preventivo", className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" },
  { value: "correctivo", label: "Reparación", shortLabel: "Correctivo", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
  { value: "emergencia", label: "Emergencia", shortLabel: "Emergencia", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800" },
];

const FORM_VACIO = {
  camion_id: "",
  km_al_abrir: "",
  horas_motor_al_abrir: "",
  tipo: "preventivo",
  catalogo_servicio_id: "",
  taller: "",
  fecha_entrada: new Date().toISOString().split("T")[0],
  fecha_salida_estimada: "",
  notas: "",
  estado: "abierta",
  fecha_salida_real: "",
  costo_total_real: "",
};

const LINEA_VACIA = { descripcion: "", tipo: "refaccion", cantidad: "", unidad: "", costo_unitario: "" };

const STEP_LABELS = ["Unidad", "Tipo", "Líneas", "Detalles"];

function estadoInfo(v) { return ESTADOS.find((e) => e.value === v) ?? ESTADOS[0]; }
function tipoInfo(v) { return TIPOS.find((t) => t.value === v) ?? TIPOS[0]; }

function formatMXN(value) {
  if (value == null || value === "") return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function generarNumeroOT(count) {
  return `OT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
}

function formatearFechaWialon(epoch) {
  if (!epoch) return "Sin fecha";
  const fecha = new Date(epoch * 1000);
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdenesTrabajoTab() {
  const queryClient = useQueryClient();

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [otEditando, setOtEditando] = useState(null);
  const [otAEliminar, setOtAEliminar] = useState(null);
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState(FORM_VACIO);
  const [lineas, setLineas] = useState([]);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const [otACompletar, setOtACompletar] = useState(null);
  const [formCompletar, setFormCompletar] = useState({ fecha_salida_real: "", costo_total_real: "", notas_finales: "" });
  const [completarError, setCompletarError] = useState(null);

  const [wialonUnidades, setWialonUnidades] = useState([]);
  const [wialonCargando, setWialonCargando] = useState(true);
  const [wialonMatch, setWialonMatch] = useState(null);

  const { data: ordenes = [], isLoading: ordenesLoading } = useQuery({
    queryKey: ["ordenes-trabajo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("OrdenTrabajo")
        .select("*, Camion(nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Camion")
        .select("id, nombre, placas")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["catalogo-servicios-ot"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("CatalogoServicio")
        .select("*, CatalogoServicioLinea(*)")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: lineasData, isFetching: lineasFetching } = useQuery({
    queryKey: ["ot-lineas", otEditando?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("OrdenTrabajoLinea")
        .select("*")
        .eq("orden_trabajo_id", otEditando.id)
        .order("orden");
      if (error) throw error;
      return data;
    },
    enabled: !!otEditando?.id,
  });

  useEffect(() => {
    if (!otEditando || !lineasData) return;
    setLineas(
      lineasData.map((l) => ({
        descripcion: l.descripcion,
        tipo: l.tipo,
        cantidad: l.cantidad ?? "",
        unidad: l.unidad ?? "",
        costo_unitario: l.costo_unitario ?? "",
      }))
    );
  }, [lineasData, otEditando?.id]);

  useEffect(() => {
    fetch("https://wialon-proxy.transportesgm.workers.dev?action=positions")
      .then((r) => r.json())
      .then((data) => setWialonUnidades(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setWialonCargando(false));
  }, []);

  // Cuando el fetch termina y ya hay un camión seleccionado (dialog abierto antes de que terminara),
  // pre-llenar los campos si aún están vacíos.
  useEffect(() => {
    if (wialonCargando || !dialogAbierto || otEditando || !formData.camion_id) return;
    if (formData.km_al_abrir !== "" || formData.horas_motor_al_abrir !== "") return;
    const camion = camiones.find((c) => String(c.id) === formData.camion_id);
    if (!camion) return;
    const match = wialonUnidades.find(
      (w) =>
        w.nombre.toLowerCase().includes(camion.nombre.toLowerCase()) ||
        camion.nombre.toLowerCase().includes(w.nombre.toLowerCase())
    );
    setWialonMatch(match ?? false);
    if (match) {
      setFormData((p) => ({
        ...p,
        km_al_abrir: String(match.odometro ?? ""),
        horas_motor_al_abrir: String(match.horas_motor ?? ""),
      }));
    }
  }, [wialonCargando]);

  const crearMutation = useMutation({
    mutationFn: async ({ formData, lineas, numero }) => {
      const { data: ot, error } = await supabase
        .from("OrdenTrabajo")
        .insert({
          numero,
          camion_id: parseInt(formData.camion_id, 10),
          catalogo_servicio_id: formData.catalogo_servicio_id || null,
          tipo: formData.tipo,
          estado: "abierta",
          taller: formData.taller || null,
          km_al_abrir: formData.km_al_abrir !== "" ? parseFloat(formData.km_al_abrir) : null,
          horas_motor_al_abrir: formData.horas_motor_al_abrir !== "" ? parseFloat(formData.horas_motor_al_abrir) : null,
          fecha_entrada: formData.fecha_entrada || null,
          fecha_salida_estimada: formData.fecha_salida_estimada || null,
          notas: formData.notas || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (lineas.length > 0) {
        const { error: linesError } = await supabase.from("OrdenTrabajoLinea").insert(
          lineas.map((l, i) => ({
            orden_trabajo_id: ot.id,
            descripcion: l.descripcion,
            tipo: l.tipo,
            cantidad: l.cantidad !== "" ? parseFloat(l.cantidad) : null,
            unidad: l.unidad || null,
            costo_unitario: l.costo_unitario !== "" ? parseFloat(l.costo_unitario) : null,
            orden: i,
          }))
        );
        if (linesError) throw linesError;
      }
    },
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, formData, lineas }) => {
      const { error } = await supabase
        .from("OrdenTrabajo")
        .update({
          camion_id: parseInt(formData.camion_id, 10),
          catalogo_servicio_id: formData.catalogo_servicio_id || null,
          tipo: formData.tipo,
          estado: formData.estado,
          taller: formData.taller || null,
          km_al_abrir: formData.km_al_abrir !== "" ? parseFloat(formData.km_al_abrir) : null,
          horas_motor_al_abrir: formData.horas_motor_al_abrir !== "" ? parseFloat(formData.horas_motor_al_abrir) : null,
          fecha_entrada: formData.fecha_entrada || null,
          fecha_salida_estimada: formData.fecha_salida_estimada || null,
          fecha_salida_real: formData.fecha_salida_real || null,
          costo_total_real: formData.costo_total_real !== "" ? parseFloat(formData.costo_total_real) : null,
          notas: formData.notas || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      const { error: delErr } = await supabase
        .from("OrdenTrabajoLinea")
        .delete()
        .eq("orden_trabajo_id", id);
      if (delErr) throw delErr;
      if (lineas.length > 0) {
        const { error: insErr } = await supabase.from("OrdenTrabajoLinea").insert(
          lineas.map((l, i) => ({
            orden_trabajo_id: id,
            descripcion: l.descripcion,
            tipo: l.tipo,
            cantidad: l.cantidad !== "" ? parseFloat(l.cantidad) : null,
            unidad: l.unidad || null,
            costo_unitario: l.costo_unitario !== "" ? parseFloat(l.costo_unitario) : null,
            orden: i,
          }))
        );
        if (insErr) throw insErr;
      }
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("OrdenTrabajo").delete().eq("id", id);
      if (error) throw error;
    },
  });

  const completarMutation = useMutation({
    mutationFn: async ({ id, fecha_salida_real, costo_total_real, notasBase, notas_finales }) => {
      const notasFinal = [notasBase, notas_finales].filter(Boolean).join("\n") || null;
      const { error } = await supabase
        .from("OrdenTrabajo")
        .update({
          estado: "completada",
          fecha_salida_real,
          costo_total_real: costo_total_real !== "" ? parseFloat(costo_total_real) : null,
          notas: notasFinal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
  });

  const abrirCrear = () => {
    setOtEditando(null);
    setFormData({ ...FORM_VACIO, fecha_entrada: new Date().toISOString().split("T")[0] });
    setLineas([]);
    setFormError(null);
    setPaso(1);
    setDialogAbierto(true);
  };

  const abrirEditar = (ot) => {
    setOtEditando(ot);
    setFormData({
      camion_id: String(ot.camion_id ?? ""),
      km_al_abrir: ot.km_al_abrir ?? "",
      horas_motor_al_abrir: ot.horas_motor_al_abrir ?? "",
      tipo: ot.tipo,
      catalogo_servicio_id: ot.catalogo_servicio_id ?? "",
      taller: ot.taller ?? "",
      fecha_entrada: ot.fecha_entrada ?? "",
      fecha_salida_estimada: ot.fecha_salida_estimada ?? "",
      notas: ot.notas ?? "",
      estado: ot.estado,
      fecha_salida_real: ot.fecha_salida_real ?? "",
      costo_total_real: ot.costo_total_real ?? "",
    });
    setLineas([]);
    setFormError(null);
    setPaso(1);
    setWialonMatch(null);
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setOtEditando(null);
    setFormData(FORM_VACIO);
    setLineas([]);
    setFormError(null);
    setPaso(1);
    setWialonMatch(null);
  };

  const agregarLinea = () => setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  const eliminarLineaIdx = (i) => setLineas((prev) => prev.filter((_, idx) => idx !== i));
  const actualizarLinea = (i, campo, valor) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));

  const seleccionarCatalogo = (catalogoId) => {
    setFormData((prev) => ({ ...prev, catalogo_servicio_id: catalogoId }));
    if (!catalogoId) { setLineas([]); return; }
    const servicio = catalogo.find((s) => s.id === catalogoId);
    if (!servicio) return;
    setLineas(
      [...(servicio.CatalogoServicioLinea ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .map((l) => ({
          descripcion: l.descripcion,
          tipo: l.tipo,
          cantidad: l.cantidad_estimada ?? "",
          unidad: l.unidad ?? "",
          costo_unitario: l.costo_estimado ?? "",
        }))
    );
  };

  const siguientePaso = () => {
    if (paso === 1 && !formData.camion_id) {
      setFormError("Selecciona una unidad para continuar.");
      return;
    }
    setFormError(null);
    setPaso((p) => p + 1);
  };

  const anteriorPaso = () => {
    if (paso === 1) { cerrarDialog(); return; }
    setFormError(null);
    setPaso((p) => p - 1);
  };

  const handleGuardar = async () => {
    setFormError(null);
    const finalFormData = { ...formData };
    if (finalFormData.estado === "completada" && !finalFormData.fecha_salida_real) {
      finalFormData.fecha_salida_real = new Date().toISOString().split("T")[0];
    }
    try {
      if (otEditando) {
        await editarMutation.mutateAsync({ id: otEditando.id, formData: finalFormData, lineas });
      } else {
        const numero = generarNumeroOT(ordenes.length);
        await crearMutation.mutateAsync({ formData: finalFormData, lineas, numero });
      }
      queryClient.invalidateQueries({ queryKey: ["ordenes-trabajo"] });
      cerrarDialog();
    } catch (err) {
      setFormError(err.message ?? "Error al guardar");
    }
  };

  const abrirCompletar = (ot) => {
    setOtACompletar(ot);
    setFormCompletar({ fecha_salida_real: new Date().toISOString().split("T")[0], costo_total_real: "", notas_finales: "" });
    setCompletarError(null);
  };

  const cerrarCompletar = () => { setOtACompletar(null); setCompletarError(null); };

  const handleCompletar = async () => {
    setCompletarError(null);
    try {
      await completarMutation.mutateAsync({
        id: otACompletar.id,
        fecha_salida_real: formCompletar.fecha_salida_real || new Date().toISOString().split("T")[0],
        costo_total_real: formCompletar.costo_total_real,
        notasBase: otACompletar.notas,
        notas_finales: formCompletar.notas_finales,
      });
      queryClient.invalidateQueries({ queryKey: ["ordenes-trabajo"] });
      cerrarCompletar();
    } catch (err) {
      setCompletarError(err.message ?? "Error al completar la orden");
    }
  };

  const confirmarEliminar = (ot) => { setDeleteError(null); setOtAEliminar(ot); };

  const handleEliminar = async () => {
    setDeleteError(null);
    try {
      await eliminarMutation.mutateAsync(otAEliminar.id);
      queryClient.invalidateQueries({ queryKey: ["ordenes-trabajo"] });
      setOtAEliminar(null);
    } catch (err) {
      setDeleteError(err.message ?? "Error al eliminar");
    }
  };

  const catalogoFiltrado = catalogo.filter((s) => s.categoria === formData.tipo);
  const totalEstimado = lineas.reduce(
    (sum, l) => sum + (parseFloat(l.cantidad) || 0) * (parseFloat(l.costo_unitario) || 0),
    0
  );
  const isPending = crearMutation.isPending || editarMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Órdenes de Trabajo</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ordenes.length} {ordenes.length === 1 ? "orden registrada" : "órdenes registradas"}
          </p>
        </div>
        <Button onClick={abrirCrear} className="gap-2 bg-gm-primary text-slate-900 hover:bg-yellow-400">
          <Plus className="w-4 h-4" />
          Nueva OT
        </Button>
      </div>

      {ordenesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
          <p className="font-semibold mb-1">Sin órdenes de trabajo</p>
          <p className="text-sm">Crea la primera orden.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-transparent border-b border-border">
                <TableHead className="pl-6 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Número</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Unidad</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Taller</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Costo real</TableHead>
                <TableHead className="pr-6 text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.map((ot) => {
                const estado = estadoInfo(ot.estado);
                const tipo = tipoInfo(ot.tipo);
                return (
                  <TableRow key={ot.id} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                    <TableCell className="pl-6 py-4 font-mono text-sm font-semibold text-foreground">
                      {ot.numero}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{ot.Camion?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${tipo.className}`}>
                        {tipo.shortLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${estado.className}`}>
                        {estado.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ot.taller ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {ot.estado === "completada" && ot.fecha_salida_real
                        ? formatFecha(ot.fecha_salida_real)
                        : formatFecha(ot.fecha_entrada)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {ot.estado === "completada" && ot.costo_total_real != null ? (
                        <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {formatMXN(ot.costo_total_real)}
                        </span>
                      ) : (
                        formatMXN(ot.costo_total_real)
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        {ot.estado !== "completada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirCompletar(ot)}
                            className="h-8 w-8 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="Completar OT"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEditar(ot)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmarEliminar(ot)}
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

      {/* Dialog — wizard de creación/edición */}
      <Dialog open={dialogAbierto} onOpenChange={(open) => !open && cerrarDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {otEditando ? `Editar ${otEditando.numero}` : "Nueva Orden de Trabajo"}
            </DialogTitle>
          </DialogHeader>

          {/* Indicador de pasos */}
          <div className="flex items-center my-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    paso === i + 1
                      ? "bg-gm-primary text-slate-900"
                      : paso > i + 1
                      ? "bg-muted text-muted-foreground"
                      : "border-2 border-border text-muted-foreground/40"
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block transition-colors ${
                    paso === i + 1 ? "text-foreground" : "text-muted-foreground/60"
                  }`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${paso > i + 1 ? "bg-yellow-400/50" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Contenido del paso */}
          <div className="mt-3 min-h-[220px]">

            {/* Paso A: Unidad y odómetro */}
            {paso === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Unidad <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.camion_id}
                    onValueChange={(v) => {
                      setFormError(null);
                      const camion = camiones.find((c) => String(c.id) === v);
                      if (!wialonCargando && camion) {
                        const match = wialonUnidades.find(
                          (w) =>
                            w.nombre.toLowerCase().includes(camion.nombre.toLowerCase()) ||
                            camion.nombre.toLowerCase().includes(w.nombre.toLowerCase())
                        );
                        setWialonMatch(match ?? false);
                        setFormData((p) => ({
                          ...p,
                          camion_id: v,
                          km_al_abrir: match ? String(match.odometro ?? "") : "",
                          horas_motor_al_abrir: match ? String(match.horas_motor ?? "") : "",
                        }));
                      } else {
                        setWialonMatch(null);
                        setFormData((p) => ({ ...p, camion_id: v, km_al_abrir: "", horas_motor_al_abrir: "" }));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Seleccionar camión..." />
                    </SelectTrigger>
                    <SelectContent>
                      {camiones.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre} — {c.placas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.camion_id && !wialonCargando && wialonMatch && (
                    <p className="text-xs text-muted-foreground">
                      ⚡ Datos obtenidos de Wialon · Actualizado: {formatearFechaWialon(wialonMatch.ultima_actualizacion)}
                    </p>
                  )}
                  {formData.camion_id && !wialonCargando && wialonMatch === false && (
                    <p className="text-xs text-muted-foreground">
                      Sin datos de Wialon para esta unidad — ingresa los valores manualmente
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="km_al_abrir">Km al abrir</Label>
                    <Input
                      id="km_al_abrir"
                      type="number"
                      min="0"
                      value={formData.km_al_abrir}
                      onChange={(e) => setFormData((p) => ({ ...p, km_al_abrir: e.target.value }))}
                      placeholder={wialonCargando ? "Cargando..." : "Ej. 145000"}
                      disabled={wialonCargando}
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="horas_motor_al_abrir">Horas motor al abrir</Label>
                    <Input
                      id="horas_motor_al_abrir"
                      type="number"
                      min="0"
                      value={formData.horas_motor_al_abrir}
                      onChange={(e) => setFormData((p) => ({ ...p, horas_motor_al_abrir: e.target.value }))}
                      placeholder={wialonCargando ? "Cargando..." : "Ej. 3200"}
                      disabled={wialonCargando}
                      className="bg-background border-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Paso B: Tipo y servicio del catálogo */}
            {paso === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Tipo <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    {TIPOS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, tipo: t.value, catalogo_servicio_id: "" }));
                          setLineas([]);
                        }}
                        className={`flex-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all text-center leading-tight ${
                          formData.tipo === t.value
                            ? `${t.className} border-current`
                            : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Servicio del catálogo</Label>
                  <Select
                    value={formData.catalogo_servicio_id || "__none__"}
                    onValueChange={(v) => seleccionarCatalogo(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Personalizado (sin catálogo)</SelectItem>
                      {catalogoFiltrado.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {catalogoFiltrado.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay servicios en el catálogo para esta categoría.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Paso C: Líneas de trabajo */}
            {paso === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Líneas de trabajo</Label>
                  <Button type="button" variant="outline" size="sm" onClick={agregarLinea} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Agregar línea
                  </Button>
                </div>

                {lineasFetching && otEditando ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : lineas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                    Sin líneas — agrega refacciones o servicios.
                  </p>
                ) : (
                  <div className="space-y-2 overflow-x-auto max-h-64 overflow-y-auto pr-1">
                    {lineas.map((linea, i) => {
                      const totalLinea = (parseFloat(linea.cantidad) || 0) * (parseFloat(linea.costo_unitario) || 0);
                      return (
                        <div key={i} className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                          <Input
                            value={linea.descripcion}
                            onChange={(e) => actualizarLinea(i, "descripcion", e.target.value)}
                            placeholder="Descripción *"
                            required
                            className="bg-background border-input text-sm h-8 min-w-0 flex-1"
                          />
                          <Select value={linea.tipo} onValueChange={(v) => actualizarLinea(i, "tipo", v)}>
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
                            value={linea.cantidad}
                            onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
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
                            value={linea.costo_unitario}
                            onChange={(e) => actualizarLinea(i, "costo_unitario", e.target.value)}
                            placeholder="$/u"
                            className="bg-background border-input text-sm h-8 w-24 shrink-0"
                          />
                          <div className="h-8 w-24 shrink-0 px-2 flex items-center justify-end bg-muted/50 rounded-md text-xs font-medium text-muted-foreground border border-border/50 whitespace-nowrap">
                            {totalLinea > 0 ? formatMXN(totalLinea) : "—"}
                          </div>
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
                      );
                    })}
                  </div>
                )}

                {lineas.length > 0 && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Total estimado: </span>
                      <span className="font-semibold text-foreground">{formatMXN(totalEstimado)}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Paso D: Detalles finales */}
            {paso === 4 && (
              <div className="space-y-4">
                {otEditando && (
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(v) => setFormData((p) => ({ ...p, estado: v }))}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="taller">Taller / Mecánico</Label>
                  <Input
                    id="taller"
                    value={formData.taller}
                    onChange={(e) => setFormData((p) => ({ ...p, taller: e.target.value }))}
                    placeholder="Ej. Taller Central"
                    className="bg-background border-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha_entrada">Fecha de entrada <span className="text-red-500">*</span></Label>
                    <Input
                      id="fecha_entrada"
                      type="date"
                      value={formData.fecha_entrada}
                      onChange={(e) => setFormData((p) => ({ ...p, fecha_entrada: e.target.value }))}
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha_salida_estimada">Fecha est. salida</Label>
                    <Input
                      id="fecha_salida_estimada"
                      type="date"
                      value={formData.fecha_salida_estimada}
                      onChange={(e) => setFormData((p) => ({ ...p, fecha_salida_estimada: e.target.value }))}
                      className="bg-background border-input"
                    />
                  </div>
                </div>

                {otEditando && formData.estado === "completada" && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40">
                    <div className="space-y-1.5">
                      <Label htmlFor="fecha_salida_real">Fecha de salida</Label>
                      <Input
                        id="fecha_salida_real"
                        type="date"
                        value={formData.fecha_salida_real}
                        onChange={(e) => setFormData((p) => ({ ...p, fecha_salida_real: e.target.value }))}
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="costo_total_real">Costo real pagado (MXN)</Label>
                      <Input
                        id="costo_total_real"
                        type="number"
                        min="0"
                        value={formData.costo_total_real}
                        onChange={(e) => setFormData((p) => ({ ...p, costo_total_real: e.target.value }))}
                        placeholder="0.00"
                        className="bg-background border-input"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData((p) => ({ ...p, notas: e.target.value }))}
                    placeholder="Observaciones adicionales..."
                    rows={3}
                    className="bg-background border-input resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-destructive mt-1">{formError}</p>}

          <div className="flex gap-3 pt-3 mt-1 border-t border-border">
            <Button type="button" variant="outline" onClick={anteriorPaso} className="flex-1">
              {paso === 1 ? "Cancelar" : <><ChevronLeft className="w-4 h-4 mr-1" />Anterior</>}
            </Button>
            {paso < 4 ? (
              <Button
                type="button"
                onClick={siguientePaso}
                className="flex-1 bg-gm-primary text-slate-900 hover:bg-yellow-400"
              >
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleGuardar}
                disabled={isPending}
                className="flex-1 bg-gm-primary text-slate-900 hover:bg-yellow-400"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                ) : otEditando ? "Actualizar" : "Crear OT"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — completar OT */}
      <Dialog open={!!otACompletar} onOpenChange={(open) => !open && cerrarCompletar()}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-green-600" />
              Completar OT {otACompletar?.numero}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="c_fecha_salida">Fecha de salida</Label>
              <Input
                id="c_fecha_salida"
                type="date"
                value={formCompletar.fecha_salida_real}
                onChange={(e) => setFormCompletar((p) => ({ ...p, fecha_salida_real: e.target.value }))}
                className="bg-background border-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c_costo">Costo real pagado (MXN)</Label>
              <Input
                id="c_costo"
                type="number"
                min="0"
                value={formCompletar.costo_total_real}
                onChange={(e) => setFormCompletar((p) => ({ ...p, costo_total_real: e.target.value }))}
                placeholder="0.00"
                className="bg-background border-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c_notas">Notas finales</Label>
              <Textarea
                id="c_notas"
                value={formCompletar.notas_finales}
                onChange={(e) => setFormCompletar((p) => ({ ...p, notas_finales: e.target.value }))}
                placeholder="Observaciones de cierre (opcional)..."
                rows={3}
                className="bg-background border-input resize-none"
              />
            </div>

            {completarError && <p className="text-sm text-destructive">{completarError}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={cerrarCompletar} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCompletar}
                disabled={completarMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {completarMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                ) : "Completar orden"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog eliminar */}
      <AlertDialog
        open={!!otAEliminar}
        onOpenChange={(open) => { if (!open) { setOtAEliminar(null); setDeleteError(null); } }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden de trabajo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la orden <strong>{otAEliminar?.numero}</strong> y todas sus líneas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleEliminar}
              disabled={eliminarMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminarMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</>
              ) : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
