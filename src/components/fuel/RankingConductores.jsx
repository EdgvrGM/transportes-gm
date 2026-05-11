import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, AlertTriangle, TrendingUp, TrendingDown, User } from "lucide-react";

export default function RankingConductores({ viajes, conductores }) {
  const ranking = useMemo(() => {
    if (!viajes.length || !conductores.length) return [];

    const statsPorConductor = {};

    viajes.forEach((v) => {
      const litros = parseFloat(v.litros_combustible) || 0;
      const km = parseFloat(v.kilometros_total || v.kilometros) || 0;
      
      // Solo incluir viajes de conductores activos
      const conductor = conductores.find((c) => String(c.id) === String(v.conductor_id));
      if (!conductor || conductor.activo === false) return;

      if (litros > 0 && km > 0) {
        if (!statsPorConductor[v.conductor_id]) {
          statsPorConductor[v.conductor_id] = { totalKm: 0, totalLitros: 0, viajesCount: 0 };
        }
        statsPorConductor[v.conductor_id].totalKm += km;
        statsPorConductor[v.conductor_id].totalLitros += litros;
        statsPorConductor[v.conductor_id].viajesCount += 1;
      }
    });

    const lista = Object.keys(statsPorConductor).map((id) => {
      const stats = statsPorConductor[id];
      const conductor = conductores.find((c) => String(c.id) === String(id));
      
      // Solo incluir si el conductor existe y está activo
      if (!conductor || conductor.activo === false) return null;

      const eficiencia = stats.totalKm / stats.totalLitros;
      return {
        id,
        nombre: conductor?.nombre || "N/A",
        eficiencia,
        viajes: stats.viajesCount,
      };
    }).filter(Boolean); // Eliminar los nulos (inactivos)

    // Sort by efficiency descending
    return lista.sort((a, b) => b.eficiencia - a.eficiencia);
  }, [viajes, conductores]);

  if (ranking.length === 0) return null;

  const top3 = ranking.slice(0, 3);
  
  // Solo mostrar choferes con menos de 2.1 de eficiencia en la sección de atención
  const bottom3 = ranking
    .filter(c => c.eficiencia < 2.1)
    .sort((a, b) => a.eficiencia - b.eficiencia) // Menor rendimiento primero
    .slice(0, 3);

  const getMedalColor = (index) => {
    if (index === 0) return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30";
    if (index === 1) return "text-slate-400 bg-slate-100 dark:bg-slate-800";
    if (index === 2) return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
    return "";
  };

  return (
    <Card className="border-border shadow-xl hover:shadow-2xl transition-shadow bg-card flex flex-col rounded-[2rem] overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400" />
      <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border/60 pb-4 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white dark:bg-zinc-950 shadow-sm border border-border/80 text-blue-600 dark:text-blue-400 rounded-xl">
            <Trophy className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
            Ranking de Eficiencia
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Top 3 */}
        <div className="flex-1 p-6">
          <h4 className="text-[10px] font-black uppercase text-green-600 dark:text-green-500 tracking-widest flex items-center gap-2 mb-4">
            <TrendingUp className="w-3.5 h-3.5" /> Mejores Rendimientos
          </h4>
          <div className="space-y-4">
            {top3.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${getMedalColor(i)}`}>
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground truncate max-w-[120px]">{c.nombre}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">{c.viajes} viajes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-green-600 dark:text-green-400">{c.eficiencia.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">km/L</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 3 */}
        {bottom3.length > 0 && (
          <div className="flex-1 p-6">
            <h4 className="text-[10px] font-black uppercase text-red-600 dark:text-red-500 tracking-widest flex items-center gap-2 mb-4">
              <TrendingDown className="w-3.5 h-3.5" /> Requieren Atención
            </h4>
            <div className="space-y-4">
              {bottom3.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-500">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground truncate max-w-[120px]">{c.nombre}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{c.viajes} viajes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-600 dark:text-red-400">{c.eficiencia.toFixed(2)}</p>
                    <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">km/L</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
