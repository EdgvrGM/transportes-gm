import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from "lucide-react";

export default function GraficoEficiencia({ viajes }) {
  const rutaStats = {};
  
  viajes.forEach(viaje => {
    const rutaKey = viaje.ruta_ida || viaje.ruta || 'Sin ruta';
    const kmTotal = viaje.kilometros_total || viaje.kilometros || 0;
    const litros = viaje.litros_combustible || 0;
    
    if (!rutaStats[rutaKey]) {
      rutaStats[rutaKey] = {
        totalKm: 0,
        totalLitros: 0,
        count: 0
      };
    }
    rutaStats[rutaKey].totalKm += kmTotal;
    rutaStats[rutaKey].totalLitros += litros;
    rutaStats[rutaKey].count += 1;
  });

  const data = Object.entries(rutaStats)
    .map(([ruta, stats]) => ({
      ruta: ruta.length > 20 ? ruta.substring(0, 20) + '...' : ruta,
      eficiencia: stats.totalLitros > 0 ? (stats.totalKm / stats.totalLitros).toFixed(2) : 0,
    }))
    .sort((a, b) => b.eficiencia - a.eficiencia)
    .slice(0, 8);

  const getColor = (value) => {
    const numValue = parseFloat(value);
    if (numValue > 2.25) return '#10b981';
    if (numValue >= 2.0) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          <CardTitle className="text-lg font-bold text-slate-900">Eficiencia por Ruta</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              type="category" 
              dataKey="ruta" 
              width={120}
              stroke="#64748b"
              style={{ fontSize: '11px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`${value} km/L`, 'Eficiencia']}
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