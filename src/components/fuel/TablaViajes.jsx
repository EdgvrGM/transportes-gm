import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, MapPin, Gauge, ArrowLeftRight, Route } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TablaViajes({ viajes }) {
  const getEficienciaColor = (kmPorLitro) => {
    if (kmPorLitro > 2.25)
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    if (kmPorLitro >= 2.0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  };

  // Función corregida: usa Number en lugar de Math.round para no perder decimales
  const formatCurrency = (amount) => {
    return Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatNumber = (num, decimals = 0) => {
    return Number(num).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <Card className="border-none shadow-lg bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg font-bold text-foreground">
            Registro de Viajes
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                <TableHead className="font-semibold text-muted-foreground w-[200px]">
                  Fechas
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Conductor
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Ruta
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">
                  Kilómetros
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">
                  Litros
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground text-center">
                  km/L
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground text-right">
                  Costos
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viajes.map((viaje) => {
                const tieneRegreso =
                  viaje.ruta_regreso && viaje.kilometros_regreso;
                const tieneAdicionales =
                  viaje.rutas_adicionales && viaje.rutas_adicionales.length > 0;
                const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "-";
                const kmIda = viaje.kilometros_ida || viaje.kilometros || 0;
                const kmRegreso = viaje.kilometros_regreso || 0;
                const kmTotal = viaje.kilometros_total || kmIda;
                const litros = viaje.litros_combustible || 0;
                const eficiencia = viaje.km_por_litro || 0;
                const tipoViaje = viaje.tipo_viaje || "Sencillo";
                const isFull = tipoViaje === "FULL";

                // CÁLCULOS DE COSTOS
                const costoCombustible = viaje.costo_combustible || 0;
                const costoCasetas =
                  (viaje.casetas_ida || 0) + (viaje.casetas_regreso || 0);
                const costoTotal = costoCombustible + costoCasetas;

                return (
                  <TableRow
                    key={viaje.id}
                    className="hover:bg-muted/50 transition-colors duration-150 border-border"
                  >
                    <TableCell className="align-top py-3">
                      <div className="flex flex-wrap items-start gap-4">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                            Salida
                          </span>
                          <span className="font-medium text-foreground block bg-muted px-2 py-0.5 rounded-md w-fit text-sm">
                            {format(
                              new Date(`${viaje.fecha}T12:00:00`),
                              "dd MMM yyyy",
                              { locale: es },
                            )}
                          </span>
                        </div>
                        {viaje.fecha_llegada && (
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-blue-500 dark:text-blue-400 tracking-wider mb-0.5">
                              Llegada
                            </span>
                            <span className="font-medium text-foreground block bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md w-fit text-sm">
                              {format(
                                new Date(`${viaje.fecha_llegada}T12:00:00`),
                                "dd MMM yyyy",
                                { locale: es },
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3">
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {viaje.conductor_nombre?.[0]?.toUpperCase() || "C"}
                          </span>
                        </div>
                        <span className="text-foreground font-medium text-sm">
                          {viaje.conductor_nombre || "N/A"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3">
                      <div className="space-y-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`w-fit text-[10px] px-1.5 py-0 uppercase font-bold tracking-wider ${isFull ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" : "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"}`}
                        >
                          {tipoViaje}
                        </Badge>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                            <span className="text-foreground text-sm font-medium leading-tight">
                              {rutaPrincipal}
                            </span>
                          </div>
                          {tieneAdicionales && (
                            <div className="ml-6 space-y-1">
                              {viaje.rutas_adicionales.map((rutaAd, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Route className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                                  <span className="text-muted-foreground">
                                    {rutaAd.ruta}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {tieneRegreso && (
                            <div className="flex items-start gap-2 text-xs">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 mt-0.5" />
                              <span className="text-muted-foreground">
                                {viaje.ruta_regreso}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right align-top py-3">
                      <div className="space-y-1 mt-1">
                        <div className="font-bold text-foreground">
                          {formatNumber(kmTotal, 0)} km
                        </div>
                        {(tieneRegreso || tieneAdicionales) && (
                          <div className="text-xs text-muted-foreground font-medium">
                            ({formatNumber(kmIda, 0)}
                            {tieneAdicionales &&
                              ` + ${formatNumber(
                                viaje.rutas_adicionales.reduce(
                                  (sum, r) =>
                                    sum + (parseFloat(r.kilometros) || 0),
                                  0,
                                ),
                                0,
                              )}`}
                            {tieneRegreso && ` + ${formatNumber(kmRegreso, 0)}`}
                            )
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-semibold text-foreground align-top py-3 mt-1">
                      {formatNumber(litros, 0)} L
                    </TableCell>

                    <TableCell className="text-center align-top py-3">
                      {/* Aquí mostramos exactamente 2 decimales para el km/L */}
                      <Badge
                        variant="outline"
                        className={`${getEficienciaColor(eficiencia)} border font-semibold mt-1`}
                      >
                        <Gauge className="w-3 h-3 mr-1" />
                        {formatNumber(eficiencia, 2)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right align-top py-3 mt-1">
                      <div className="space-y-1 mt-1">
                        <div className="font-bold text-foreground text-sm">
                          {costoTotal > 0
                            ? `$${formatCurrency(costoTotal)}`
                            : "-"}
                        </div>
                        {(costoCombustible > 0 || costoCasetas > 0) && (
                          <div className="text-[10px] text-muted-foreground flex flex-col items-end">
                            {costoCombustible > 0 && (
                              <span>
                                Combustible: ${formatCurrency(costoCombustible)}
                              </span>
                            )}
                            {costoCasetas > 0 && (
                              <span>
                                Casetas: ${formatCurrency(costoCasetas)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
