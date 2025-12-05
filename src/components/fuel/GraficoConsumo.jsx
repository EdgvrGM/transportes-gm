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

export default function GraficoConsumo({ viajes }) {
  const data = viajes
    .slice(0, 10)
    .reverse()
    .map((viaje) => {
      const kmTotal = viaje.kilometros_total || viaje.kilometros || 0;
      const litros = viaje.litros_combustible || 0;

      return {
        fecha: new Date(`${viaje.fecha}T12:00:00`).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        }),
        litros: litros,
        km: kmTotal,
      };
    });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg font-bold text-slate-900">
            Tendencia de Consumo
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="fecha"
              stroke="#64748b"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
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
