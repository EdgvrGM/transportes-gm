import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, Fuel, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AnomaliasCombustible({ viajes }) {
  const navigate = useNavigate();

  // Find trips with very low efficiency (e.g., < 2.0 km/L)
  const anomalias = useMemo(() => {
    return viajes.filter((v) => {
      const eficiencia = parseFloat(v.km_por_litro) || 0;
      return eficiencia > 0 && eficiencia < 2.0;
    }).slice(0, 5); // Limit to top 5 recent anomalies
  }, [viajes]);

  if (anomalias.length === 0) return null;

  return (
    <Card className="border-red-200 dark:border-red-900/50 shadow-xl bg-red-50/30 dark:bg-red-950/10 flex flex-col rounded-[2rem] overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />
      <CardHeader className="bg-red-50/50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40 pb-4 pt-5 px-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white dark:bg-zinc-950 shadow-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-500 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
              Viajes Sospechosos
            </CardTitle>
            <p className="text-[10px] uppercase font-bold text-red-500 tracking-widest mt-0.5">
              Eficiencia por debajo de 2.0 km/L
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1">
        <div className="divide-y divide-red-100 dark:divide-red-900/30">
          {anomalias.map((v) => (
            <div key={v.id} className="p-5 hover:bg-white/50 dark:hover:bg-red-900/10 transition-colors flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {v.ruta_ida || v.ruta || "Ruta N/A"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {format(parseISO(v.fecha), "dd MMM yyyy")} • {v.conductor_nombre || "Conductor N/A"}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-lg font-black text-red-600 dark:text-red-500">
                      {(parseFloat(v.km_por_litro) || 0).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-red-500/70 font-bold tracking-widest uppercase">km/L</p>
                  </div>
                  <button 
                    onClick={() => navigate(createPageUrl("FuelViajes"), {
                      state: {
                        fechaInicio: v.fecha,
                        fechaFin: v.fecha,
                        conductorFiltro: String(v.conductor_id),
                        periodoFiltro: "personalizado"
                      }
                    })}
                    className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 bg-red-100/50 dark:bg-red-900/20 px-2.5 py-1 rounded-md">
                  <Fuel className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                    {v.litros_combustible} L gastados
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
