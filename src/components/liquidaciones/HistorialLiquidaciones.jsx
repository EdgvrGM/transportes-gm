import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { format, parseISO, getISOWeek } from "date-fns";
import { es } from "date-fns/locale";
import {
  Loader2,
  FileText,
  FileX,
  ChevronDown,
  Search,
  Sheet,
  Users,
  Eye,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/formato";

const EMPTY_ARRAY = [];

// Vigencia del enlace firmado al PDF. El bucket es privado: no hay URL pública,
// cada apertura genera un enlace temporal.
const URL_FIRMADA_SEG = 120;

function fechaLegible(s) {
  if (!s) return "—";
  try {
    return format(parseISO(s), "dd MMM yyyy", { locale: es });
  } catch {
    return s;
  }
}

// Respaldo del título cuando la liquidación no quedó vinculada a un programa.
// El corte es el sábado que cierra la semana, y en ISO ese sábado ya pertenece
// a su propia semana: getISOWeek directo da el número correcto (a diferencia de
// numeroSemana(), que espera la fecha de INICIO del programa).
function tituloDesdeCorte(corte) {
  if (!corte || corte === "sin-fecha") return null;
  try {
    return `Semana ${getISOWeek(parseISO(corte))}`;
  } catch {
    return null;
  }
}

// Las liquidaciones anteriores al registro (origen "legacy") sólo conservaron
// los viajes y los totales: gastos, anticipos y extras no se guardaban. Hay que
// distinguirlas para no mostrar "sin gastos" junto a un total de gastos > 0.
function esLegacy(liq) {
  return liq?.detalle?.origen === "legacy" || !liq?.detalle;
}

export default function HistorialLiquidaciones() {
  const { toast } = useToast();
  const [filtroConductor, setFiltroConductor] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [semanaAbierta, setSemanaAbierta] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [pdfCargando, setPdfCargando] = useState(null);
  const [exportando, setExportando] = useState(null);

  const { data: liquidaciones = EMPTY_ARRAY, isLoading, error } = useQuery({
    queryKey: ["historial_liquidaciones"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("Liquidaciones")
        .select("*")
        .order("fecha_corte", { ascending: false });
      if (err) throw new Error(err.message);
      return data || EMPTY_ARRAY;
    },
  });

  // Títulos reales de Programa de Cargas: si alguien renombra una semana, el
  // historial la muestra igual que la página de programación.
  const { data: programas = EMPTY_ARRAY } = useQuery({
    queryKey: ["programas_historial"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("ProgramaCargas")
        .select("id, titulo");
      if (err) throw new Error(err.message);
      return data || EMPTY_ARRAY;
    },
  });

  const titulosPorSemana = useMemo(() => {
    const m = new Map();
    programas.forEach((p) => {
      if (p.titulo) m.set(String(p.id), p.titulo);
    });
    return m;
  }, [programas]);

  const tituloDe = (liq) =>
    (liq?.semana_id && titulosPorSemana.get(String(liq.semana_id))) ||
    tituloDesdeCorte(liq?.fecha_corte);

  const operadores = useMemo(() => {
    const vistos = new Map();
    liquidaciones.forEach((l) => {
      if (l.conductor_id != null && !vistos.has(String(l.conductor_id))) {
        vistos.set(String(l.conductor_id), l.conductor_nombre || `Operador ${l.conductor_id}`);
      }
    });
    return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [liquidaciones]);

  // Agrupadas por semana (fecha_corte), más reciente primero.
  const semanas = useMemo(() => {
    const tituloDeFila = (l) =>
      (l.semana_id && titulosPorSemana.get(String(l.semana_id))) ||
      tituloDesdeCorte(l.fecha_corte);

    const q = busqueda.trim().toLowerCase();
    const filtradas = liquidaciones.filter((l) => {
      if (filtroConductor !== "todos" && String(l.conductor_id) !== filtroConductor) return false;
      if (!q) return true;
      return (
        (l.conductor_nombre || "").toLowerCase().includes(q) ||
        (l.fecha_corte || "").includes(q) ||
        (tituloDeFila(l) || "").toLowerCase().includes(q)
      );
    });

    const mapa = new Map();
    filtradas.forEach((l) => {
      const clave = l.fecha_corte || "sin-fecha";
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(l);
    });

    return [...mapa.entries()]
      .map(([corte, filas]) => ({
        corte,
        titulo: tituloDeFila(filas.find((f) => f.semana_id) || filas[0]),
        filas: filas.sort((a, b) =>
          (a.conductor_nombre || "").localeCompare(b.conductor_nombre || ""),
        ),
        total: filas.reduce((s, l) => s + (Number(l.monto_final) || 0), 0),
        periodoInicio: filas[0]?.periodo_inicio,
        periodoFin: filas[0]?.periodo_fin,
      }))
      .sort((a, b) => (a.corte < b.corte ? 1 : -1));
  }, [liquidaciones, filtroConductor, busqueda, titulosPorSemana]);

  const totalGeneral = useMemo(
    () => semanas.reduce((s, w) => s + w.total, 0),
    [semanas],
  );

  const verPDF = async (liq) => {
    if (!liq.pdf_path) return;
    setPdfCargando(liq.id);
    const { data, error: err } = await supabase.storage
      .from("liquidaciones")
      .createSignedUrl(liq.pdf_path, URL_FIRMADA_SEG);
    setPdfCargando(null);

    if (err || !data?.signedUrl) {
      toast({
        variant: "destructive",
        title: "No se pudo abrir el PDF",
        description: err?.message || "El archivo ya no está en el almacenamiento.",
      });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const exportarSemana = async (semana) => {
    setExportando(semana.corte);
    try {
      // Import dinámico: ExcelJS (~1 MB) sólo se descarga al exportar.
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Nomina ${semana.corte}`);

      ws.mergeCells("A1:G1");
      ws.getCell("A1").value = semana.titulo
        ? `Nómina ${semana.titulo} — corte al ${fechaLegible(semana.corte)}`
        : `Nómina — corte al ${fechaLegible(semana.corte)}`;
      ws.getCell("A1").font = { bold: true, size: 14 };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.addRow([]);
      const encabezado = ws.addRow([
        "Operador", "Comisiones", "Gastos", "Anticipos", "Sueldo Neto", "Viajes", "Generada",
      ]);
      encabezado.font = { bold: true };
      encabezado.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAB308" } };
        c.alignment = { horizontal: "center" };
      });

      semana.filas.forEach((l) => {
        ws.addRow([
          l.conductor_nombre || `Operador ${l.conductor_id}`,
          Number(l.total_comisiones) || 0,
          Number(l.total_gastos) || 0,
          Number(l.total_anticipos) || 0,
          Number(l.monto_final) || 0,
          (l.detalle?.viajes || []).length,
          l.created_at ? format(parseISO(l.created_at), "dd/MM/yyyy HH:mm") : "—",
        ]);
      });

      const totales = ws.addRow([
        "TOTAL",
        semana.filas.reduce((s, l) => s + (Number(l.total_comisiones) || 0), 0),
        semana.filas.reduce((s, l) => s + (Number(l.total_gastos) || 0), 0),
        semana.filas.reduce((s, l) => s + (Number(l.total_anticipos) || 0), 0),
        semana.total,
        "",
        "",
      ]);
      totales.font = { bold: true };

      ws.columns = [
        { width: 34 }, { width: 14 }, { width: 14 },
        { width: 14 }, { width: 16 }, { width: 9 }, { width: 18 },
      ];
      [2, 3, 4, 5].forEach((i) => {
        ws.getColumn(i).numFmt = '"$"#,##0.00';
      });

      const buffer = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = semana.titulo
        ? `Nomina_${semana.titulo.replace(/[^\w]+/g, "_")}_${semana.corte}.xlsx`
        : `Nomina_${semana.corte}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al exportar", description: e.message });
    } finally {
      setExportando(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-[1.5rem] border-destructive/40">
        <CardContent className="p-6 text-sm font-medium text-destructive">
          No se pudo cargar el historial: {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros y resumen */}
      <Card className="shadow-lg border-border bg-card rounded-[1.5rem]">
        <CardContent className="p-6 flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Operador, semana o fecha de corte..."
                className="h-12 pl-10 rounded-xl bg-background"
              />
            </div>
          </div>
          <div className="w-full lg:w-72 space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Operador
            </label>
            <Select value={filtroConductor} onValueChange={setFiltroConductor}>
              <SelectTrigger className="h-12 rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los operadores</SelectItem>
                {operadores.map(([id, nombre]) => (
                  <SelectItem key={id} value={id}>{nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total mostrado
            </p>
            <p className="text-2xl font-black text-foreground">${formatCurrency(totalGeneral)}</p>
            <p className="text-[11px] text-muted-foreground">
              {semanas.length} {semanas.length === 1 ? "semana" : "semanas"}
            </p>
          </div>
        </CardContent>
      </Card>

      {semanas.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground border border-dashed border-border rounded-3xl">
          <p className="font-bold text-foreground mb-1">Sin liquidaciones</p>
          <p className="text-sm">
            {liquidaciones.length === 0
              ? "Todavía no se ha guardado ninguna liquidación."
              : "Ninguna coincide con los filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {semanas.map((semana) => {
            const abierta = semanaAbierta === semana.corte;
            return (
              <Card key={semana.corte} className="rounded-[1.5rem] border-border overflow-hidden">
                <button
                  onClick={() => setSemanaAbierta(abierta ? null : semana.corte)}
                  className="w-full flex items-center gap-4 p-5 md:p-6 hover:bg-muted/40 transition text-left"
                >
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${abierta ? "rotate-180" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    {semana.titulo && (
                      <p className="text-lg md:text-xl font-black uppercase tracking-wide text-yellow-600 dark:text-yellow-500 leading-tight">
                        {semana.titulo}
                      </p>
                    )}
                    <p className="font-bold text-foreground">
                      Corte al {fechaLegible(semana.corte)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {semana.filas.length} {semana.filas.length === 1 ? "operador" : "operadores"}
                      {semana.periodoInicio && semana.periodoFin && (
                        <span className="hidden sm:inline">
                          · nómina del {fechaLegible(semana.periodoInicio)} al {fechaLegible(semana.periodoFin)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Total nómina
                    </p>
                    <p className="text-xl font-black text-foreground">
                      ${formatCurrency(semana.total)}
                    </p>
                  </div>
                </button>

                {abierta && (
                  <div className="border-t border-border">
                    <div className="flex justify-end p-3 bg-muted/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportarSemana(semana)}
                        disabled={exportando === semana.corte}
                        className="rounded-xl gap-2 font-bold"
                      >
                        {exportando === semana.corte
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Sheet className="w-4 h-4" />}
                        Exportar semana a Excel
                      </Button>
                    </div>
                    <div className="divide-y divide-border/60">
                      {semana.filas.map((liq) => (
                        <div
                          key={liq.id}
                          className="p-4 md:px-6 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground truncate">
                              {liq.conductor_nombre || `Operador ${liq.conductor_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(liq.detalle?.viajes || []).length} viajes · generada{" "}
                              {liq.created_at
                                ? format(parseISO(liq.created_at), "dd/MM/yyyy HH:mm")
                                : "—"}
                              {liq.updated_at && " · regenerada"}
                            </p>
                          </div>
                          <div className="text-right shrink-0 sm:w-32">
                            <p className="text-lg font-black text-foreground">
                              ${formatCurrency(liq.monto_final)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetalleAbierto(liq)}
                              className="rounded-xl gap-1.5 font-bold"
                            >
                              <Eye className="w-3.5 h-3.5" /> Desglose
                            </Button>
                            {liq.pdf_path ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => verPDF(liq)}
                                disabled={pdfCargando === liq.id}
                                className="rounded-xl gap-1.5 font-bold"
                              >
                                {pdfCargando === liq.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <FileText className="w-3.5 h-3.5" />}
                                PDF
                              </Button>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground px-3 py-2 rounded-xl border border-dashed border-border"
                                title="Esta liquidación se generó antes de que se archivaran los PDF"
                              >
                                <FileX className="w-3.5 h-3.5" /> Sin PDF
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <DialogDesglose
        liq={detalleAbierto}
        titulo={tituloDe(detalleAbierto)}
        onClose={() => setDetalleAbierto(null)}
      />
    </div>
  );
}

function DialogDesglose({ liq, titulo, onClose }) {
  if (!liq) return null;

  const d = liq.detalle || {};
  const viajes = d.viajes || [];
  const gastos = d.gastos || [];
  const anticipos = d.anticipos || {};
  const anticiposExtras = d.anticipos_extras || [];
  const conceptosExtras = d.conceptos_extras || [];
  const legacy = esLegacy(liq);

  const filaTotal = (etiqueta, valor, clase = "") => (
    <div className={`flex justify-between items-baseline py-1.5 ${clase}`}>
      <span className="text-sm text-muted-foreground">{etiqueta}</span>
      <span className="font-bold text-foreground">${formatCurrency(valor)}</span>
    </div>
  );

  return (
    <Dialog open={!!liq} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {liq.conductor_nombre || `Operador ${liq.conductor_id}`}
          </DialogTitle>
          <DialogDescription>
            {titulo && <span className="font-bold text-yellow-600 dark:text-yellow-500">{titulo} · </span>}
            Corte al {fechaLegible(liq.fecha_corte)}
            {liq.periodo_inicio && liq.periodo_fin && (
              <> · nómina del {fechaLegible(liq.periodo_inicio)} al {fechaLegible(liq.periodo_fin)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {legacy && (
          <div className="flex gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-snug">
              Liquidación anterior al registro de detalle. Se conservan los viajes y los
              totales, pero el desglose de gastos y anticipos no se guardaba en ese momento:
              por eso las listas aparecen vacías aunque los totales no sean cero.
            </p>
          </div>
        )}

        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
              Viajes ({viajes.length})
            </h3>
            {viajes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin viajes registrados.</p>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden">
                {viajes.map((v, i) => (
                  <div key={i} className="p-3 flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-24 shrink-0">{v.fecha || "—"}</span>
                    <span className="flex-1 font-medium text-foreground truncate">{v.ruta || "—"}</span>
                    <span className="text-muted-foreground shrink-0">{v.porcentaje}%</span>
                    <span className="font-bold text-foreground w-28 text-right shrink-0">
                      ${formatCurrency(v.comision)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {conceptosExtras.length > 0 && (
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                Conceptos extras
              </h3>
              <div className="rounded-xl border border-border divide-y divide-border/60">
                {conceptosExtras.map((c, i) => (
                  <div key={i} className="p-3 flex justify-between text-sm">
                    <span className="text-foreground">{c.concepto || "—"}</span>
                    <span className="font-bold">${formatCurrency(c.monto)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
              Gastos
            </h3>
            {gastos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin desglose de gastos.</p>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border/60">
                {gastos.map((g, i) => (
                  <div key={i} className="p-3 flex justify-between text-sm">
                    <span className="text-foreground">{g.concepto || "—"}</span>
                    <span className="font-bold">${formatCurrency(g.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
              Anticipos
            </h3>
            {Object.keys(anticipos).length === 0 && anticiposExtras.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin desglose de anticipos.</p>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border/60">
                {Object.entries(anticipos)
                  .filter(([, monto]) => Number(monto) > 0)
                  .map(([dia, monto]) => (
                    <div key={dia} className="p-3 flex justify-between text-sm">
                      <span className="text-foreground">{dia}</span>
                      <span className="font-bold">${formatCurrency(monto)}</span>
                    </div>
                  ))}
                {anticiposExtras.map((a, i) => (
                  <div key={`x${i}`} className="p-3 flex justify-between text-sm">
                    <span className="text-foreground">{a.concepto || "Extra"}</span>
                    <span className="font-bold">${formatCurrency(a.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-muted/40 p-4">
            {filaTotal("Comisiones", liq.total_comisiones)}
            {filaTotal("Gastos", liq.total_gastos)}
            {filaTotal("Anticipos", -Math.abs(Number(liq.total_anticipos) || 0))}
            <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-border">
              <span className="font-black text-foreground">Sueldo Neto</span>
              <span className="text-2xl font-black text-foreground">
                ${formatCurrency(liq.monto_final)}
              </span>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
