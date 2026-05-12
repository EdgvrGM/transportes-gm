import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, DollarSign, Calculator, FileText, Trash2, Plus, Download, CalendarRange, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const EMPTY_ARRAY = [];

export default function Liquidaciones() {
  const { toast } = useToast();
  const logoRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { logoRef.current = img; };
    img.src = '/img/LOGO.PNG';
  }, []);

  // Selectores
  const [semanaId, setSemanaId] = useState("");
  const [conductorId, setConductorId] = useState("");
  
  // Datos Dinámicos
  const [viajesDetalle, setViajesDetalle] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [anticipos, setAnticipos] = useState({
    Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0, Sábado: 0
  });
  const [rangoCustom, setRangoCustom] = useState({ activo: false, inicio: "", fin: "" });

  // Consultas
  const { data: programas = EMPTY_ARRAY, isLoading: loadingProgramas } = useQuery({
    queryKey: ["programaCargas_liq"],
    queryFn: async () => {
      const { data } = await supabase.from("ProgramaCargas").select("*").order("fecha_inicio", { ascending: false });
      return data || EMPTY_ARRAY;
    },
  });

  const { data: conductores = EMPTY_ARRAY, isLoading: loadingConductores } = useQuery({
    queryKey: ["conductores_liq"],
    queryFn: async () => {
      const { data } = await supabase.from("Conductor").select("*").eq("estado", "activo").order("nombre");
      return data || EMPTY_ARRAY;
    },
  });

  // Cálculo de Fecha de Corte y Rango basado en el Programa seleccionado
  const infoSemana = useMemo(() => {
    if (!semanaId || !programas.length) return null;
    const p = programas.find(prog => String(prog.id) === String(semanaId));
    if (!p) return null;

    // Asumimos que el ProgramaCargas termina en Domingo. 
    // El Sábado de corte es el día antes del fin de la semana del programa.
    const fechaFinProg = parseISO(p.fecha_fin);
    let fCorte = fechaFinProg;
    
    // Si el fin es domingo (day 0), restamos 1 para ir al sábado. 
    // Si el sistema ya usa sábados como fin, lo dejamos.
    if (fechaFinProg.getDay() === 0) { // Domingo
      fCorte = subDays(fechaFinProg, 1);
    } else if (fechaFinProg.getDay() === 1) { // Lunes
      fCorte = subDays(fechaFinProg, 2);
    }

    const inicioPago = subDays(fCorte, 7);
    const finPago = subDays(fCorte, 1);

    return {
      fechaCorte: format(fCorte, "yyyy-MM-dd"),
      rangoTexto: `Nómina del ${format(inicioPago, "dd/MMM", { locale: es })} al ${format(finPago, "dd/MMM", { locale: es })}`,
      inicioPago: format(inicioPago, "yyyy-MM-dd"),
      finPago: format(finPago, "yyyy-MM-dd"),
      titulo: p.titulo
    };
  }, [semanaId, programas]);

  const fechaEfectivaInicio = rangoCustom.activo && rangoCustom.inicio ? rangoCustom.inicio : infoSemana?.inicioPago;
  const fechaEfectivaFin = rangoCustom.activo && rangoCustom.fin ? rangoCustom.fin : infoSemana?.finPago;

  const { data: viajesDelRango = EMPTY_ARRAY, isLoading: loadingViajes } = useQuery({
    queryKey: ["viajes_liq", fechaEfectivaInicio, fechaEfectivaFin],
    queryFn: async () => {
      if (!fechaEfectivaInicio || !fechaEfectivaFin) return EMPTY_ARRAY;
      const { data } = await supabase
        .from("Viaje")
        .select("*")
        .gte("fecha", fechaEfectivaInicio)
        .lte("fecha", fechaEfectivaFin);
      return data || EMPTY_ARRAY;
    },
    enabled: !!fechaEfectivaInicio && !!fechaEfectivaFin,
  });

  // Efecto principal para CARGAR los viajes cuando cambia el contexto
  useEffect(() => {
    if (!infoSemana || !conductorId || !conductores.length) {
      setViajesDetalle(prev => prev.length === 0 ? prev : []);
      return;
    }

    const conductor = conductores.find((c) => String(c.id) === String(conductorId));
    const porcentajeBase = parseFloat(conductor?.porcentaje_base) || 16.0;

    const nuevosViajes = viajesDelRango
      .filter(v => String(v.conductor_id) === String(conductorId))
      .map(v => {
        const isFull = v.tipo_viaje && v.tipo_viaje.toLowerCase().includes("full");
        const porcentaje = isFull ? 15.0 : porcentajeBase;
        
        return {
          viaje_id: v.id,
          fecha: v.fecha,
          ruta: v.ruta_ida || v.ruta || "N/A",
          tipo: isFull ? "FULL" : "Sencillo",
          flete_bruto: 0,
          porcentaje: porcentaje,
          comision: 0,
          litros: v.litros_combustible || 0
        };
      });

    setViajesDetalle(nuevosViajes);
    setGastos([]);
    setAnticipos({ Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0, Sábado: 0 });

  }, [infoSemana, conductorId, conductores, viajesDelRango]);

  useEffect(() => {
    setRangoCustom({ activo: false, inicio: "", fin: "" });
  }, [semanaId]);

  const getRangoFechasTexto = () => {
    if (rangoCustom.activo && rangoCustom.inicio && rangoCustom.fin) {
      return `Rango personalizado: ${rangoCustom.inicio} al ${rangoCustom.fin}`;
    }
    return infoSemana?.rangoTexto || "";
  };

  const formatCurrency = (num) => {
    const n = Number(num) || 0;
    const [integer, decimal] = n.toFixed(2).split('.');
    return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decimal;
  };

  // Manejadores
  const handleFleteChange = (index, value) => {
    const newVal = parseFloat(value) || 0;
    const newDetalle = [...viajesDetalle];
    newDetalle[index].flete_bruto = newVal;
    newDetalle[index].comision = newVal * (newDetalle[index].porcentaje / 100);
    setViajesDetalle(newDetalle);
  };

  const agregarGasto = () => setGastos([...gastos, { concepto: "", monto: 0 }]);
  const actualizarGasto = (index, field, value) => {
    const newGastos = [...gastos];
    newGastos[index][field] = field === 'monto' ? (parseFloat(value) || 0) : value;
    setGastos(newGastos);
  };
  const eliminarGasto = (index) => setGastos(gastos.filter((_, i) => i !== index));

  const handleAnticipoChange = (dia, value) => {
    setAnticipos({ ...anticipos, [dia]: parseFloat(value) || 0 });
  };

  // Cálculos Totales
  const totalComisiones = viajesDetalle.reduce((sum, v) => sum + v.comision, 0);
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
  const totalAnticipos = Object.values(anticipos).reduce((sum, val) => sum + val, 0);
  const sueldoNeto = (totalComisiones + totalGastos) - totalAnticipos;

  const guardarLiquidacion = useMutation({
    mutationFn: async () => {
      const data = {
        conductor_id: conductorId,
        total_comisiones: totalComisiones,
        total_gastos: totalGastos,
        total_anticipos: totalAnticipos,
        monto_final: sueldoNeto,
        detalle_viajes: { fecha_corte: infoSemana?.fechaCorte, viajes: viajesDetalle }
      };
      const { error } = await supabase.from("Liquidaciones").insert([data]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      generarPDF();
      toast({ title: "Liquidación guardada", description: "El PDF se descargará en tu carpeta de Descargas." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  const generarPDF = () => {
    const conductor = conductores.find((c) => String(c.id) === String(conductorId));
    if (!conductor || !infoSemana?.fechaCorte) return;

    const doc = new jsPDF();
    let logoBottomY = 10;

    if (logoRef.current) {
      const logoW = 42;
      const logoH = Math.round(logoW * (logoRef.current.naturalHeight / logoRef.current.naturalWidth));
      doc.addImage(logoRef.current, 'PNG', 14, 8, logoW, logoH);
      logoBottomY = 8 + logoH;
    }
    continuarPDF(doc, conductor, logoBottomY);
  };

  const continuarPDF = (doc, conductor, logoBottomY = 28) => {
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text("Liquidación de Operador", pageWidth / 2, 22, { align: "center" });
    doc.setFont(undefined, 'normal');

    const infoY = Math.max(logoBottomY + 6, 36);
    doc.setFontSize(12);
    doc.text(`Operador: ${conductor.nombre}`, 14, infoY);
    doc.text(`Periodo: ${getRangoFechasTexto()}`, 14, infoY + 7);
    doc.text(`Fecha Emisión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, infoY + 14);

    // Tabla Viajes
    const totalFleteBruto = viajesDetalle.reduce((sum, v) => sum + (parseFloat(v.flete_bruto) || 0), 0);
    autoTable(doc, {
      startY: infoY + 22,
      head: [['Fecha', 'Ruta', 'Tipo', 'Flete Bruto', '% Aplicado', 'Comisión']],
      body: viajesDetalle.map(v => [
        v.fecha,
        v.ruta,
        v.tipo,
        `$${formatCurrency(v.flete_bruto)}`,
        `${v.porcentaje}%`,
        `$${formatCurrency(v.comision)}`
      ]),
      foot: [['', '', 'TOTAL', `$${formatCurrency(totalFleteBruto)}`, '', `$${formatCurrency(totalComisiones)}`]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      styles: { fontSize: 11, textColor: [20, 20, 20] },
      footStyles: { fillColor: [237, 233, 254], fontStyle: 'bold', textColor: [55, 48, 163], fontSize: 11 },
      showFoot: 'lastPage',
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    const rowsGastos = gastos
      .filter(g => g.monto > 0 || g.concepto !== "")
      .map(g => [g.concepto || '-', g.monto > 0 ? `$${formatCurrency(g.monto)}` : '']);

    const diasAnticipos = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const rowsAnticipos = diasAnticipos
      .filter(dia => (anticipos[dia] || 0) > 0)
      .map(dia => [dia, `$${formatCurrency(anticipos[dia])}`]);

    // Tabla Gastos — mitad izquierda
    autoTable(doc, {
      startY: finalY,
      margin: { left: 14, right: 109 },
      head: [['Concepto Gasto', 'Monto']],
      body: rowsGastos.length > 0 ? rowsGastos : [['Sin gastos registrados', '']],
      foot: rowsGastos.length > 0 ? [['TOTAL', `$${formatCurrency(totalGastos)}`]] : [],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      styles: { fontSize: 11, textColor: [20, 20, 20] },
      footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 11 },
    });
    const finalYGastos = doc.lastAutoTable.finalY;

    // Tabla Anticipos — mitad derecha, mismo Y de inicio
    autoTable(doc, {
      startY: finalY,
      margin: { left: 109, right: 14 },
      head: [['Día', 'Anticipo']],
      body: rowsAnticipos.length > 0 ? rowsAnticipos : [['Sin anticipos', '']],
      foot: rowsAnticipos.length > 0 ? [['TOTAL', `$${formatCurrency(totalAnticipos)}`]] : [],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      styles: { fontSize: 11, textColor: [20, 20, 20] },
      footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 11 },
    });
    const finalYAnticipos = doc.lastAutoTable.finalY;

    finalY = Math.max(finalYGastos, finalYAnticipos) + 15;

    // Resumen
    const totalComisionGastos = totalComisiones + totalGastos;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Comisión + Gastos: $${formatCurrency(totalComisionGastos)}`, 130, finalY);
    doc.text(`Total de Anticipos: $${formatCurrency(totalAnticipos)}`, 130, finalY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Sueldo Neto: $${formatCurrency(sueldoNeto)}`, 130, finalY + 18);

    // Firmas
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const firmaY = finalY + 50;
    doc.line(30, firmaY, 80, firmaY);
    doc.text("Firma Operador", 55, firmaY + 5, { align: "center" });

    doc.line(130, firmaY, 180, firmaY);
    doc.text("Firma Autorización", 155, firmaY + 5, { align: "center" });

    doc.save(`Liquidacion_${conductor.nombre.replace(/ /g, "_")}_${infoSemana?.fechaCorte}.pdf`);
  };

  const isInitialLoading = loadingConductores && conductores.length === 0;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
               <Calculator className="w-8 h-8 text-primary" /> Liquidaciones de Operadores
            </h1>
            <p className="text-muted-foreground">
              Cálculo de nómina, comisiones y generación de PDF
            </p>
          </div>
          <Button 
            onClick={() => guardarLiquidacion.mutate()} 
            disabled={!conductorId || !infoSemana || guardarLiquidacion.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold px-6 h-12 rounded-xl shadow-lg"
          >
            {guardarLiquidacion.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Finalizar y Generar PDF
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-border bg-card rounded-[1.5rem]">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Semana del Programa</Label>
              <Select value={semanaId} onValueChange={setSemanaId}>
                <SelectTrigger className="h-12 rounded-xl bg-background">
                  <SelectValue placeholder="Seleccionar Semana" />
                </SelectTrigger>
                <SelectContent>
                  {programas.map((p) => {
                    // Calculamos el rango de pago para mostrarlo en el selector
                    const fechaFinProg = parseISO(p.fecha_fin);
                    let fCorte = fechaFinProg;
                    if (fechaFinProg.getDay() === 0) fCorte = subDays(fechaFinProg, 1);
                    else if (fechaFinProg.getDay() === 1) fCorte = subDays(fechaFinProg, 2);
                    
                    const inicioPago = subDays(fCorte, 7);
                    const finPago = subDays(fCorte, 1);
                    const rangoLabel = `${format(inicioPago, "dd/MMM")} al ${format(finPago, "dd/MMM")}`;

                    return (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <div className="flex flex-col">
                          <span className="font-bold">{p.titulo}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Nómina del {rangoLabel}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Conductor</Label>
              <Select value={conductorId} onValueChange={setConductorId}>
                <SelectTrigger className="h-12 rounded-xl bg-background">
                  <SelectValue placeholder="Seleccionar Conductor" />
                </SelectTrigger>
                <SelectContent>
                  {conductores.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre} {c.porcentaje_base ? `(${c.porcentaje_base}%)` : '(16%)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {conductorId && infoSemana && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Principal: Viajes */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-border bg-card rounded-[1.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-zinc-900/50 border-b border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" /> Viajes a Liquidar
                        {rangoCustom.activo && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wider">
                            Rango personalizado
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="capitalize mt-1">{getRangoFechasTexto()}</CardDescription>
                    </div>
                    {!rangoCustom.activo ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRangoCustom({ activo: true, inicio: infoSemana?.inicioPago || "", fin: infoSemana?.finPago || "" })}
                        className="shrink-0 rounded-xl gap-1.5 text-xs"
                      >
                        <CalendarRange className="w-3.5 h-3.5" /> Ajustar rango
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRangoCustom({ activo: false, inicio: "", fin: "" })}
                        className="shrink-0 rounded-xl gap-1.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restablecer
                      </Button>
                    )}
                  </div>
                  {rangoCustom.activo && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Rango:</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Desde</Label>
                        <Input
                          type="date"
                          value={rangoCustom.inicio}
                          onChange={e => setRangoCustom(prev => ({ ...prev, inicio: e.target.value }))}
                          className="h-8 w-36 text-sm rounded-lg bg-background"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</Label>
                        <Input
                          type="date"
                          value={rangoCustom.fin}
                          onChange={e => setRangoCustom(prev => ({ ...prev, fin: e.target.value }))}
                          className="h-8 w-36 text-sm rounded-lg bg-background"
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {viajesDetalle.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground font-medium">
                      No hay viajes registrados para este conductor en esta semana.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider">Fecha / Ruta</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-center">Tipo</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-right w-32">Flete Bruto</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-center w-20">%</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-wider text-right">Comisión</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viajesDetalle.map((v, i) => (
                            <TableRow key={v.viaje_id}>
                              <TableCell>
                                <div className="font-bold text-foreground">{v.ruta}</div>
                                <div className="text-xs text-muted-foreground">{v.fecha}</div>
                                {v.litros <= 0 && (
                                  <span className="text-[9px] font-bold text-orange-500 uppercase">Sin Diesel</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${v.tipo === 'FULL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {v.tipo}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    value={v.flete_bruto || ""} 
                                    onChange={(e) => handleFleteChange(i, e.target.value)}
                                    className="pl-7 text-right bg-background h-9 rounded-lg"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-muted-foreground">
                                {v.porcentaje}%
                              </TableCell>
                              <TableCell className="text-right font-black text-green-600 dark:text-green-500 text-base">
                                ${formatCurrency(v.comision)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gastos */}
              <Card className="shadow-lg border-border bg-card rounded-[1.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-zinc-900/50 border-b border-border/50 flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">Gastos Extra</CardTitle>
                    <CardDescription className="mt-1">Llantas, aceites, maniobras, etc.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={agregarGasto} className="rounded-xl gap-1">
                    <Plus className="w-4 h-4" /> Agregar
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {gastos.length === 0 ? (
                    <div className="text-sm text-center text-muted-foreground py-4">Sin gastos reportados.</div>
                  ) : (
                    gastos.map((gasto, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Input 
                          placeholder="Concepto (Ej. Talacha)" 
                          value={gasto.concepto} 
                          onChange={(e) => actualizarGasto(i, 'concepto', e.target.value)}
                          className="flex-1 rounded-lg bg-background"
                        />
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0.00"
                            value={gasto.monto || ""} 
                            onChange={(e) => actualizarGasto(i, 'monto', e.target.value)}
                            className="pl-7 text-right rounded-lg bg-background"
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => eliminarGasto(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna Secundaria: Anticipos y Totales */}
            <div className="space-y-6">
              
              <Card className="shadow-lg border-border bg-card rounded-[1.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-zinc-900/50 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
                    <DollarSign className="w-5 h-5" /> Anticipos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {Object.keys(anticipos).map(dia => (
                    <div key={dia} className="flex items-center justify-between gap-4">
                      <Label className="font-bold text-muted-foreground w-20">{dia}</Label>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input 
                          type="number" 
                          min="0"
                          value={anticipos[dia] || ""} 
                          onChange={(e) => handleAnticipoChange(dia, e.target.value)}
                          className="pl-7 text-right rounded-lg bg-background font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Totales */}
              <Card className="shadow-xl border-none bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[1.5rem] overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-6">Resumen de Liquidación</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Total Comisiones</span>
                      <span className="font-bold text-green-400">+ ${formatCurrency(totalComisiones)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Total Gastos</span>
                      <span className="font-bold text-green-400">+ ${formatCurrency(totalGastos)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">Total Anticipos</span>
                      <span className="font-bold text-red-400">- ${formatCurrency(totalAnticipos)}</span>
                    </div>

                    <div className="pt-4 border-t border-indigo-700/50">
                      <div className="flex justify-between items-end">
                        <span className="text-base font-bold text-white">Sueldo Neto</span>
                        <span className="text-3xl font-black text-white">${formatCurrency(sueldoNeto)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
