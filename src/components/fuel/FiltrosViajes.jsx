import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Calendar } from "lucide-react";

export default function FiltrosViajes({ 
  fechaInicio, 
  setFechaInicio, 
  fechaFin, 
  setFechaFin,
  conductorFiltro,
  setConductorFiltro,
  rutaFiltro,
  setRutaFiltro,
  periodoFiltro,
  setPeriodoFiltro,
  conductores,
  limpiarFiltros 
}) {

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg font-bold text-slate-900">Filtros</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <label className="text-sm font-semibold text-slate-700">Período</label>
              </div>
              <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los viajes</SelectItem>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="esta_semana">Esta semana</SelectItem>
                  <SelectItem value="semana_pasada">Semana pasada</SelectItem>
                  <SelectItem value="ultimas_2_semanas">Últimas 2 semanas</SelectItem>
                  <SelectItem value="este_mes">Este mes</SelectItem>
                  <SelectItem value="mes_pasado">Mes pasado</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha Inicio</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setPeriodoFiltro('personalizado');
                }}
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fecha Fin</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setPeriodoFiltro('personalizado');
                }}
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Conductor</label>
              <Select value={conductorFiltro} onValueChange={setConductorFiltro}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {conductores.map((conductor) => (
                    <SelectItem key={conductor.id} value={conductor.id}>
                      {conductor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Ruta</label>
              <Input
                type="text"
                value={rutaFiltro}
                onChange={(e) => setRutaFiltro(e.target.value)}
                placeholder="Buscar ruta..."
                className="border-slate-200"
              />
            </div>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={limpiarFiltros}
          className="mt-4 gap-2 hover:bg-slate-50"
        >
          <X className="w-4 h-4" />
          Limpiar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}