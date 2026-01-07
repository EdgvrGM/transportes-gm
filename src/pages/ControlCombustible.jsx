import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Droplet,
  Gauge,
  TrendingUp,
  Download,
  Loader2,
} from "lucide-react";
// Importamos las funciones necesarias para calcular semanas
import { format, getISOWeek, getYear } from "date-fns";

import StatsCard from "../components/fuel/StatsCard";
import FiltrosViajes from "../components/fuel/FiltrosViajes";
import GraficoConsumo from "../components/fuel/GraficoConsumo";
import GraficoEficiencia from "../components/fuel/GraficoEficiencia";
import TablaViajes from "../components/fuel/TablaViajes";

export default function ControlCombustible() {
  const navigate = useNavigate();
  // Estados de filtros
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [conductorFiltro, setConductorFiltro] = useState("todos");
  const [rutaFiltro, setRutaFiltro] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState("todos");
  const [isExporting, setIsExporting] = useState(false);

  // Consulta de datos a Supabase
  const { data: viajes = [], isLoading: loadingViajes } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Viaje") // Asegúrate que tu tabla en Supabase sea "Viaje" (Mayúscula) o "viajes" (minúscula)
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // --- LÓGICA DE FILTRADO ---
  const viajesFiltrados = viajes.filter((viaje) => {
    let cumpleFiltros = true;
    const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "";

    // 1. Filtro por Semana (Prioridad alta)
    if (
      periodoFiltro !== "todos" &&
      periodoFiltro !== "personalizado" &&
      periodoFiltro.startsWith("semana-")
    ) {
      // Extraemos el número de semana seleccionado (ej: "semana-5" -> 5)
      const semanaSeleccionada = parseInt(periodoFiltro.split("-")[1]);

      // Obtenemos la fecha del viaje y calculamos su semana
      // Agregamos T12:00:00 para evitar problemas de zona horaria que cambien el día
      const fechaViaje = new Date(`${viaje.fecha}T12:00:00`);
      const semanaViaje = getISOWeek(fechaViaje);
      const anioViaje = getYear(fechaViaje);
      const anioActual = getYear(new Date());

      // Solo mostramos si es del año actual Y la semana coincide
      if (anioViaje !== anioActual || semanaViaje !== semanaSeleccionada) {
        cumpleFiltros = false;
      }
    }
    // 2. Filtro por Fechas Manuales (Solo si no es filtro por semana)
    else {
      if (fechaInicio && viaje.fecha < fechaInicio) cumpleFiltros = false;
      if (fechaFin && viaje.fecha > fechaFin) cumpleFiltros = false;
    }

    // 3. Resto de filtros (Conductor y Ruta)
    if (
      conductorFiltro !== "todos" &&
      String(viaje.conductor_id) !== String(conductorFiltro)
    ) {
      cumpleFiltros = false;
    }

    if (
      rutaFiltro &&
      !rutaPrincipal.toLowerCase().includes(rutaFiltro.toLowerCase())
    ) {
      cumpleFiltros = false;
    }

    return cumpleFiltros;
  });

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setConductorFiltro("todos");
    setRutaFiltro("");
    setPeriodoFiltro("todos");
  };

  const calcularEstadisticas = () => {
    const totalViajes = viajesFiltrados.length;

    const totalKm = viajesFiltrados.reduce((sum, v) => {
      const km = v.kilometros_total || v.kilometros || 0;
      return sum + km;
    }, 0);

    const totalLitros = viajesFiltrados.reduce((sum, v) => {
      const litros = v.litros_combustible || 0;
      return sum + litros;
    }, 0);

    const promedioEficiencia = totalLitros > 0 ? totalKm / totalLitros : 0;
    const totalCosto = viajesFiltrados.reduce(
      (sum, v) => sum + (v.costo_combustible || 0),
      0
    );

    return {
      totalViajes,
      totalKm,
      totalLitros,
      promedioEficiencia,
      totalCosto,
    };
  };

  const stats = calcularEstadisticas();

  const exportarExcel = () => {
    setIsExporting(true);
    try {
      const datos = viajesFiltrados.map((viaje) => {
        const rutaIda = viaje.ruta_ida || viaje.ruta || "-";
        const kmIda = viaje.kilometros_ida || viaje.kilometros || 0;
        const kmRegreso = viaje.kilometros_regreso || 0;
        const kmTotal = viaje.kilometros_total || kmIda;
        const litros = viaje.litros_combustible || 0;
        const eficiencia = viaje.km_por_litro || 0;

        return {
          Fecha: format(new Date(`${viaje.fecha}T12:00:00`), "dd/MM/yyyy"),
          Conductor: viaje.conductor_nombre || "N/A",
          "Ruta Ida": rutaIda,
          "Kilómetros Ida": kmIda,
          "Ruta Regreso": viaje.ruta_regreso || "-",
          "Kilómetros Regreso": kmRegreso || "-",
          "Kilómetros Total": kmTotal,
          Litros: litros,
          "km/L": eficiencia.toFixed(2),
          Costo: viaje.costo_combustible || 0,
        };
      });

      if (datos.length === 0) {
        setIsExporting(false);
        return;
      }

      const headers = Object.keys(datos[0]);
      const csvContent = [
        headers.join(","),
        ...datos.map((row) =>
          headers.map((header) => JSON.stringify(row[header] || "")).join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `reporte_viajes_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exportando:", error);
    }
    setIsExporting(false);
  };

  if (loadingViajes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Panel de Control
            </h1>
            <p className="text-slate-600">
              Monitoreo de consumo y eficiencia de combustible
            </p>
          </div>
          <Button
            onClick={exportarExcel}
            disabled={isExporting || viajesFiltrados.length === 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar a Excel
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Viajes"
            value={stats.totalViajes}
            icon={Truck}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            title="Kilómetros"
            value={stats.totalKm.toFixed(0)}
            subtitle="km"
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <StatsCard
            title="Litros"
            value={stats.totalLitros.toFixed(0)}
            subtitle="L"
            icon={Droplet}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          />
          <StatsCard
            title="Eficiencia"
            value={stats.promedioEficiencia.toFixed(2)}
            subtitle="km/L"
            icon={Gauge}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
          />
        </div>

        <div className="mb-8">
          <FiltrosViajes
            fechaInicio={fechaInicio}
            setFechaInicio={setFechaInicio}
            fechaFin={fechaFin}
            setFechaFin={setFechaFin}
            conductorFiltro={conductorFiltro}
            setConductorFiltro={setConductorFiltro}
            rutaFiltro={rutaFiltro}
            setRutaFiltro={setRutaFiltro}
            periodoFiltro={periodoFiltro}
            setPeriodoFiltro={setPeriodoFiltro}
            conductores={conductores}
            limpiarFiltros={limpiarFiltros}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <GraficoConsumo viajes={viajesFiltrados} />
          <GraficoEficiencia viajes={viajesFiltrados} />
        </div>

        <TablaViajes viajes={viajesFiltrados} />
      </div>
    </div>
  );
}
