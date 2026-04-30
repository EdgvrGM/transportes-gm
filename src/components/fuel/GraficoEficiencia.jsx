import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Activity } from "lucide-react";
import { useTheme } from "@/components/theme-provider"; // <--- Importar Theme

export default function GraficoEficiencia({ viajes }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const rutaStats = {};
  viajes.forEach((viaje) => {
    const rutaKey = viaje.ruta_ida || viaje.ruta || "Sin ruta";
    const kmTotal = viaje.kilometros_total || viaje.kilometros || 0;
    const litros = viaje.litros_combustible || 0;
    if (!rutaStats[rutaKey])
      rutaStats[rutaKey] = { totalKm: 0, totalLitros: 0 };
    rutaStats[rutaKey].totalKm += kmTotal;
    rutaStats[rutaKey].totalLitros += litros;
  });

  const data = Object.entries(rutaStats)
    .map(([ruta, stats]) => ({
      ruta: ruta.length > 20 ? ruta.substring(0, 20) + "..." : ruta,
      eficiencia:
        stats.totalLitros > 0
          ? (stats.totalKm / stats.totalLitros).toFixed(2)
          : 0,
    }))
    .sort((a, b) => b.eficiencia - a.eficiencia)
    .slice(0, 8);

  const getColor = (value) => {
    const numValue = parseFloat(value);
    if (numValue > 2.25) return "#10b981"; // Green
    if (numValue >= 2.0) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  return (
    <Card className="border-border shadow-xl hover:shadow-2xl transition-shadow bg-card flex flex-col rounded-[2rem] overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-green-500 to-emerald-400" />
      <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-border/60 pb-4 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white dark:bg-zinc-950 shadow-sm border border-border/80 text-green-600 dark:text-green-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
            Eficiencia por Ruta
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[300px] min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#334155" : "#e2e8f0"}
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke={isDark ? "#94a3b8" : "#64748b"}
                style={{ fontSize: "10px", fontWeight: "600" }}
              />
              <YAxis
                type="category"
                dataKey="ruta"
                width={100}
                stroke={isDark ? "#94a3b8" : "#64748b"}
                style={{ fontSize: "10px", fontWeight: "600" }}
              />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }}
                contentStyle={{
                  backgroundColor: isDark ? "#0f172a" : "white",
                  borderColor: isDark ? "#1e293b" : "#e2e8f0",
                  color: isDark ? "#f8fafc" : "#0f172a",
                  borderRadius: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  border: "1px solid",
                }}
                formatter={(value) => [`${value} km/L`, "Eficiencia"]}
              />
              <Bar dataKey="eficiencia" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.eficiencia)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
