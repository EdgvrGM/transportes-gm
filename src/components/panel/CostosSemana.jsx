import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { createPageUrl } from "@/utils";
import { Receipt, ArrowUpRight } from "lucide-react";
import { localDateStr } from "@/lib/fechas";
import { lunesDeSemana, sumarDias } from "@/lib/semana";
import { formatCurrency } from "@/lib/formato";
import { etiquetaUnidad, getCategoria, tipoDeCosto, TIPOS_UNIDAD } from "@/components/costos/costosConfig";

// Resumen de la semana en curso (Lunes–Domingo) para el Panel de Control.
export default function CostosSemana() {
  const navigate = useNavigate();
  const lunes = lunesDeSemana(new Date());
  const desde = localDateStr(lunes);
  const hasta = localDateStr(sumarDias(lunes, 6));
  const desdePrevio = localDateStr(sumarDias(lunes, -7));

  const { data: gastos = [] } = useQuery({
    queryKey: ["panel-costos-semana", desdePrevio, hasta],
    queryFn: async () => {
      const { data } = await supabase
        .from("CostoUnidad")
        .select("camion_id, remolque_id, categoria, monto, fecha")
        .gte("fecha", desdePrevio)
        .lte("fecha", hasta);
      return data || [];
    },
  });

  const { data: catalogo = { camiones: [], remolques: [] } } = useQuery({
    queryKey: ["panel-costos-catalogo"],
    queryFn: async () => {
      const [c, r] = await Promise.all([
        supabase.from("Camion").select("id, nombre, placas"),
        supabase.from("Remolque").select("id, placas, tipo"),
      ]);
      return { camiones: c.data || [], remolques: r.data || [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const actual = gastos.filter((g) => g.fecha >= desde);
    const total = actual.reduce((s, g) => s + Number(g.monto), 0);
    const previo = gastos.filter((g) => g.fecha < desde).reduce((s, g) => s + Number(g.monto), 0);

    const porUnidad = new Map();
    for (const g of actual) {
      const k = `${tipoDeCosto(g)}-${g.camion_id ?? g.remolque_id ?? 0}`;
      if (!porUnidad.has(k)) porUnidad.set(k, { g, total: 0, cats: {} });
      const u = porUnidad.get(k);
      u.total += Number(g.monto);
      u.cats[g.categoria] = (u.cats[g.categoria] || 0) + Number(g.monto);
    }
    const top = [...porUnidad.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(({ g, total: t, cats }) => {
        const tipo = tipoDeCosto(g);
        const u =
          tipo === "camion"
            ? catalogo.camiones.find((c) => c.id === g.camion_id)
            : catalogo.remolques.find((r) => r.id === g.remolque_id);
        const catTop = Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0];
        return {
          etiqueta: etiquetaUnidad(tipo, u),
          tipo: TIPOS_UNIDAD[tipo].singular,
          total: t,
          catTop: getCategoria(catTop).label,
        };
      });
    return { total, previo, unidades: porUnidad.size, top };
  }, [gastos, catalogo, desde]);

  const variacion = stats.previo > 0 ? ((stats.total - stats.previo) / stats.previo) * 100 : null;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gm-primary/10 text-yellow-600">
            <Receipt className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Costos de la semana</h2>
        </div>
        <button
          onClick={() => navigate(createPageUrl("CostosUnidad"))}
          className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400 flex items-center gap-1 transition"
        >
          Abrir costos <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total semana</div>
          <div className="text-2xl font-black mt-1 text-foreground tabular-nums">${formatCurrency(stats.total)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {variacion == null
              ? `${stats.unidades} unidad${stats.unidades !== 1 ? "es" : ""} con gasto`
              : `${variacion > 0 ? "+" : ""}${variacion.toFixed(0)}% vs semana anterior`}
          </div>
        </div>
        {stats.top.length === 0 ? (
          <div className="md:col-span-3 flex items-center text-sm text-muted-foreground px-1">
            Sin gastos registrados esta semana.
          </div>
        ) : (
          stats.top.map((t, i) => (
            <div key={i} className="p-3 rounded-xl border border-border bg-background/40 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                #{i + 1} · {t.tipo}
              </div>
              <div className="font-bold text-sm text-foreground truncate mt-1">{t.etiqueta}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                <span className="font-bold text-foreground tabular-nums">${formatCurrency(t.total)}</span> · mayor gasto en {t.catTop.toLowerCase()}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
