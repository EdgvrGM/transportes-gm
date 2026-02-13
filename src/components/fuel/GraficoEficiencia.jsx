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
    <Card className="border-none shadow-lg bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
          <CardTitle className="text-lg font-bold text-foreground">
            Eficiencia por Ruta
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#334155" : "#e2e8f0"}
            />
            <XAxis
              type="number"
              stroke={isDark ? "#94a3b8" : "#64748b"}
              style={{ fontSize: "12px" }}
            />
            <YAxis
              type="category"
              dataKey="ruta"
              width={120}
              stroke={isDark ? "#94a3b8" : "#64748b"}
              style={{ fontSize: "11px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "white",
                borderColor: isDark ? "#334155" : "#e2e8f0",
                color: isDark ? "#f8fafc" : "#0f172a",
                borderRadius: "8px",
              }}
              formatter={(value) => [`${value} km/L`, "Eficiencia"]}
            />
            <Bar dataKey="eficiencia" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.eficiencia)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
