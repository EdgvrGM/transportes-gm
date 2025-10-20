import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function FuelRegistrarViaje() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [mostrarNuevoConductor, setMostrarNuevoConductor] = useState(false);
  const [mostrarNuevoCamion, setMostrarNuevoCamion] = useState(false);

  const [viaje, setViaje] = useState({
    fecha: new Date().toISOString().split("T")[0],
    conductor_id: "",
    conductor_nombre: "",
    camion_id: "",
    camion_nombre: "",
    camion_placas: "",
    ruta_ida: "",
    kilometros_ida: "",
    ruta_regreso: "",
    kilometros_regreso: "",
    litros_combustible: "",
    costo_combustible: "",
    notas: "",
  });

  const [rutasAdicionales, setRutasAdicionales] = useState([]);

  const [nuevoConductor, setNuevoConductor] = useState({
    nombre: "",
    licencia: "",
    telefono: "",
  });

  const [nuevoCamion, setNuevoCamion] = useState({
    nombre: "",
    placas: "",
  });

  // *** CAMBIO: Usar supabase para obtener conductores ***
  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // *** CAMBIO: Usar supabase para obtener camiones ***
  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // *** CAMBIO: Usar supabase para crear viajes ***
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
      // *** CAMBIO: Redirige al dashboard principal después de crear ***
      // Asegúrate que "ControlCombustible" es la ruta correcta
      navigate(createPageUrl("ControlCombustible"));
    },
    onError: (err) => {
      setError("Error al registrar el viaje. Por favor intenta de nuevo.");
      console.error("Error creating trip:", err); // Log para depuración
    },
  });

  // *** CAMBIO: Usar supabase para crear conductores ***
  const crearConductorMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("Conductor")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      // Supabase devuelve un array, tomamos el primer elemento
      return result[0];
    },
    onSuccess: (conductor) => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      setViaje((prev) => ({
        ...prev,
        // Usar String(id) para el Select
        conductor_id: String(conductor.id),
        conductor_nombre: conductor.nombre,
      }));
      setMostrarNuevoConductor(false);
      setNuevoConductor({ nombre: "", licencia: "", telefono: "" });
    },
    onError: (err) => {
      setError("Error al crear el conductor.");
      console.error("Error creating driver:", err); // Log para depuración
    },
  });

  // *** CAMBIO: Usar supabase para crear camiones ***
  const crearCamionMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from("Camion")
        .insert([data])
        .select();
      if (error) throw new Error(error.message);
      // Supabase devuelve un array, tomamos el primer elemento
      return result[0];
    },
    onSuccess: (camion) => {
      queryClient.invalidateQueries({ queryKey: ["camiones"] });
      setViaje((prev) => ({
        ...prev,
        // Usar String(id) para el Select
        camion_id: String(camion.id),
        camion_nombre: camion.nombre,
        camion_placas: camion.placas,
      }));
      setMostrarNuevoCamion(false);
      setNuevoCamion({ nombre: "", placas: "" });
    },
    onError: (err) => {
      setError("Error al crear el camión.");
      console.error("Error creating truck:", err); // Log para depuración
    },
  });

  // --- Lógica de rutas adicionales (sin cambios) ---
  const agregarRutaAdicional = () => {
    setRutasAdicionales([...rutasAdicionales, { ruta: "", kilometros: "" }]);
  };

  const eliminarRutaAdicional = (index) => {
    setRutasAdicionales(rutasAdicionales.filter((_, i) => i !== index));
  };

  const actualizarRutaAdicional = (index, campo, valor) => {
    const nuevasRutas = [...rutasAdicionales];
    nuevasRutas[index][campo] = valor;
    setRutasAdicionales(nuevasRutas);
  };

  // --- Lógica de envío del formulario (incluye validación) ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const kmIda = parseFloat(viaje.kilometros_ida);
    const kmRegreso = parseFloat(viaje.kilometros_regreso);
    const litros = parseFloat(viaje.litros_combustible);

    // *** VALIDACIÓN DE CAMPOS OBLIGATORIOS ***
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
      setError(
        "Por favor completa todos los campos obligatorios marcados con *."
      );
      return;
    }
    if (litros <= 0) {
      setError("Los litros consumidos deben ser mayores a cero.");
      return;
    }

    // Validar rutas adicionales si existen
    for (let i = 0; i < rutasAdicionales.length; i++) {
      const kmAdicional = parseFloat(rutasAdicionales[i].kilometros);
      if (
        !rutasAdicionales[i].ruta ||
        !kmAdicional ||
        isNaN(kmAdicional) ||
        kmAdicional < 0
      ) {
        setError(
          `Por favor completa correctamente los datos (ruta y km > 0) de la ruta adicional ${
            i + 1
          }.`
        );
        return;
      }
    }

    const kmAdicionales = rutasAdicionales.reduce((sum, ruta) => {
      return sum + parseFloat(ruta.kilometros || 0);
    }, 0);

    const kmTotal = kmIda + kmAdicionales + kmRegreso;

    const datosViaje = {
      fecha: viaje.fecha,
      // Convertir IDs a número si es necesario para Supabase (ajustar según tu esquema)
      conductor_id: viaje.conductor_id ? viaje.conductor_id : null, // O usar parseInt si son numéricos
      conductor_nombre: viaje.conductor_nombre,
      camion_id: viaje.camion_id ? viaje.camion_id : null, // O usar parseInt si son numéricos
      camion_nombre: viaje.camion_nombre,
      camion_placas: viaje.camion_placas,
      ruta_ida: viaje.ruta_ida,
      kilometros_ida: kmIda,
      rutas_adicionales: rutasAdicionales.map((r) => ({
        ruta: r.ruta,
        kilometros: parseFloat(r.kilometros || 0), // Asegurar que sea número
      })),
      ruta_regreso: viaje.ruta_regreso,
      kilometros_regreso: kmRegreso,
      kilometros_total: kmTotal,
      litros_combustible: litros,
      km_por_litro: kmTotal / litros, // Ya validado que litros > 0
      costo_combustible: viaje.costo_combustible
        ? parseFloat(viaje.costo_combustible)
        : null,
      notas: viaje.notas,
    };

    crearViajeMutation.mutate(datosViaje);
  };

  // --- Handlers para Selects (sin cambios significativos) ---
  const handleConductorChange = (conductorId) => {
    // conductorId ya es string por el Select
    const conductor = conductores.find((c) => String(c.id) === conductorId);
    setViaje((prev) => ({
      ...prev,
      conductor_id: conductorId,
      conductor_nombre: conductor?.nombre || "",
    }));
  };

  const handleCamionChange = (camionId) => {
    // camionId ya es string por el Select
    const camion = camiones.find((c) => String(c.id) === camionId);
    setViaje((prev) => ({
      ...prev,
      camion_id: camionId,
      camion_nombre: camion?.nombre || "",
      camion_placas: camion?.placas || "",
    }));
  };

  // --- Lógica de cálculo (sin cambios) ---
  const calcularEficiencia = () => {
    const kmIda = parseFloat(viaje.kilometros_ida) || 0;
    const kmRegreso = parseFloat(viaje.kilometros_regreso) || 0;
    const kmAdicionales = rutasAdicionales.reduce((sum, ruta) => {
      return sum + parseFloat(ruta.kilometros || 0);
    }, 0);
    const litros = parseFloat(viaje.litros_combustible);

    if (litros <= 0 || isNaN(litros)) return "-";

    const kmTotal = kmIda + kmAdicionales + kmRegreso;
    return (kmTotal / litros).toFixed(2);
  };

  const calcularKmTotales = () => {
    const kmIda = parseFloat(viaje.kilometros_ida) || 0;
    const kmRegreso = parseFloat(viaje.kilometros_regreso) || 0;
    const kmAdicionales = rutasAdicionales.reduce((sum, ruta) => {
      return sum + parseFloat(ruta.kilometros || 0);
    }, 0);
    return kmIda + kmAdicionales + kmRegreso;
  };

  const eficiencia = calcularEficiencia();
  const kmTotales = calcularKmTotales();

  // --- JSX (interfaz de usuario) ---
  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            // *** CAMBIO: Redirige al dashboard principal ***
            onClick={() => navigate(createPageUrl("ControlCombustible"))}
            className="shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Registrar Nuevo Viaje
            </h1>
            <p className="text-slate-600 mt-1">
              Ingresa los detalles del viaje y consumo
            </p>
          </div>
        </div>

        {/* Alerta de error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulario */}
        <Card className="border-none shadow-xl">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50">
            <CardTitle className="text-xl font-bold text-slate-900">
              Detalles del Viaje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fila: Fecha, Conductor, Camión */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Fecha */}
                <div className="space-y-2">
                  <Label
                    htmlFor="fecha"
                    className="text-slate-700 font-semibold"
                  >
                    Fecha <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={viaje.fecha}
                    onChange={(e) =>
                      setViaje({ ...viaje, fecha: e.target.value })
                    }
                    required
                    className="border-slate-200"
                  />
                </div>
                {/* Conductor */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="conductor"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Conductor <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setMostrarNuevoConductor(!mostrarNuevoConductor)
                      }
                      className="text-blue-600 hover:text-blue-700 gap-1 h-auto p-1"
                    >
                      {" "}
                      <Plus className="w-4 h-4" /> Nuevo{" "}
                    </Button>
                  </div>
                  {!mostrarNuevoConductor ? (
                    <Select
                      value={viaje.conductor_id}
                      onValueChange={handleConductorChange}
                      required
                    >
                      <SelectTrigger className="border-slate-200">
                        {" "}
                        <SelectValue placeholder="Seleccionar conductor" />{" "}
                      </SelectTrigger>
                      <SelectContent>
                        {conductores.map((conductor) => (
                          // Usar String(id) como value
                          <SelectItem
                            key={conductor.id}
                            value={String(conductor.id)}
                          >
                            {conductor.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    /* Formulario nuevo conductor */
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Input
                        placeholder="Nombre completo"
                        value={nuevoConductor.nombre}
                        onChange={(e) =>
                          setNuevoConductor({
                            ...nuevoConductor,
                            nombre: e.target.value,
                          })
                        }
                        className="bg-white"
                        required
                      />
                      <Input
                        placeholder="Licencia"
                        value={nuevoConductor.licencia}
                        onChange={(e) =>
                          setNuevoConductor({
                            ...nuevoConductor,
                            licencia: e.target.value,
                          })
                        }
                        className="bg-white"
                      />
                      <Input
                        placeholder="Teléfono"
                        value={nuevoConductor.telefono}
                        onChange={(e) =>
                          setNuevoConductor({
                            ...nuevoConductor,
                            telefono: e.target.value,
                          })
                        }
                        className="bg-white"
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          crearConductorMutation.mutate(nuevoConductor)
                        }
                        disabled={
                          !nuevoConductor.nombre ||
                          crearConductorMutation.isPending
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {crearConductorMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                            Guardando...
                          </>
                        ) : (
                          "Guardar Conductor"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {/* Camión */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="camion"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Camión <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMostrarNuevoCamion(!mostrarNuevoCamion)}
                      className="text-green-600 hover:text-green-700 gap-1 h-auto p-1"
                    >
                      {" "}
                      <Plus className="w-4 h-4" /> Nuevo{" "}
                    </Button>
                  </div>
                  {!mostrarNuevoCamion ? (
                    <Select
                      value={viaje.camion_id}
                      onValueChange={handleCamionChange}
                      required
                    >
                      <SelectTrigger className="border-slate-200">
                        {" "}
                        <SelectValue placeholder="Seleccionar camión" />{" "}
                      </SelectTrigger>
                      <SelectContent>
                        {camiones.map((camion) => (
                          // Usar String(id) como value
                          <SelectItem key={camion.id} value={String(camion.id)}>
                            {camion.nombre} - {camion.placas}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    /* Formulario nuevo camión */
                    <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <Input
                        placeholder="Nombre del camión"
                        value={nuevoCamion.nombre}
                        onChange={(e) =>
                          setNuevoCamion({
                            ...nuevoCamion,
                            nombre: e.target.value,
                          })
                        }
                        className="bg-white"
                        required
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
                        className="bg-white"
                        required
                      />
                      <Button
                        type="button"
                        onClick={() => crearCamionMutation.mutate(nuevoCamion)}
                        disabled={
                          !nuevoCamion.nombre ||
                          !nuevoCamion.placas ||
                          crearCamionMutation.isPending
                        }
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {crearCamionMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                            Guardando...
                          </>
                        ) : (
                          "Guardar Camión"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Ruta Ida */}
              <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  {" "}
                  <ArrowRight className="w-5 h-5 text-blue-600" />{" "}
                  <h3 className="font-bold text-slate-900">Ruta de Ida</h3>{" "}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="ruta_ida"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Ruta <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Input
                      id="ruta_ida"
                      placeholder="Ej: Ciudad A - Ciudad B"
                      value={viaje.ruta_ida}
                      onChange={(e) =>
                        setViaje({ ...viaje, ruta_ida: e.target.value })
                      }
                      required
                      className="border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="kilometros_ida"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Kilómetros <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Input
                      id="kilometros_ida"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={viaje.kilometros_ida}
                      onChange={(e) =>
                        setViaje({ ...viaje, kilometros_ida: e.target.value })
                      }
                      required
                      className="border-slate-200 bg-white"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Rutas Adicionales */}
              <div className="space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {" "}
                    <Route className="w-5 h-5 text-purple-600" />{" "}
                    <h3 className="font-bold text-slate-900">
                      Rutas Adicionales
                    </h3>{" "}
                    <span className="text-xs text-slate-500">(Opcional)</span>{" "}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarRutaAdicional}
                    className="gap-2 hover:bg-purple-50"
                  >
                    {" "}
                    <Plus className="w-4 h-4" /> Agregar Ruta{" "}
                  </Button>
                </div>
                {rutasAdicionales.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    {" "}
                    No hay rutas adicionales.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {rutasAdicionales.map((ruta, index) => (
                      <div
                        key={index}
                        className="grid md:grid-cols-[1fr_auto_auto] gap-3 p-3 bg-white rounded-lg border border-purple-200"
                      >
                        <Input
                          placeholder="Ruta adicional"
                          value={ruta.ruta}
                          onChange={(e) =>
                            actualizarRutaAdicional(
                              index,
                              "ruta",
                              e.target.value
                            )
                          }
                          className="border-slate-200"
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
                              e.target.value
                            )
                          }
                          className="border-slate-200 w-32"
                          min="0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarRutaAdicional(index)}
                          className="hover:bg-red-50 hover:text-red-700"
                        >
                          {" "}
                          <X className="w-4 h-4" />{" "}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ruta Regreso */}
              <div className="space-y-4 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  {" "}
                  <ArrowLeft className="w-5 h-5 text-orange-600" />{" "}
                  <h3 className="font-bold text-slate-900">Ruta de Regreso</h3>{" "}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="ruta_regreso"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Ruta <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Input
                      id="ruta_regreso"
                      placeholder="Ej: Ciudad B - Ciudad A"
                      value={viaje.ruta_regreso}
                      onChange={(e) =>
                        setViaje({ ...viaje, ruta_regreso: e.target.value })
                      }
                      required
                      className="border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="kilometros_regreso"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Kilómetros <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Input
                      id="kilometros_regreso"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={viaje.kilometros_regreso}
                      onChange={(e) =>
                        setViaje({
                          ...viaje,
                          kilometros_regreso: e.target.value,
                        })
                      }
                      required
                      className="border-slate-200 bg-white"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Combustible */}
              <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  {" "}
                  <Fuel className="w-5 h-5 text-green-600" />{" "}
                  <h3 className="font-bold text-slate-900">
                    Consumo de Combustible
                  </h3>{" "}
                  {kmTotales > 0 && (
                    <span className="text-sm text-slate-600 ml-2">
                      (Total: {kmTotales.toFixed(1)} km)
                    </span>
                  )}{" "}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="litros"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Litros <span className="text-red-500">*</span>{" "}
                    </Label>
                    <Input
                      id="litros"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={viaje.litros_combustible}
                      onChange={(e) =>
                        setViaje({
                          ...viaje,
                          litros_combustible: e.target.value,
                        })
                      }
                      required
                      className="border-slate-200 bg-white"
                      min="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="costo"
                      className="text-slate-700 font-semibold"
                    >
                      {" "}
                      Costo Total (opcional){" "}
                    </Label>
                    <Input
                      id="costo"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={viaje.costo_combustible}
                      onChange={(e) =>
                        setViaje({
                          ...viaje,
                          costo_combustible: e.target.value,
                        })
                      }
                      className="border-slate-200 bg-white"
                      min="0"
                    />
                  </div>
                </div>
                {eficiencia !== "-" && (
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        {" "}
                        <span className="text-slate-700 font-semibold">
                          Eficiencia:
                        </span>{" "}
                        <p className="text-xs text-slate-500 mt-1">
                          {kmTotales.toFixed(1)} km ÷ {viaje.litros_combustible}{" "}
                          L
                        </p>{" "}
                      </div>
                      <span className="text-3xl font-bold text-green-700">
                        {eficiencia} km/L
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notas" className="text-slate-700 font-semibold">
                  {" "}
                  Notas Adicionales{" "}
                </Label>
                <Textarea
                  id="notas"
                  placeholder="Observaciones..."
                  value={viaje.notas}
                  onChange={(e) =>
                    setViaje({ ...viaje, notas: e.target.value })
                  }
                  rows={4}
                  className="border-slate-200 resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("ControlCombustible"))}
                  className="flex-1"
                >
                  {" "}
                  Cancelar{" "}
                </Button>
                <Button
                  type="submit"
                  disabled={crearViajeMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg gap-2"
                >
                  {crearViajeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Registrar Viaje
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
