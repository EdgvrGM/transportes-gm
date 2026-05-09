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
import { format, getISOWeek, getYear } from "date-fns";

import StatsCard from "../components/fuel/StatsCard";
import ColaCarga from "../components/fuel/ColaCarga";
import FiltrosViajes from "../components/fuel/FiltrosViajes";
import GraficoEficiencia from "../components/fuel/GraficoEficiencia";
import RankingConductores from "../components/fuel/RankingConductores";
import AnomaliasCombustible from "../components/fuel/AnomaliasCombustible";
import { DollarSign } from "lucide-react";

const FECHA_LIMITE_ARCHIVO = '2026-04-24';

export default function ControlCombustible() {
  const navigate = useNavigate();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [conductorFiltro, setConductorFiltro] = useState("todos");
  const [rutaFiltro, setRutaFiltro] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState("todos");
  const [isExporting, setIsExporting] = useState(false);

  const { data: viajes = [], isLoading: loadingViajes } = useQuery({
    queryKey: ["viajes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Viaje")
        .select("*").gte("fecha", FECHA_LIMITE_ARCHIVO)
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

  const viajesFiltrados = viajes.filter((viaje) => {
    let cumpleFiltros = true;
    const rutaPrincipal = viaje.ruta_ida || viaje.ruta || "";

    if (
      periodoFiltro !== "todos" &&
      periodoFiltro !== "personalizado" &&
      periodoFiltro.startsWith("semana-")
    ) {
      const semanaSeleccionada = parseInt(periodoFiltro.split("-")[1]);
      const fechaViaje = new Date(`${viaje.fecha}T12:00:00`);
      const semanaViaje = getISOWeek(fechaViaje);
      const anioViaje = getYear(fechaViaje);
      const anioActual = getYear(new Date());

      if (anioViaje !== anioActual || semanaViaje !== semanaSeleccionada) {
        cumpleFiltros = false;
      }
    } else {
      if (fechaInicio && viaje.fecha < fechaInicio) cumpleFiltros = false;
      if (fechaFin && viaje.fecha > fechaFin) cumpleFiltros = false;
    }

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
    const totalKm = viajesFiltrados.reduce(
      (sum, v) => sum + (v.kilometros_total || v.kilometros || 0),
      0,
    );
    const totalLitros = viajesFiltrados.reduce(
      (sum, v) => sum + (v.litros_combustible || 0),
      0,
    );
    const promedioEficiencia = totalLitros > 0 ? totalKm / totalLitros : 0;

    const totalCosto = viajesFiltrados.reduce(
      (sum, v) =>
        sum +
        (parseFloat(v.costo_combustible) || 0) +
        (parseFloat(v.casetas_ida) || 0) +
        (parseFloat(v.casetas_regreso) || 0),
      0,
    );
    const cpk = totalKm > 0 ? totalCosto / totalKm : 0;

    return {
      totalViajes,
      totalKm,
      totalLitros,
      promedioEficiencia,
      totalCosto,
      cpk,
    };
  };

  const stats = calcularEstadisticas();

  // Función corregida sin Math.round()
  const formatNumber = (num, decimals = 0) => {
    return Number(num).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

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

        // Costos
        const costoCombustible = viaje.costo_combustible || 0;
        const casetasIda = viaje.casetas_ida || 0;
        const casetasRegreso = viaje.casetas_regreso || 0;
        const totalCasetas = casetasIda + casetasRegreso;
        const costoTotal = costoCombustible + totalCasetas;

        return {
          "Fecha Salida": format(
            new Date(`${viaje.fecha}T12:00:00`),
            "dd/MM/yyyy",
          ),
          "Fecha Llegada": viaje.fecha_llegada
            ? format(new Date(`${viaje.fecha_llegada}T12:00:00`), "dd/MM/yyyy")
            : "-",
          "Tipo Viaje": viaje.tipo_viaje || "Sencillo",
          Conductor: viaje.conductor_nombre || "N/A",
          "Ruta Ida": rutaIda,
          "Kilómetros Ida": kmIda,
          "Ruta Regreso": viaje.ruta_regreso || "-",
          "Kilómetros Regreso": kmRegreso || "-",
          "Kilómetros Total": kmTotal,
          Litros: litros,
          "km/L": eficiencia.toFixed(2),
          "Costo Combustible": costoCombustible,
          "Casetas Ida": casetasIda,
          "Casetas Regreso": casetasRegreso,
          "Total Casetas": totalCasetas,
          "Costo Total Viaje": costoTotal,
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
          headers.map((header) => JSON.stringify(row[header] || "")).join(","),
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
        `reporte_viajes_${format(new Date(), "yyyy-MM-dd")}.csv`,
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
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Panel de Control
            </h1>
            <p className="text-muted-foreground">
              Monitoreo de consumo y eficiencia de combustible
            </p>
          </div>
          <Button
            onClick={exportarExcel}
            disabled={isExporting || viajesFiltrados.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2"
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Costo por Km"
            value={`$${formatNumber(stats.cpk, 2)}`}
            subtitle="CPK Promedio"
            icon={DollarSign}
            gradient="bg-blue-600 dark:bg-blue-700"
          />
          <StatsCard
            title="Eficiencia"
            value={formatNumber(stats.promedioEficiencia, 2)}
            subtitle="km/L"
            icon={Gauge}
            gradient="bg-green-500 dark:bg-green-600"
          />
          <StatsCard
            title="Viajes"
            value={formatNumber(stats.totalViajes, 0)}
            icon={Truck}
            gradient="bg-slate-500 dark:bg-slate-600"
          />
          <StatsCard
            title="Kilómetros"
            value={formatNumber(stats.totalKm, 0)}
            subtitle="km"
            icon={TrendingUp}
            gradient="bg-purple-500 dark:bg-purple-600"
          />
          <StatsCard
            title="Litros"
            value={formatNumber(stats.totalLitros, 0)}
            subtitle="L"
            icon={Droplet}
            gradient="bg-orange-500 dark:bg-orange-600"
          />
        </div>

        <ColaCarga />

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RankingConductores 
                viajes={viajesFiltrados} 
                conductores={conductores} 
              />
              <GraficoEficiencia 
                viajes={viajesFiltrados} 
              />
            </div>
            <div className="space-y-6">
              <AnomaliasCombustible 
                viajes={viajesFiltrados} 
              />
            </div>
          </div>
        </div>
      </div>
  );
}

