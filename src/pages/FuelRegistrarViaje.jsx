import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FuelRegistrarViaje() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    fecha: "",
    fecha_llegada: "", // <--- NUEVO CAMPO
    conductor_id: "",
    conductor_nombre: "",
    camion_id: "",
    camion_nombre: "",
    camion_placas: "",
    ruta_ida: "",
    kilometros_ida: "",
    rutas_adicionales: [],
    ruta_regreso: "",
    kilometros_regreso: "",
    litros_combustible: "",
    costo_combustible: "",
    notas: "",
  });

  // Queries para llenar los Selects
  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Camion").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Manejadores de cambios
  const handleConductorChange = (val) => {
    const conductor = conductores.find((c) => String(c.id) === val);
    setFormData((prev) => ({
      ...prev,
      conductor_id: val,
      conductor_nombre: conductor?.nombre || "",
    }));
  };

  const handleCamionChange = (val) => {
    const camion = camiones.find((c) => String(c.id) === val);
    setFormData((prev) => ({
      ...prev,
      camion_id: val,
      camion_nombre: camion?.nombre || "",
      camion_placas: camion?.placas || "",
    }));
  };

  const agregarRutaAdicional = () => {
    setFormData((prev) => ({
      ...prev,
      rutas_adicionales: [
        ...prev.rutas_adicionales,
        { ruta: "", kilometros: "" },
      ],
    }));
  };

  const eliminarRutaAdicional = (index) => {
    setFormData((prev) => ({
      ...prev,
      rutas_adicionales: prev.rutas_adicionales.filter((_, i) => i !== index),
    }));
  };

  const actualizarRutaAdicional = (index, campo, valor) => {
    const nuevas = [...formData.rutas_adicionales];
    nuevas[index][campo] = valor;
    setFormData((prev) => ({ ...prev, rutas_adicionales: nuevas }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const kmIda = parseFloat(formData.kilometros_ida) || 0;
      const kmRegreso = parseFloat(formData.kilometros_regreso) || 0;
      const kmAdicionales = formData.rutas_adicionales.reduce(
        (sum, r) => sum + parseFloat(r.kilometros || 0),
        0
      );
      const kmTotal = kmIda + kmAdicionales + kmRegreso;
      const litros = parseFloat(formData.litros_combustible) || 0;

      const payload = {
        fecha: formData.fecha,
        fecha_llegada: formData.fecha_llegada || null, // <--- ENVIAMOS EL NUEVO CAMPO
        conductor_id: formData.conductor_id || null,
        conductor_nombre: formData.conductor_nombre,
        camion_id: formData.camion_id || null,
        camion_nombre: formData.camion_nombre,
        camion_placas: formData.camion_placas,
        ruta_ida: formData.ruta_ida,
        kilometros_ida: kmIda,
        rutas_adicionales: formData.rutas_adicionales,
        ruta_regreso: formData.ruta_regreso,
        kilometros_regreso: kmRegreso,
        kilometros_total: kmTotal,
        litros_combustible: litros,
        km_por_litro: litros > 0 ? kmTotal / litros : 0,
        costo_combustible: formData.costo_combustible
          ? parseFloat(formData.costo_combustible)
          : null,
        notas: formData.notas,
      };

      const { error } = await supabase.from("Viaje").insert([payload]);
      if (error) throw error;

      toast({
        title: "Viaje registrado",
        description: "El viaje se ha guardado exitosamente.",
      });

      // Resetear formulario
      setFormData({
        fecha: "",
        fecha_llegada: "",
        conductor_id: "",
        conductor_nombre: "",
        camion_id: "",
        camion_nombre: "",
        camion_placas: "",
        ruta_ida: "",
        kilometros_ida: "",
        rutas_adicionales: [],
        ruta_regreso: "",
        kilometros_regreso: "",
        litros_combustible: "",
        costo_combustible: "",
        notas: "",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el viaje.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Registrar Nuevo Viaje
        </h1>

        <form onSubmit={handleSubmit}>
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-slate-100 bg-white">
              <CardTitle>Detalles del Viaje</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 bg-white">
              {/* Sección 1: Fechas y Unidad */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">
                    Fecha Salida <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    id="fecha"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    required
                  />
                </div>

                {/* --- NUEVO CAMPO FECHA LLEGADA --- */}
                <div className="space-y-2">
                  <Label htmlFor="fecha_llegada">Fecha de Llegada / Carga</Label>
                  <Input
                    type="date"
                    id="fecha_llegada"
                    value={formData.fecha_llegada}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fecha_llegada: e.target.value,
                      })
                    }
                  />
                </div>
                {/* ---------------------------------- */}

                <div className="space-y-2">
                  <Label>Conductor</Label>
                  <Select
                    value={formData.conductor_id}
                    onValueChange={handleConductorChange}
                  >
                    <SelectTrigger>
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
                </div>
                <div className="space-y-2">
                  <Label>Camión</Label>
                  <Select
                    value={formData.camion_id}
                    onValueChange={handleCamionChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {camiones.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sección 2: Ruta Ida */}
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Ruta Ida <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.ruta_ida}
                    onChange={(e) =>
                      setFormData({ ...formData, ruta_ida: e.target.value })
                    }
                    placeholder="Origen - Destino"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Kilómetros Ida <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.kilometros_ida}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kilometros_ida: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* Sección 3: Rutas Adicionales */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Rutas Adicionales</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarRutaAdicional}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </Button>
                </div>
                {formData.rutas_adicionales.map((ruta, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Ruta adicional"
                      value={ruta.ruta}
                      onChange={(e) =>
                        actualizarRutaAdicional(idx, "ruta", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="km"
                      value={ruta.kilometros}
                      onChange={(e) =>
                        actualizarRutaAdicional(
                          idx,
                          "kilometros",
                          e.target.value
                        )
                      }
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarRutaAdicional(idx)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Sección 4: Ruta Regreso */}
              <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-100 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ruta Regreso</Label>
                  <Input
                    value={formData.ruta_regreso}
                    onChange={(e) =>
                      setFormData({ ...formData, ruta_regreso: e.target.value })
                    }
                    placeholder="Regreso a base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kilómetros Regreso</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.kilometros_regreso}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kilometros_regreso: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Sección 5: Combustible */}
              <div className="p-4 bg-green-50/50 rounded-lg border border-green-100 grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Litros Diesel <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.litros_combustible}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        litros_combustible: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo Total ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.costo_combustible}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costo_combustible: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 text-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}{" "}
                Registrar Viaje
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
