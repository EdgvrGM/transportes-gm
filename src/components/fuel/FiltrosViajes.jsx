import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, Calendar } from "lucide-react";

export default function FiltrosViajes({
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  conductorFiltro,
  setConductorFiltro,
  camionFiltro, // <--- Nuevo Prop
  setCamionFiltro, // <--- Nuevo Prop
  rutaFiltro,
  setRutaFiltro,
  periodoFiltro,
  setPeriodoFiltro,
  conductores = [],
  camiones = [], // <--- Nuevo Prop (Array vacío por defecto)
  limpiarFiltros,
}) {
  // Generamos un array del 1 al 53 para las semanas
  const semanas = Array.from({ length: 53 }, (_, i) => i + 1);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg font-bold text-slate-900">
            Filtros
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <label className="text-sm font-semibold text-slate-700">
                  Período (Año Actual)
                </label>
              </div>

              <Select
                value={periodoFiltro}
                onValueChange={(val) => {
                  setPeriodoFiltro(val);
                  if (val.startsWith("semana-")) {
                    setFechaInicio("");
                    setFechaFin("");
                  }
                }}
              >
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="todos">Todos los viajes</SelectItem>
                  {semanas.map((semana) => (
                    <SelectItem key={semana} value={`semana-${semana}`}>
                      Semana {semana}
                    </SelectItem>
                  ))}
                  <SelectItem value="personalizado" className="hidden">
                    Personalizado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {" "}
            {/* Ajustado a 5 columnas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setPeriodoFiltro("personalizado");
                }}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Fecha Fin
              </label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setPeriodoFiltro("personalizado");
                }}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Conductor
              </label>
              <Select
                value={conductorFiltro}
                onValueChange={setConductorFiltro}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {conductores.map((conductor) => (
                    <SelectItem key={conductor.id} value={String(conductor.id)}>
                      {conductor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Nuevo Select de Camión (Solo se muestra si hay camiones) */}
            {camiones.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Camión
                </label>
                <Select value={camionFiltro} onValueChange={setCamionFiltro}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {camiones.map((camion) => (
                      <SelectItem key={camion.id} value={String(camion.id)}>
                        {camion.nombre} - {camion.placas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
