import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useTheme } from "@/components/theme-provider"; // <--- Importar Theme

export default function GraficoConsumo({ viajes }) {
  const { theme } = useTheme(); // <--- Usar Theme
  const isDark = theme === "dark";

  const data = viajes
    .slice(0, 10)
    .reverse()
    .map((viaje) => ({
      fecha: new Date(`${viaje.fecha}T12:00:00`).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }),
      litros: viaje.litros_combustible || 0,
      km: viaje.kilometros_total || 0,
    }));

  return (
    <Card className="border-none shadow-lg bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg font-bold text-foreground">
            Tendencia de Consumo
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#334155" : "#e2e8f0"}
            />
            <XAxis
              dataKey="fecha"
              stroke={isDark ? "#94a3b8" : "#64748b"}
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke={isDark ? "#94a3b8" : "#64748b"}
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1e293b" : "white", // Fondo dinámico
                borderColor: isDark ? "#334155" : "#e2e8f0",
                color: isDark ? "#f8fafc" : "#0f172a",
                borderRadius: "8px",
              }}
              itemStyle={{ color: isDark ? "#f8fafc" : "#0f172a" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="litros"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Litros"
              dot={{ fill: "#3b82f6", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
