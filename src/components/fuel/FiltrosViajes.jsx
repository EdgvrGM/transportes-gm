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

// TODO: agregar JSDoc de props
export default function FiltrosViajes({
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  conductorFiltro,
  setConductorFiltro,
  camionFiltro,
  setCamionFiltro,
  clienteFiltro,
  setClienteFiltro,
  rutaFiltro,
  setRutaFiltro,
  periodoFiltro,
  setPeriodoFiltro,
  conductores = [],
  camiones = [],
  clientes = [],
  limpiarFiltros,
}) {
  const semanas = Array.from({ length: 53 }, (_, i) => i + 1);

  return (
    <Card className="border-none shadow-lg bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg font-bold text-foreground">
            Filtros
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Bloque de Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <label className="text-sm font-semibold text-foreground">
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
                <SelectTrigger className="border-input bg-background">
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

          {/* Bloque de Filtros Detallados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha Inicio
              </label>
              <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors pointer-events-none" />
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setPeriodoFiltro("personalizado");
                  }}
                  className="pl-10 border-input bg-background cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha Fin
              </label>
              <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors pointer-events-none" />
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    setPeriodoFiltro("personalizado");
                  }}
                  className="pl-10 border-input bg-background cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Conductor
              </label>
              <Select
                value={conductorFiltro}
                onValueChange={setConductorFiltro}
              >
                <SelectTrigger className="border-input bg-background">
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

            {camiones.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Camión
                </label>
                <Select value={camionFiltro} onValueChange={setCamionFiltro}>
                  <SelectTrigger className="border-input bg-background">
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
              <label className="text-sm font-medium text-foreground">
                Cliente
              </label>
              <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                <SelectTrigger className="border-input bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={String(cliente.id)}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ruta
              </label>
              <Input
                type="text"
                value={rutaFiltro}
                onChange={(e) => setRutaFiltro(e.target.value)}
                placeholder="Buscar ruta..."
                className="border-input bg-background"
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={limpiarFiltros}
          className="mt-4 gap-2 hover:bg-muted"
        >
          <X className="w-4 h-4" />
          Limpiar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}
