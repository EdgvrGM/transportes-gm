import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2, Plus } from "lucide-react";
import { localDateStr } from "@/lib/fechas";
import { lunesDeSemana, sumarDias } from "@/lib/semana";
import { formatCurrency } from "@/lib/formato";
import { CATEGORIAS, getCategoria, keyDeCosto } from "./costosConfig";
import { useUnidades, useCostosRango, sumaMontos } from "./useCostos";
import ListaGastos from "./ListaGastos";
import SelectUnidad, { TODAS } from "./SelectUnidad";
import { exportarUnidad } from "./exportarExcel";

const RANGOS = [
  { semanas: 4, label: "4 semanas" },
  { semanas: 12, label: "12 semanas" },
  { semanas: 26, label: "26 semanas" },
  { semanas: 52, label: "52 semanas" },
];

const ejeMoneda = (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);

function TooltipSemana({ active, payload }) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  const partes = CATEGORIAS.filter((c) => s[c.key] > 0);
  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs min-w-[180px]">
      <div className="font-bold mb-1.5">Semana del {s.etiquetaLarga}</div>
      {partes.length === 0 ? (
        <div className="text-muted-foreground">Sin gastos</div>
      ) : (
        partes.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3 py-0.5">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
              {c.label}
            </span>
            <span className="tabular-nums text-foreground">${formatCurrency(s[c.key])}</span>
          </div>
        ))
      )}
      <div className="flex justify-between gap-3 border-t border-border mt-1.5 pt-1.5 font-bold">
        <span>Total</span>
        <span className="tabular-nums">${formatCurrency(s.total)}</span>
      </div>
    </div>
  );
}

export default function DetalleUnidad({ onEditar, onNuevo }) {
  const { toast } = useToast();
  const [unidadKey, setUnidadKey] = useState(TODAS);
  const [numSemanas, setNumSemanas] = useState(12);
  const [catFiltro, setCatFiltro] = useState(null);
  const [exportando, setExportando] = useState(false);

  const { data: unidades = [] } = useUnidades();

  const esTodas = unidadKey === TODAS;
  const unidad = esTodas ? null : unidades.find((u) => u.key === unidadKey);
  const etiqueta = esTodas ? "Toda la flota" : unidad?.etiqueta || "—";
  const unidadPorKey = useMemo(() => new Map(unidades.map((u) => [u.key, u])), [unidades]);
  const nombreUnidad = (g) => unidadPorKey.get(keyDeCosto(g))?.etiqueta || "—";

  const lunesActual = lunesDeSemana(new Date());
  const primerLunes = sumarDias(lunesActual, -7 * (numSemanas - 1));
  const desde = localDateStr(primerLunes);
  const hasta = localDateStr(sumarDias(lunesActual, 6));

  const { data: gastos = [], isLoading } = useCostosRango(desde, hasta, {
    unidad,
    enabled: esTodas || Boolean(unidad),
  });

  const semanas = useMemo(() => {
    const lista = Array.from({ length: numSemanas }, (_, i) => {
      const l = sumarDias(primerLunes, 7 * i);
      return {
        lunes: localDateStr(l),
        etiqueta: format(l, "dd MMM", { locale: es }),
        etiquetaLarga: format(l, "dd MMM yyyy", { locale: es }),
        total: 0,
        ...Object.fromEntries(CATEGORIAS.map((c) => [c.key, 0])),
      };
    });
    const porLunes = new Map(lista.map((s) => [s.lunes, s]));
    for (const g of gastos) {
      const s = porLunes.get(localDateStr(lunesDeSemana(g.fecha)));
      if (!s) continue;
      s[g.categoria] += Number(g.monto);
      s.total += Number(g.monto);
    }
    return lista;
    // primerLunes se deriva de `desde`; usar el string evita recalcular cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, desde, numSemanas]);

  const total = sumaMontos(gastos);
  const semanasConGasto = semanas.filter((s) => s.total > 0).length;
  const catsPresentes = CATEGORIAS.filter((c) => semanas.some((s) => s[c.key] > 0));
  const totalesCat = catsPresentes
    .map((c) => ({ ...c, total: semanas.reduce((a, s) => a + s[c.key], 0) }))
    .sort((a, b) => b.total - a.total);

  const gastosLista = catFiltro ? gastos.filter((g) => g.categoria === catFiltro) : gastos;

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarUnidad({
        tituloTexto: `Costos ${etiqueta} · ${desde} a ${hasta}`,
        nombreArchivo: `Costos_${etiqueta.replace(/[^\w]+/g, "_")}_${desde}_${hasta}.xlsx`,
        semanas,
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
      {/* Filtros en una fila */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SelectUnidad
          unidades={unidades}
          value={unidadKey}
          onChange={(v) => { setUnidadKey(v); setCatFiltro(null); }}
          className="sm:w-72"
          opcionTodas
        />
        <Select value={String(numSemanas)} onValueChange={(v) => setNumSemanas(Number(v))}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGOS.map((r) => (
              <SelectItem key={r.semanas} value={String(r.semanas)}>
                Últimas {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportar} disabled={exportando || !gastos.length}>
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar Excel
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-primary text-primary-foreground"
            onClick={() => onNuevo(esTodas ? {} : { unidadKey })}
          >
            <Plus className="w-4 h-4" /> Gasto
          </Button>
        </div>
      </div>

        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total del periodo</div>
              <div className="text-2xl font-black mt-1 text-foreground tabular-nums">${formatCurrency(total)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{gastos.length} gasto{gastos.length !== 1 ? "s" : ""}</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Promedio semanal</div>
              <div className="text-2xl font-black mt-1 text-foreground tabular-nums">${formatCurrency(total / numSemanas)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{semanasConGasto} de {numSemanas} semanas con gasto</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border col-span-2 lg:col-span-1">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Categoría principal</div>
              <div className="text-2xl font-black mt-1 text-foreground truncate">{totalesCat[0]?.label || "—"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {totalesCat[0] ? `$${formatCurrency(totalesCat[0].total)} · ${((totalesCat[0].total / total) * 100).toFixed(0)}% del total` : "—"}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-sm font-bold text-foreground">Gasto semanal · {etiqueta}</div>
              {catsPresentes.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {catsPresentes.map((c) => (
                    <span key={c.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : total === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-16">Sin gastos en este periodo.</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semanas} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="etiqueta"
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={ejeMoneda}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip content={<TooltipSemana />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
                    {catsPresentes.map((c) => (
                      <Bar
                        key={c.key}
                        dataKey={c.key}
                        stackId="s"
                        fill={c.color}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="text-sm font-bold text-foreground mr-2">Gastos</div>
              <button
                onClick={() => setCatFiltro(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                  !catFiltro ? "border-gm-primary bg-gm-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                Todas · ${formatCurrency(total)}
              </button>
              {totalesCat.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCatFiltro(c.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                    catFiltro === c.key ? "border-gm-primary bg-gm-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.label} · ${formatCurrency(c.total)}
                </button>
              ))}
            </div>
            <ListaGastos
              gastos={gastosLista}
              onEditar={onEditar}
              nombreUnidad={esTodas ? nombreUnidad : undefined}
              vacio={catFiltro ? `Sin gastos de ${getCategoria(catFiltro).label.toLowerCase()} en el periodo.` : "Sin gastos en el periodo."}
            />
          </div>
        </>
    </div>
  );
}
