import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  ArrowRight,
  Fuel,
  X,
  Route,
  Ticket,
  MapPin,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function FuelRegistrarViaje() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state || {};
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [mostrarNuevoConductor, setMostrarNuevoConductor] = useState(false);
  const [mostrarNuevoCamion, setMostrarNuevoCamion] = useState(false);

  const [viaje, setViaje] = useState({
    fecha: stateData.fecha || new Date().toLocaleDateString("en-CA"),
    fecha_llegada: "",
    conductor_id: stateData.conductor_id || "",
    conductor_nombre: stateData.conductor_nombre || "",
    camion_id: stateData.camion_id || "",
    camion_nombre: stateData.camion_nombre || "",
    camion_placas: stateData.camion_placas || "",
    tipo_viaje: stateData.tipo_viaje || "Sencillo",
    ruta_ida: "",
    kilometros_ida: "",
    ruta_regreso: "",
    kilometros_regreso: "",
    litros_combustible: "",
    costo_combustible: "",
    casetas_ida: "",
    casetas_regreso: "",
    notas: "",
  });

  const [rutasAdicionales, setRutasAdicionales] = useState([]);
  const [nuevoConductor, setNuevoConductor] = useState({
    nombre: "",
    licencia: "",
    telefono: "",
  });
  const [nuevoCamion, setNuevoCamion] = useState({ nombre: "", placas: "" });

  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: rutasHistoricas = [] } = useQuery({
    queryKey: ["viajesParaRutas"],
    queryFn: async () => {
      const { data } = await supabase.from("Viaje").select("ruta_ida, kilometros_ida");
      if (!data) return [];
      
      const rutasMap = new Map();
      data.forEach(v => {
        if (v.ruta_ida && v.kilometros_ida && !rutasMap.has(v.ruta_ida)) {
          rutasMap.set(v.ruta_ida, v.kilometros_ida);
        }
      });
      return Array.from(rutasMap, ([ruta, km]) => ({ ruta, km }));
    }
  });

  const crearViajeMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("Viaje")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viajes"] });
      navigate(createPageUrl("ControlCombustible"));
    },
    onError: (err) => {
      setError("Error al registrar el viaje.");
      console.error("Error creating trip:", err);
    },
  });

  const crearConductorMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("Conductor")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      return result[0];
    },
    onSuccess: (conductor) => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      setViaje((prev) => ({
        ...prev,
        conductor_id: String(conductor.id),
        conductor_nombre: conductor.nombre,
      }));
      setMostrarNuevoConductor(false);
      setNuevoConductor({ nombre: "", licencia: "", telefono: "" });
    },
  });

  const crearCamionMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("Camion")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      return result[0];
    },
    onSuccess: (camion) => {
      queryClient.invalidateQueries({ queryKey: ["camiones"] });
      setViaje((prev) => ({
        ...prev,
        camion_id: String(camion.id),
        camion_nombre: camion.nombre,
        camion_placas: camion.placas,
      }));
      setMostrarNuevoCamion(false);
      setNuevoCamion({ nombre: "", placas: "" });
    },
  });

  const agregarRutaAdicional = () =>
    setRutasAdicionales([...rutasAdicionales, { ruta: "", kilometros: "" }]);
  const eliminarRutaAdicional = (index) =>
    setRutasAdicionales(rutasAdicionales.filter((_, i) => i !== index));
  const actualizarRutaAdicional = (index, campo, valor) => {
    const nuevasRutas = [...rutasAdicionales];
    nuevasRutas[index][campo] = valor;
    setRutasAdicionales(nuevasRutas);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const kmIda = parseFloat(viaje.kilometros_ida);
    const kmRegreso = parseFloat(viaje.kilometros_regreso);
    const litros = parseFloat(viaje.litros_combustible);

    if (
      !viaje.fecha ||
      !viaje.conductor_id ||
      !viaje.camion_id ||
      !viaje.ruta_ida ||
      !kmIda ||
      isNaN(kmIda) ||
      !viaje.ruta_regreso ||
      !kmRegreso ||
      isNaN(kmRegreso) ||
      !litros ||
      isNaN(litros)
    ) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }

    const kmAdicionales = rutasAdicionales.reduce(
      (sum, ruta) => sum + parseFloat(ruta.kilometros || 0),
      0,
    );
    const kmTotal = kmIda + kmAdicionales + kmRegreso;

    const datosViaje = {
      fecha: `${viaje.fecha}T12:00:00`,
      fecha_llegada: viaje.fecha_llegada || null,
      conductor_id: viaje.conductor_id || null,
      conductor_nombre: viaje.conductor_nombre,
      camion_id: viaje.camion_id || null,
      camion_nombre: viaje.camion_nombre,
      camion_placas: viaje.camion_placas,
      tipo_viaje: viaje.tipo_viaje,
      ruta_ida: viaje.ruta_ida,
      kilometros_ida: kmIda,
      rutas_adicionales: rutasAdicionales.map((r) => ({
        ruta: r.ruta,
        kilometros: parseFloat(r.kilometros || 0),
      })),
      ruta_regreso: viaje.ruta_regreso,
      kilometros_regreso: kmRegreso,
      kilometros_total: kmTotal,
      litros_combustible: litros,
      km_por_litro: litros > 0 ? kmTotal / litros : 0,
      costo_combustible: viaje.costo_combustible
        ? parseFloat(viaje.costo_combustible)
        : null,
      casetas_ida: viaje.casetas_ida ? parseFloat(viaje.casetas_ida) : null, // <-- NUEVO
      casetas_regreso: viaje.casetas_regreso
        ? parseFloat(viaje.casetas_regreso)
        : null, // <-- NUEVO
      notas: viaje.notas,
    };
    crearViajeMutation.mutate(datosViaje);
  };

  const handleConductorChange = (id) => {
    const c = conductores.find((x) => String(x.id) === id);
    setViaje((p) => ({
      ...p,
      conductor_id: id,
      conductor_nombre: c?.nombre || "",
    }));
  };
  const handleCamionChange = (id) => {
    const c = camiones.find((x) => String(x.id) === id);
    setViaje((p) => ({
      ...p,
      camion_id: id,
      camion_nombre: c?.nombre || "",
      camion_placas: c?.placas || "",
    }));
  };

  const handleRutaIdaChange = (e) => {
    const val = e.target.value;
    
    setViaje((prev) => {
      const updated = { ...prev, ruta_ida: val };
      
      const match = rutasHistoricas.find(r => r.ruta.toLowerCase() === val.toLowerCase());
      if (match) {
        updated.kilometros_ida = match.km;
      }
      
      // Intelligent reverse
      if (val.includes("-")) {
         const parts = val.split("-").map(p => p.trim());
         if (parts.length === 2 && parts[0] && parts[1]) {
            updated.ruta_regreso = `${parts[1]} - ${parts[0]}`;
            if (match) {
               updated.kilometros_regreso = match.km;
            } else if (updated.kilometros_ida) {
               updated.kilometros_regreso = updated.kilometros_ida;
            }
         }
      }
      
      return updated;
    });
  };

  const handleKmIdaChange = (e) => {
    const val = e.target.value;
    setViaje((prev) => {
       const updated = { ...prev, kilometros_ida: val };
       // Mirror to return if return km is empty or was the same as previous IDA
       if (!prev.kilometros_regreso || prev.kilometros_regreso === prev.kilometros_ida) {
          updated.kilometros_regreso = val;
       }
       return updated;
    });
  };

  const kmTotales =
    (parseFloat(viaje.kilometros_ida) || 0) +
    (parseFloat(viaje.kilometros_regreso) || 0) +
    rutasAdicionales.reduce((s, r) => s + (parseFloat(r.kilometros) || 0), 0);
  const litrosVal = parseFloat(viaje.litros_combustible);
  const eficiencia = litrosVal > 0 ? (kmTotales / litrosVal).toFixed(2) : "-";

  return (
    <div className="p-4 md:p-8 bg-slate-50 dark:bg-background min-h-screen transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("ControlCombustible"))}
            className="shadow-md bg-card border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Registrar Nuevo Viaje
            </h1>
            <p className="text-muted-foreground mt-1">
              Ingresa los detalles del viaje y consumo
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl bg-card">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-xl font-bold text-foreground">
              Detalles del Viaje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {stateData.destino && (
              <div className="mb-6 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200/60 dark:border-blue-800/40 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/70 dark:text-blue-400/70 mb-0.5">Destino Programado</p>
                  <p className="font-bold text-base text-blue-900 dark:text-blue-100">{stateData.destino}</p>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="fecha"
                    className="text-foreground font-semibold"
                  >
                    Salida <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={viaje.fecha}
                    onChange={(e) =>
                      setViaje({ ...viaje, fecha: e.target.value })
                    }
                    required
                    className="bg-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fecha_llegada"
                    className="text-foreground font-semibold"
                  >
                    Llegada / Carga
                  </Label>
                  <Input
                    id="fecha_llegada"
                    type="date"
                    value={viaje.fecha_llegada}
                    onChange={(e) =>
                      setViaje({ ...viaje, fecha_llegada: e.target.value })
                    }
                    className="bg-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-foreground font-semibold">
                      Conductor <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setMostrarNuevoConductor(!mostrarNuevoConductor)
                      }
                      className="text-primary hover:text-primary h-auto p-1"
                    >
                      <Plus className="w-4 h-4" /> Nuevo
                    </Button>
                  </div>
                  {!mostrarNuevoConductor ? (
                    <Select
                      value={viaje.conductor_id}
                      onValueChange={handleConductorChange}
                      required
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {conductores.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2 p-2 bg-muted rounded border border-border">
                      <Input
                        placeholder="Nombre"
                        value={nuevoConductor.nombre}
                        onChange={(e) =>
                          setNuevoConductor({
                            ...nuevoConductor,
                            nombre: e.target.value,
                          })
                        }
                        className="bg-background h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          crearConductorMutation.mutate(nuevoConductor)
                        }
                        className="w-full"
                      >
                        Guardar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-foreground font-semibold">
                      Camión <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMostrarNuevoCamion(!mostrarNuevoCamion)}
                      className="text-primary hover:text-primary h-auto p-1"
                    >
                      <Plus className="w-4 h-4" /> Nuevo
                    </Button>
                  </div>
                  {!mostrarNuevoCamion ? (
                    <Select
                      value={viaje.camion_id}
                      onValueChange={handleCamionChange}
                      required
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {camiones.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre} - {c.placas}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2 p-2 bg-muted rounded border border-border">
                      <Input
                        placeholder="Nombre"
                        value={nuevoCamion.nombre}
                        onChange={(e) =>
                          setNuevoCamion({
                            ...nuevoCamion,
                            nombre: e.target.value,
                          })
                        }
                        className="bg-background h-8"
                      />
                      <Input
                        placeholder="Placas"
                        value={nuevoCamion.placas}
                        onChange={(e) =>
                          setNuevoCamion({
                            ...nuevoCamion,
                            placas: e.target.value,
                          })
                        }
                        className="bg-background h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => crearCamionMutation.mutate(nuevoCamion)}
                        className="w-full"
                      >
                        Guardar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={viaje.tipo_viaje}
                    onValueChange={(val) =>
                      setViaje({ ...viaje, tipo_viaje: val })
                    }
                    required
                  >
                    <SelectTrigger className="bg-background border-input font-medium">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sencillo">Sencillo (1)</SelectItem>
                      <SelectItem value="FULL">FULL (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* RUTAS */}
              <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-foreground">Ruta de Ida</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Ruta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      list="rutas-sugerencias"
                      value={viaje.ruta_ida}
                      onChange={handleRutaIdaChange}
                      required
                      placeholder="Ej. Tecoman - Colima"
                      className="bg-background border-input"
                    />
                    <datalist id="rutas-sugerencias">
                      {rutasHistoricas.map((r, i) => (
                        <option key={i} value={r.ruta} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Kilómetros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={viaje.kilometros_ida}
                      onChange={handleKmIdaChange}
                      required
                      className="bg-background border-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-foreground">
                      Rutas Adicionales
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarRutaAdicional}
                    className="gap-2 bg-background hover:bg-muted"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </Button>
                </div>
                {rutasAdicionales.map((ruta, index) => (
                  <div
                    key={index}
                    className="grid md:grid-cols-[1fr_auto_auto] gap-3 p-3 bg-background/50 rounded-lg border border-border"
                  >
                    <Input
                      placeholder="Ruta"
                      value={ruta.ruta}
                      onChange={(e) =>
                        actualizarRutaAdicional(index, "ruta", e.target.value)
                      }
                      className="bg-background"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="km"
                      value={ruta.kilometros}
                      onChange={(e) =>
                        actualizarRutaAdicional(
                          index,
                          "kilometros",
                          e.target.value,
                        )
                      }
                      className="bg-background w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarRutaAdicional(index)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4 p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-bold text-foreground">Ruta de Regreso</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Ruta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={viaje.ruta_regreso}
                      onChange={(e) =>
                        setViaje({ ...viaje, ruta_regreso: e.target.value })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Kilómetros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={viaje.kilometros_regreso}
                      onChange={(e) =>
                        setViaje({
                          ...viaje,
                          kilometros_regreso: e.target.value,
                        })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* COMBUSTIBLE */}
              <div className="space-y-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-bold text-foreground">Consumo</h3>
                  {kmTotales > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Total: {kmTotales.toFixed(1)} km)
                    </span>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Litros <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.litros_combustible}
                      onChange={(e) =>
                        setViaje({
                          ...viaje,
                          litros_combustible: e.target.value,
                        })
                      }
                      required
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Costo Combustible ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.costo_combustible}
                      onChange={(e) =>
                        setViaje({
                          ...viaje,
                          costo_combustible: e.target.value,
                        })
                      }
                      className="bg-background border-input"
                    />
                  </div>
                </div>
                {eficiencia !== "-" && (
                  <div className="p-4 bg-background/50 rounded-lg border border-green-200 dark:border-green-800 flex justify-between items-center">
                    <div>
                      <span className="text-foreground font-semibold">
                        Eficiencia:
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kmTotales.toFixed(1)} km ÷ {viaje.litros_combustible} L
                      </p>
                    </div>
                    <span className="text-3xl font-bold text-green-700 dark:text-green-400">
                      {eficiencia} km/L
                    </span>
                  </div>
                )}
              </div>

              {/* CASETAS (NUEVO BLOQUE) */}
              <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-foreground">Casetas</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Casetas Ida ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.casetas_ida}
                      onChange={(e) =>
                        setViaje({ ...viaje, casetas_ida: e.target.value })
                      }
                      className="bg-background border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Casetas Regreso ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.casetas_regreso}
                      onChange={(e) =>
                        setViaje({ ...viaje, casetas_regreso: e.target.value })
                      }
                      className="bg-background border-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="notas"
                  className="text-foreground font-semibold"
                >
                  Notas
                </Label>
                <Textarea
                  id="notas"
                  value={viaje.notas}
                  onChange={(e) =>
                    setViaje({ ...viaje, notas: e.target.value })
                  }
                  rows={3}
                  className="bg-background border-input"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("ControlCombustible"))}
                  className="flex-1 bg-background hover:bg-muted"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={crearViajeMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  {crearViajeMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save />
                  )}{" "}
                  Registrar Viaje
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
