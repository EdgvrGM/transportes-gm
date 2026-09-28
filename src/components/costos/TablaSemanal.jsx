import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { localDateStr } from "@/lib/fechas";
import { lunesDeSemana, sumarDias } from "@/lib/semana";
import { formatCurrency } from "@/lib/formato";
import { CATEGORIAS, TIPOS_UNIDAD, etiquetaUnidad, getCategoria, idUnidad } from "./costosConfig";
import { useUnidades, useCostosRango, sumaMontos } from "./useCostos";
import ListaGastos from "./ListaGastos";
import { exportarSemana } from "./exportarExcel";

function Kpi({ label, children, sub }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-xl md:text-2xl font-black mt-1 text-foreground tabular-nums truncate">{children}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function Variacion({ actual, previo }) {
  if (!previo) return <span>Sin gastos la semana anterior</span>;
  const pct = ((actual - previo) / previo) * 100;
  const Icon = pct > 0.5 ? TrendingUp : pct < -0.5 ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="w-3.5 h-3.5" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(0)}% vs semana anterior (${formatCurrency(previo)})
    </span>
  );
}

export default function TablaSemanal({ tipo, onEditar, onNuevo }) {
  const { toast } = useToast();
  const [lunes, setLunes] = useState(() => lunesDeSemana(new Date()));
  const [verTodas, setVerTodas] = useState(false);
  const [celda, setCelda] = useState(null); // { unidadId, categoria|null }
  const [exportando, setExportando] = useState(false);

  const esGeneral = tipo === "general";
  const desde = localDateStr(lunes);
  const hasta = localDateStr(sumarDias(lunes, 6));
  const desdePrevio = localDateStr(sumarDias(lunes, -7));
  const esSemanaActual = localDateStr(lunesDeSemana(new Date())) === desde;

  const { data: unidades = [] } = useUnidades(tipo);
  // Una sola consulta de 2 semanas: la actual para la tabla y la previa para la variación.
  const { data: gastos2sem = [], isLoading } = useCostosRango(tipo, desdePrevio, hasta);

  const gastos = useMemo(() => gastos2sem.filter((g) => g.fecha >= desde), [gastos2sem, desde]);
  const totalPrevio = useMemo(
    () => sumaMontos(gastos2sem.filter((g) => g.fecha < desde)),
    [gastos2sem, desde],
  );

  const unidadPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const nombreUnidad = (g) => etiquetaUnidad(tipo, unidadPorId.get(idUnidad(tipo, g)));

  const filas = useMemo(() => {
    const acc = new Map();
    for (const g of gastos) {
      const id = idUnidad(tipo, g);
      if (!acc.has(id)) acc.set(id, { porCat: {}, total: 0 });
      const f = acc.get(id);
      f.porCat[g.categoria] = (f.porCat[g.categoria] || 0) + Number(g.monto);
      f.total += Number(g.monto);
    }
    const base = verTodas ? unidades.map((u) => u.id) : [...acc.keys()];
    return base
      .map((id) => ({
        id,
        etiqueta: etiquetaUnidad(tipo, unidadPorId.get(id)),
        grupo: tipo === "remolque" ? unidadPorId.get(id)?.tipo || "Sin tipo" : "",
        ...(acc.get(id) || { porCat: {}, total: 0 }),
      }))
      // Remolques: primero agrupados por tipo (Caja Seca, Chasis…), dentro de cada grupo por gasto.
      .sort(
        (a, b) =>
          a.grupo.localeCompare(b.grupo) ||
          b.total - a.total ||
          a.etiqueta.localeCompare(b.etiqueta),
      );
  }, [gastos, verTodas, unidades, unidadPorId, tipo]);

  const total = sumaMontos(gastos);
  const totalesCat = CATEGORIAS.map((c) => ({
    ...c,
    total: filas.reduce((s, f) => s + (f.porCat[c.key] || 0), 0),
  }));
  const catPrincipal = [...totalesCat].sort((a, b) => b.total - a.total)[0];
  const masCara = filas.reduce((m, f) => (f.total > (m?.total || 0) ? f : m), null);
  const conGasto = filas.filter((f) => f.total > 0).length;
  const gastoMayor = gastos.reduce((m, g) => (Number(g.monto) > Number(m?.monto || 0) ? g : m), null);

  const rango = `${format(lunes, "dd MMM", { locale: es })} – ${format(sumarDias(lunes, 6), "dd MMM yyyy", { locale: es })}`;

  const gastosCelda = celda
    ? gastos.filter((g) => idUnidad(tipo, g) === celda.unidadId && (!celda.categoria || g.categoria === celda.categoria))
    : [];

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarSemana({
        tituloTexto: `Costos ${TIPOS_UNIDAD[tipo].label.toLowerCase()} · ${rango}`,
        nombreArchivo: `Costos_${TIPOS_UNIDAD[tipo].label}_${desde}.xlsx`,
        filas: filas.filter((f) => f.total > 0),
        gastos,
        nombreUnidad,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al exportar", description: e.message });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Navegación de semana */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setLunes((l) => sumarDias(l, -7))} aria-label="Semana anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLunes(lunesDeSemana(new Date()))} disabled={esSemanaActual}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => setLunes((l) => sumarDias(l, 7))} aria-label="Semana siguiente">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="ml-2">
            <div className="font-bold text-foreground capitalize">{rango}</div>
            <div className="text-xs text-muted-foreground">Lunes a domingo</div>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportar} disabled={exportando || !gastos.length}>
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar Excel
          </Button>
          <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={() => onNuevo({ tipo, fecha: esSemanaActual ? undefined : desde })}>
            <Plus className="w-4 h-4" /> Registrar gasto
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total de la semana" sub={<Variacion actual={total} previo={totalPrevio} />}>
          ${formatCurrency(total)}
        </Kpi>
        {esGeneral ? (
          <>
            <Kpi label="Compras registradas" sub="sin unidad asignada">
              {gastos.length}
            </Kpi>
            <Kpi label="Compra más grande" sub={gastoMayor ? `$${formatCurrency(gastoMayor.monto)}` : "—"}>
              {gastoMayor ? gastoMayor.concepto : "—"}
            </Kpi>
          </>
        ) : (
          <>
            <Kpi label={`${TIPOS_UNIDAD[tipo].label} con gasto`} sub={`de ${unidades.length} registrados`}>
              {conGasto}
            </Kpi>
            <Kpi label="Unidad con mayor gasto" sub={masCara ? `$${formatCurrency(masCara.total)}` : "—"}>
              {masCara ? masCara.etiqueta : "—"}
            </Kpi>
          </>
        )}
        <Kpi label="Categoría principal" sub={catPrincipal?.total > 0 ? `$${formatCurrency(catPrincipal.total)}` : "—"}>
          {catPrincipal?.total > 0 ? catPrincipal.label : "—"}
        </Kpi>
      </div>

      {/* Matriz unidades × categorías */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-bold text-foreground">
            {esGeneral ? "Gastos generales por categoría" : `Gasto por ${TIPOS_UNIDAD[tipo].singular.toLowerCase()} y categoría`}
          </div>
          {!esGeneral && (
            <div className="flex items-center gap-2">
              <Checkbox id="ver-todas" checked={verTodas} onCheckedChange={(v) => setVerTodas(Boolean(v))} />
              <Label htmlFor="ver-todas" className="text-xs text-muted-foreground cursor-pointer">Mostrar unidades sin gasto</Label>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filas.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No hay gastos registrados esta semana.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-left font-bold px-4 py-2.5 sticky left-0 bg-card min-w-[180px]">Unidad</th>
                  {CATEGORIAS.map((c) => (
                    <th key={c.key} className="text-right font-bold px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                    </th>
                  ))}
                  <th className="text-right font-bold px-4 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((f, i) => (
                  <Fragment key={f.id}>
                    {f.grupo && f.grupo !== filas[i - 1]?.grupo && (
                      <tr className="bg-muted/40">
                        <td colSpan={CATEGORIAS.length + 2} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0">
                          {f.grupo}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-semibold text-foreground sticky left-0 bg-card whitespace-nowrap">{f.etiqueta}</td>
                      {CATEGORIAS.map((c) => {
                        const v = f.porCat[c.key] || 0;
                        return (
                          <td key={c.key} className="px-1 py-1 text-right">
                            {v > 0 ? (
                              <button
                                className="w-full text-right px-2 py-1 rounded-md tabular-nums text-foreground hover:bg-accent transition"
                                onClick={() => setCelda({ unidadId: f.id, categoria: c.key, etiqueta: f.etiqueta })}
                                title={`${f.etiqueta} · ${c.label}: ver desglose`}
                              >
                                ${formatCurrency(v)}
                              </button>
                            ) : (
                              <span className="px-2 text-muted-foreground/50">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1 text-right">
                        {f.total > 0 ? (
                          <button
                            className="w-full text-right px-2 py-1 rounded-md font-bold tabular-nums text-foreground hover:bg-accent transition"
                            onClick={() => setCelda({ unidadId: f.id, categoria: null, etiqueta: f.etiqueta })}
                            title={`${f.etiqueta}: ver todos los gastos de la semana`}
                          >
                            ${formatCurrency(f.total)}
                          </button>
                        ) : (
                          <span className="px-2 text-muted-foreground/50">—</span>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold text-foreground">
                  <td className="px-4 py-2.5 sticky left-0 bg-card">Total</td>
                  {totalesCat.map((c) => (
                    <td key={c.key} className="px-3 py-2.5 text-right tabular-nums">
                      {c.total > 0 ? `$${formatCurrency(c.total)}` : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums">${formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Desglose de una celda */}
      <Dialog open={Boolean(celda)} onOpenChange={(o) => !o && setCelda(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {celda?.etiqueta}
              {celda?.categoria ? ` · ${getCategoria(celda.categoria).label}` : ""}
            </DialogTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {rango} · ${formatCurrency(sumaMontos(gastosCelda))}
            </p>
          </DialogHeader>
          <ListaGastos
            gastos={gastosCelda}
            onEditar={(g) => {
              setCelda(null);
              onEditar(g);
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const prefill = {
                tipo,
                unidadId: celda.unidadId,
                categoria: celda.categoria || "",
                fecha: esSemanaActual ? undefined : desde,
              };
              setCelda(null);
              onNuevo(prefill);
            }}
          >
            <Plus className="w-4 h-4" /> Agregar gasto a esta unidad
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
