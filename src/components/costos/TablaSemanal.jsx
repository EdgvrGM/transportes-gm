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
import { CATEGORIAS, getCategoria, keyDeCosto } from "./costosConfig";
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

const vacia = () => ({ porCat: {}, total: 0 });

export default function TablaSemanal({ onEditar, onNuevo }) {
  const { toast } = useToast();
  const [lunes, setLunes] = useState(() => lunesDeSemana(new Date()));
  const [verTodas, setVerTodas] = useState(false);
  const [celda, setCelda] = useState(null); // { key, etiqueta, categoria|null }
  const [exportando, setExportando] = useState(false);

  const desde = localDateStr(lunes);
  const hasta = localDateStr(sumarDias(lunes, 6));
  const desdePrevio = localDateStr(sumarDias(lunes, -7));
  const esSemanaActual = localDateStr(lunesDeSemana(new Date())) === desde;
  const fechaAlta = esSemanaActual ? undefined : desde;

  const { data: unidades = [] } = useUnidades();
  // Una sola consulta de 2 semanas: la actual para la tabla y la previa para la variación.
  const { data: gastos2sem = [], isLoading } = useCostosRango(desdePrevio, hasta);

  const gastos = useMemo(() => gastos2sem.filter((g) => g.fecha >= desde), [gastos2sem, desde]);
  const totalPrevio = useMemo(
    () => sumaMontos(gastos2sem.filter((g) => g.fecha < desde)),
    [gastos2sem, desde],
  );

  const unidadPorKey = useMemo(() => new Map(unidades.map((u) => [u.key, u])), [unidades]);
  const nombreUnidad = (g) => unidadPorKey.get(keyDeCosto(g))?.etiqueta || "—";

  // Secciones en el orden de useUnidades (camiones → remolques por tipo → generales);
  // dentro de cada sección, de mayor a menor gasto.
  const secciones = useMemo(() => {
    const acc = new Map();
    for (const g of gastos) {
      const k = keyDeCosto(g);
      if (!acc.has(k)) acc.set(k, vacia());
      const f = acc.get(k);
      f.porCat[g.categoria] = (f.porCat[g.categoria] || 0) + Number(g.monto);
      f.total += Number(g.monto);
    }
    const ordenSeccion = new Map();
    unidades.forEach((u) => {
      if (!ordenSeccion.has(u.seccion)) ordenSeccion.set(u.seccion, ordenSeccion.size);
    });
    const keys = verTodas ? unidades.map((u) => u.key) : [...acc.keys()];
    const filas = keys
      .map((k) => {
        const u = unidadPorKey.get(k);
        return {
          key: k,
          etiqueta: u?.etiqueta || "—",
          seccion: u?.seccion || "Sin clasificar",
          ...(acc.get(k) || vacia()),
        };
      })
      .sort(
        (a, b) =>
          (ordenSeccion.get(a.seccion) ?? Infinity) - (ordenSeccion.get(b.seccion) ?? Infinity) ||
          b.total - a.total ||
          a.etiqueta.localeCompare(b.etiqueta),
      );

    const lista = [];
    for (const f of filas) {
      let s = lista.at(-1);
      if (s?.nombre !== f.seccion) {
        s = { nombre: f.seccion, filas: [], total: 0 };
        lista.push(s);
      }
      s.filas.push(f);
      s.total += f.total;
    }
    return lista;
  }, [gastos, verTodas, unidades, unidadPorKey]);

  const filas = secciones.flatMap((s) => s.filas);
  const filasUnidad = filas.filter((f) => unidadPorKey.get(f.key)?.tipo !== "general");
  const total = sumaMontos(gastos);
  const totalesCat = CATEGORIAS.map((c) => ({
    ...c,
    total: filas.reduce((s, f) => s + (f.porCat[c.key] || 0), 0),
  }));
  const catPrincipal = [...totalesCat].sort((a, b) => b.total - a.total)[0];
  const masCara = filasUnidad.reduce((m, f) => (f.total > (m?.total || 0) ? f : m), null);
  const conGasto = filasUnidad.filter((f) => f.total > 0).length;
  const totalUnidades = unidades.filter((u) => u.tipo !== "general").length;

  const rango = `${format(lunes, "dd MMM", { locale: es })} – ${format(sumarDias(lunes, 6), "dd MMM yyyy", { locale: es })}`;

  const gastosCelda = celda
    ? gastos.filter((g) => keyDeCosto(g) === celda.key && (!celda.categoria || g.categoria === celda.categoria))
    : [];

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarSemana({
        tituloTexto: `Costos por unidad · ${rango}`,
        nombreArchivo: `Costos_${desde}.xlsx`,
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

  const celdaMonto = (f, v, categoria, negrita = false) =>
    v > 0 ? (
      <button
        className={`w-full text-right px-2 py-1 rounded-md tabular-nums text-foreground hover:bg-accent transition ${negrita ? "font-bold" : ""}`}
        onClick={() => setCelda({ key: f.key, etiqueta: f.etiqueta, categoria })}
        title={`${f.etiqueta}${categoria ? ` · ${getCategoria(categoria).label}` : ""}: ver desglose`}
      >
        ${formatCurrency(v)}
      </button>
    ) : (
      <span className="px-2 text-muted-foreground/50">—</span>
    );

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
          <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={() => onNuevo({ fecha: fechaAlta })}>
            <Plus className="w-4 h-4" /> Registrar gasto
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total de la semana" sub={<Variacion actual={total} previo={totalPrevio} />}>
          ${formatCurrency(total)}
        </Kpi>
        <Kpi label="Unidades con gasto" sub={`de ${totalUnidades} camiones y remolques`}>
          {conGasto}
        </Kpi>
        <Kpi label="Unidad con mayor gasto" sub={masCara ? `$${formatCurrency(masCara.total)}` : "—"}>
          {masCara ? masCara.etiqueta : "—"}
        </Kpi>
        <Kpi label="Categoría principal" sub={catPrincipal?.total > 0 ? `$${formatCurrency(catPrincipal.total)}` : "—"}>
          {catPrincipal?.total > 0 ? catPrincipal.label : "—"}
        </Kpi>
      </div>

      {/* Matriz unidades × categorías */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-sm font-bold text-foreground">Gasto por unidad y categoría</div>
          <div className="flex items-center gap-2">
            <Checkbox id="ver-todas" checked={verTodas} onCheckedChange={(v) => setVerTodas(Boolean(v))} />
            <Label htmlFor="ver-todas" className="text-xs text-muted-foreground cursor-pointer">Mostrar unidades sin gasto</Label>
          </div>
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
                {secciones.map((s) => (
                  <Fragment key={s.nombre}>
                    <tr className="bg-muted/40">
                      <td className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted whitespace-nowrap">
                        {s.nombre}
                      </td>
                      <td colSpan={CATEGORIAS.length} />
                      <td className="px-4 py-1.5 text-right text-xs font-bold tabular-nums text-muted-foreground">
                        {s.total > 0 ? `$${formatCurrency(s.total)}` : "—"}
                      </td>
                    </tr>
                    {s.filas.map((f) => (
                      <tr key={f.key} className="hover:bg-muted/30">
                        <td className="px-4 py-2 font-semibold text-foreground sticky left-0 bg-card whitespace-nowrap">{f.etiqueta}</td>
                        {CATEGORIAS.map((c) => (
                          <td key={c.key} className="px-1 py-1 text-right">
                            {celdaMonto(f, f.porCat[c.key] || 0, c.key)}
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right">{celdaMonto(f, f.total, null, true)}</td>
                      </tr>
                    ))}
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
              const prefill = { unidadKey: celda.key, categoria: celda.categoria || "", fecha: fechaAlta };
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
