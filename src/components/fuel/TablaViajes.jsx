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
      return "bg-green-100 text-green-800 border-green-200";
    if (kmPorLitro >= 2.0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg font-bold text-slate-900">
            Registro de Viajes
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-semibold text-slate-700">
                  Fecha
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Conductor
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Ruta
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">
                  Kilómetros
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">
                  Litros
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">
                  km/L
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">
                  Costo
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

                return (
                  <TableRow
                    key={viaje.id}
                    className="hover:bg-slate-50 transition-colors duration-150"
                  >
                    <TableCell className="font-medium text-slate-900">
                      {format(
                        new Date(`${viaje.fecha}T12:00:00`),
                        "dd MMM yyyy",
                        { locale: es }
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-700">
                            {viaje.conductor_nombre?.[0]?.toUpperCase() || "C"}
                          </span>
                        </div>
                        <span className="text-slate-700">
                          {viaje.conductor_nombre || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-700">
                            {rutaPrincipal}
                          </span>
                        </div>
                        {tieneAdicionales && (
                          <div className="ml-6 space-y-1">
                            {viaje.rutas_adicionales.map((rutaAd, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Route className="w-3 h-3 text-purple-500" />
                                <span className="text-slate-500">
                                  {rutaAd.ruta}
                                </span>
                                <span className="text-xs text-slate-400">
                                  ({rutaAd.kilometros} km)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {tieneRegreso && (
                          <div className="flex items-center gap-2 text-sm">
                            <ArrowLeftRight className="w-3 h-3 text-orange-500" />
                            <span className="text-slate-500">
                              {viaje.ruta_regreso}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">
                          {kmTotal.toFixed(1)} km
                        </div>
                        {(tieneRegreso || tieneAdicionales) && (
                          <div className="text-xs text-slate-500">
                            ({kmIda.toFixed(0)}
                            {tieneAdicionales &&
                              ` + ${viaje.rutas_adicionales
                                .reduce((sum, r) => sum + r.kilometros, 0)
                                .toFixed(0)}`}
                            {tieneRegreso && ` + ${kmRegreso.toFixed(0)}`})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {litros.toFixed(2)} L
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`${getEficienciaColor(
                          eficiencia
                        )} border font-semibold`}
                      >
                        <Gauge className="w-3 h-3 mr-1" />
                        {eficiencia.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {viaje.costo_combustible
                        ? `$${viaje.costo_combustible.toFixed(2)}`
                        : "-"}
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
