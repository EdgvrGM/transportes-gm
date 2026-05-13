import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { differenceInDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileX,
  Calendar,
  Pencil,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEstadoVencimiento(fechaStr) {
  if (!fechaStr) return "sin_registro";
  try {
    const date = parseISO(fechaStr);
    if (isNaN(date.getTime())) return "sin_registro";
    const dias = differenceInDays(date, new Date());
    if (dias < 0) return "vencido";
    if (dias <= 30) return "por_vencer";
    return "vigente";
  } catch (e) {
    return "sin_registro";
  }
}

function getBadgeClasses(estado) {
  switch (estado) {
    case "vencido":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "por_vencer":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "vigente":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

function getBadgeLabel(estado, fechaStr) {
  if (estado === "sin_registro" || !fechaStr) return "Sin registro";
  try {
    const date = parseISO(fechaStr);
    if (isNaN(date.getTime())) return "Sin registro";

    if (estado === "vencido") {
      const dias = Math.abs(differenceInDays(date, new Date()));
      return `Vencido hace ${dias}d`;
    }
    if (estado === "por_vencer") {
      const dias = differenceInDays(date, new Date());
      return `Vence en ${dias}d`;
    }
    return format(date, "dd/MM/yyyy");
  } catch (e) {
    return "Sin registro";
  }
}

function StatusBadge({ fechaStr }) {
  const estado = getEstadoVencimiento(fechaStr);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeClasses(estado)}`}
    >
      {estado === "vencido" && <AlertTriangle className="w-3 h-3" />}
      {estado === "por_vencer" && <Clock className="w-3 h-3" />}
      {estado === "vigente" && <CheckCircle2 className="w-3 h-3" />}
      {estado === "sin_registro" && <FileX className="w-3 h-3" />}
      {getBadgeLabel(estado, fechaStr)}
    </span>
  );
}

// ─── Edit Dialog ─────────────────────────────────────────────────────────────

function EditDialog({ open, onClose, record, fields, tableName, idField, nameLabel }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});

  React.useEffect(() => {
    if (record) {
      const initial = {};
      fields.forEach((f) => {
        initial[f.key] = record[f.key] || "";
      });
      setValues(initial);
    }
  }, [record, fields]);

  const mutation = useMutation({
    mutationFn: async (updates) => {
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idField, record[idField]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      onClose();
    },
  });

  const handleSave = () => {
    const updates = {};
    fields.forEach((f) => {
      updates[f.key] = values[f.key] || null;
    });
    mutation.mutate(updates);
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Editar fechas — {record[nameLabel]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-sm font-medium">
                {f.label}
              </Label>
              <Input
                id={f.key}
                type="date"
                value={values[f.key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600">
            Error al guardar. Intenta de nuevo.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ allDocs }) {
  const counts = useMemo(() => {
    let vencidos = 0, por_vencer = 0, vigentes = 0, sin_registro = 0;
    (allDocs || []).forEach((doc) => {
      (doc.fechas || []).forEach((f) => {
        const estado = getEstadoVencimiento(f);
        if (estado === "vencido") vencidos++;
        else if (estado === "por_vencer") por_vencer++;
        else if (estado === "vigente") vigentes++;
        else sin_registro++;
      });
    });
    return { vencidos, por_vencer, vigentes, sin_registro };
  }, [allDocs]);

  const cards = [
    {
      label: "Documentos vencidos",
      value: counts.vencidos,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
    },
    {
      label: "Por vencer (≤30 días)",
      value: counts.por_vencer,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
    },
    {
      label: "Vigentes",
      value: counts.vigentes,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    {
      label: "Sin registro",
      value: counts.sin_registro,
      icon: FileX,
      color: "text-slate-500",
      bg: "bg-slate-50 dark:bg-slate-800/40",
      border: "border-slate-200 dark:border-slate-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`border ${c.border} ${c.bg}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground leading-tight">{c.label}</p>
                <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.value}</p>
              </div>
              <c.icon className={`w-8 h-8 ${c.color} opacity-40`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Conductores Tab ──────────────────────────────────────────────────────────

const CONDUCTOR_FIELDS = [
  { key: "venc_licencia", label: "Vencimiento Licencia" },
  { key: "venc_apto_medico", label: "Vencimiento Apto Médico" },
];

function ConductoresTab() {
  const [editRecord, setEditRecord] = useState(null);
  const [showInactivos, setShowInactivos] = useState(false);

  const { data: conductores = [], isLoading } = useQuery({
    queryKey: ["Conductor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Conductor")
        .select("id, nombre, estado, venc_licencia, venc_apto_medico")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (showInactivos ? conductores : conductores.filter((c) => c.estado === "activo")),
    [conductores, showInactivos]
  );

  if (isLoading) return <TabSkeleton />;

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInactivos((v) => !v)}
          className="gap-2 text-xs"
        >
          {showInactivos ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showInactivos ? "Ocultar inactivos" : "Mostrar inactivos"}
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">Conductor</TableHead>
              <TableHead className="font-bold">Licencia</TableHead>
              <TableHead className="font-bold">Apto Médico</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(filtered || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Sin conductores registrados
                </TableCell>
              </TableRow>
            )}
            {(filtered || []).map((c) => (
              <TableRow key={c.id} className={c.estado !== "activo" ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  {c.nombre}
                  {c.estado !== "activo" && (
                    <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">inactivo</span>
                  )}
                </TableCell>
                <TableCell><StatusBadge fechaStr={c.venc_licencia} /></TableCell>
                <TableCell><StatusBadge fechaStr={c.venc_apto_medico} /></TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditRecord(c)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((c) => (
          <MobileDocCard
            key={c.id}
            title={c.nombre}
            inactive={c.estado !== "activo"}
            fields={[
              { label: "Licencia", value: c.venc_licencia },
              { label: "Apto Médico", value: c.venc_apto_medico },
            ]}
            onEdit={() => setEditRecord(c)}
          />
        ))}
      </div>

      <EditDialog
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        record={editRecord}
        fields={CONDUCTOR_FIELDS}
        tableName="Conductor"
        idField="id"
        nameLabel="nombre"
      />
    </>
  );
}

// ─── Camiones Tab ─────────────────────────────────────────────────────────────

const CAMION_FIELDS = [
  { key: "venc_fisicomecanica", label: "Vencimiento Físico-Mecánica" },
  { key: "venc_contaminantes", label: "Vencimiento Contaminantes" },
  { key: "venc_poliza_seguro", label: "Vencimiento Póliza de Seguro" },
];

function CamionesTab() {
  const [editRecord, setEditRecord] = useState(null);

  const { data: camiones = [], isLoading } = useQuery({
    queryKey: ["Camion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Camion")
        .select("id, nombre, placas, venc_fisicomecanica, venc_contaminantes, venc_poliza_seguro")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <TabSkeleton />;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">Unidad</TableHead>
              <TableHead className="font-bold">Físico-Mecánica</TableHead>
              <TableHead className="font-bold">Contaminantes</TableHead>
              <TableHead className="font-bold">Póliza Seguro</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(camiones || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sin camiones registrados
                </TableCell>
              </TableRow>
            )}
            {(camiones || []).map((cam) => (
              <TableRow key={cam.id}>
                <TableCell>
                  <p className="font-medium">{cam.nombre}</p>
                  {cam.placas && (
                    <p className="text-xs text-muted-foreground">{cam.placas}</p>
                  )}
                </TableCell>
                <TableCell><StatusBadge fechaStr={cam.venc_fisicomecanica} /></TableCell>
                <TableCell><StatusBadge fechaStr={cam.venc_contaminantes} /></TableCell>
                <TableCell><StatusBadge fechaStr={cam.venc_poliza_seguro} /></TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditRecord(cam)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {camiones.map((cam) => (
          <MobileDocCard
            key={cam.id}
            title={cam.nombre}
            subtitle={cam.placas}
            fields={[
              { label: "Físico-Mecánica", value: cam.venc_fisicomecanica },
              { label: "Contaminantes", value: cam.venc_contaminantes },
              { label: "Póliza Seguro", value: cam.venc_poliza_seguro },
            ]}
            onEdit={() => setEditRecord(cam)}
          />
        ))}
      </div>

      <EditDialog
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        record={editRecord}
        fields={CAMION_FIELDS}
        tableName="Camion"
        idField="id"
        nameLabel="nombre"
      />
    </>
  );
}

// ─── Remolques Tab ────────────────────────────────────────────────────────────

const REMOLQUE_FIELDS = [
  { key: "venc_fisicomecanica", label: "Vencimiento Físico-Mecánica" },
];

function RemolquesTab() {
  const [editRecord, setEditRecord] = useState(null);

  const { data: remolques = [], isLoading } = useQuery({
    queryKey: ["Remolque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Remolque")
        .select("id, placas, tipo, venc_fisicomecanica")
        .order("tipo", { nullsFirst: false })
        .order("placas");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <TabSkeleton />;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">Remolque</TableHead>
              <TableHead className="font-bold">Físico-Mecánica</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(remolques || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Sin remolques registrados
                </TableCell>
              </TableRow>
            )}
            {(remolques || []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">{r.placas}</p>
                  {r.tipo && (
                    <p className="text-xs text-muted-foreground">{r.tipo}</p>
                  )}
                </TableCell>
                <TableCell><StatusBadge fechaStr={r.venc_fisicomecanica} /></TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditRecord(r)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {remolques.map((r) => (
          <MobileDocCard
            key={r.id}
            title={r.placas}
            subtitle={r.tipo}
            fields={[
              { label: "Físico-Mecánica", value: r.venc_fisicomecanica },
            ]}
            onEdit={() => setEditRecord(r)}
          />
        ))}
      </div>

      <EditDialog
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        record={editRecord}
        fields={REMOLQUE_FIELDS}
        tableName="Remolque"
        idField="id"
        nameLabel="placas"
      />
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function MobileDocCard({ title, subtitle, inactive, fields, onEdit }) {
  return (
    <Card className={`border border-border ${inactive ? "opacity-50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-foreground leading-tight">
              {title}
              {inactive && (
                <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">inactivo</span>
              )}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
            Editar
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{f.label}</span>
              <StatusBadge fechaStr={f.value} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentacionLegal() {
  // Fetch all data for summary cards
  const { data: conductores = [] } = useQuery({
    queryKey: ["Conductor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Conductor")
        .select("id, nombre, estado, venc_licencia, venc_apto_medico")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["Camion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Camion")
        .select("id, nombre, placas, venc_fisicomecanica, venc_contaminantes, venc_poliza_seguro")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: remolques = [] } = useQuery({
    queryKey: ["Remolque"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Remolque")
        .select("id, placas, tipo, venc_fisicomecanica")
        .order("tipo", { nullsFirst: false })
        .order("placas");
      if (error) throw error;
      return data;
    },
  });

  const allDocs = useMemo(() => {
    const docs = [];
    (conductores || []).forEach((c) => docs.push({ fechas: [c.venc_licencia, c.venc_apto_medico] }));
    (camiones || []).forEach((c) => docs.push({ fechas: [c.venc_fisicomecanica, c.venc_contaminantes, c.venc_poliza_seguro] }));
    (remolques || []).forEach((r) => docs.push({ fechas: [r.venc_fisicomecanica] }));
    return docs;
  }, [conductores, camiones, remolques]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Documentación Legal</h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento de vencimientos de conductores y vehículos
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards allDocs={allDocs} />

      {/* Tabs */}
      <Tabs defaultValue="conductores">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="conductores">Conductores</TabsTrigger>
          <TabsTrigger value="camiones">Camiones</TabsTrigger>
          <TabsTrigger value="remolques">Remolques</TabsTrigger>
        </TabsList>

        <TabsContent value="conductores">
          <ConductoresTab />
        </TabsContent>
        <TabsContent value="camiones">
          <CamionesTab />
        </TabsContent>
        <TabsContent value="remolques">
          <RemolquesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
