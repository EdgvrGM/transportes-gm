import { useState, useEffect, useMemo, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Fuel,
  Ticket,
  MapPin,
  Calendar,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (points.length < 2 || fitted.current) return;
    const bounds = points.map(p => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [24, 24], animate: true });
    fitted.current = true;
  }, [points]);
  return null;
}

function SeguirPunto({ punto }) {
  const map = useMap();
  const prevPunto = useRef(null);
  useEffect(() => {
    if (!punto) return;
    if (
      prevPunto.current &&
      prevPunto.current.lat === punto.lat &&
      prevPunto.current.lng === punto.lng
    ) return;
    prevPunto.current = punto;
    map.panTo([punto.lat, punto.lng], { animate: true, duration: 0.3 });
  }, [punto]);
  return null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FuelRegistrarViaje() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state || {};
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [mostrarNuevoConductor, setMostrarNuevoConductor] = useState(false);
  const [mostrarNuevoCamion, setMostrarNuevoCamion] = useState(false);

  const viajeRegistradoId = stateData.viaje_registrado_id || null;
  const esVinculado = !!viajeRegistradoId;

  const [viaje, setViaje] = useState({
    fecha: stateData.fecha || new Date().toLocaleDateString("en-CA"),
    fecha_llegada: "",
    conductor_id: stateData.conductor_id || "",
    conductor_nombre: stateData.conductor_nombre || "",
    camion_id: stateData.camion_id || "",
    camion_nombre: stateData.camion_nombre || "",
    camion_placas: stateData.camion_placas || "",
    tipo_viaje: stateData.tipo_viaje || "Sencillo",
    remolque_id: stateData.remolque_id || "",
    remolque2_id: stateData.remolque2_id || "",
    ruta_ida: "",
    kilometros_total: "",
    km_gps: false,
    gps_tramo_desde: "",
    gps_tramo_hasta: "",
    litros_combustible: "",
    costo_combustible: "",
    casetas_ida: "",
    casetas_regreso: "",
    sinCasetas: false,
    sinDiesel: false,
    notas: "",
  });

  const getAbreviacionTipo = (tipo) => {
    if (!tipo) return "";
    const t = tipo.toLowerCase();
    if (t.includes("seca") || t.includes("caja")) return "CS";
    if (
      t.includes("chasis") ||
      t.includes("contenedor") ||
      t.includes("portacontenedor")
    )
      return "CH";
    if (t.includes("plataforma")) return "PT";
    return "";
  };

  const [nuevoConductor, setNuevoConductor] = useState({
    nombre: "",
    licencia: "",
    telefono: "",
  });
  const [nuevoCamion, setNuevoCamion] = useState({ nombre: "", placas: "" });

  const { data: conductores = [] } = useQuery({
    queryKey: ["conductores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Conductor").select("*").eq("estado", "activo");
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

  const { data: remolques = [] } = useQuery({
    queryKey: ["remolques"],
    queryFn: async () => {
      const { data, error } = await supabase.from("Remolque").select("*");
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

  // CAMBIO 1: estado del selector GPS
  const [gpsPoints, setGpsPoints]       = useState([]);
  const [gpsStatus, setGpsStatus]       = useState("idle");
  // idle | loading | success | no_data | sin_gps | error
  const [sliderInicio, setSliderInicio] = useState(0);
  const [sliderFin, setSliderFin]       = useState(0);
  const [kmTramo, setKmTramo]           = useState(null);
  const [sliderActivo, setSliderActivo] = useState(null);
  // "inicio" | "fin" | null

  const frecuenciaGps = useMemo(() => {
    if (gpsPoints.length < 2) return null;
    let totalSegundos = 0;
    let segmentos = 0;
    for (let i = 1; i < Math.min(gpsPoints.length, 20); i++) {
      const diff = new Date(gpsPoints[i].timestamp) -
                   new Date(gpsPoints[i - 1].timestamp);
      if (diff > 0 && diff < 600000) {
        totalSegundos += diff / 1000;
        segmentos++;
      }
    }
    if (segmentos === 0) return null;
    return Math.round(totalSegundos / segmentos);
  }, [gpsPoints]);

  const puntoActivo = useMemo(() => {
    if (sliderActivo === "inicio") return gpsPoints[sliderInicio] ?? null;
    if (sliderActivo === "fin")    return gpsPoints[sliderFin]    ?? null;
    return null;
  }, [sliderActivo, sliderInicio, sliderFin, gpsPoints]);

  // CAMBIO 3: tramo visible — compartido entre cálculo de km y mini-mapa
  const tramoPoints = useMemo(() => {
    if (gpsPoints.length < 2) return [];
    return gpsPoints.slice(sliderInicio, sliderFin + 1);
  }, [gpsPoints, sliderInicio, sliderFin]);

  // CAMBIO 2: fetchGpsPoints reemplaza calcularKmDesdeGPS
  const fetchGpsPoints = async () => {
    if (!viaje.camion_id || !viaje.fecha || !viaje.fecha_llegada) return;

    setGpsStatus("loading");
    setGpsPoints([]);
    setKmTramo(null);
    setViaje(prev => ({ ...prev, km_gps: false }));

    try {
      const { data: unidadGPS } = await supabase
        .from("UnidadGPS")
        .select("wialon_unit_id")
        .eq("camion_id", viaje.camion_id)
        .eq("activo", true)
        .single();

      if (!unidadGPS) throw new Error("sin_gps");

      const fromTs = Math.floor(
        new Date(viaje.fecha + "T00:00:00").getTime() / 1000
      );
      const toTs = Math.floor(
        new Date(viaje.fecha_llegada + "T23:59:59").getTime() / 1000
      );

      const res = await fetch(
        `https://wialon-proxy.transportesgm.workers.dev?action=history` +
        `&unit=${unidadGPS.wialon_unit_id}&from=${fromTs}&to=${toTs}`
      );
      if (!res.ok) throw new Error("fetch_error");

      const data = await res.json();
      const points = data.points || [];

      if (points.length < 2) {
        setGpsStatus("no_data");
        return;
      }

      setGpsPoints(points);
      setSliderInicio(0);
      setSliderFin(points.length - 1);
      setGpsStatus("success");

    } catch (err) {
      setGpsStatus(err.message === "sin_gps" ? "sin_gps" : "error");
    }
  };

  // CAMBIO 3: recalcular km usando tramoPoints
  useEffect(() => {
    if (tramoPoints.length < 2) {
      setKmTramo(null);
      return;
    }
    let dist = 0;
    for (let i = 1; i < tramoPoints.length; i++) {
      dist += haversineKm(
        tramoPoints[i - 1].lat, tramoPoints[i - 1].lng,
        tramoPoints[i].lat,     tramoPoints[i].lng
      );
    }
    setKmTramo(Math.round(dist));
  }, [tramoPoints]);

  // CAMBIO 4: auto-trigger cuando los tres datos están listos
  useEffect(() => {
    if (viaje.camion_id && viaje.fecha && viaje.fecha_llegada) {
      fetchGpsPoints();
    }
  }, [viaje.camion_id, viaje.fecha, viaje.fecha_llegada]);

  // CAMBIO 5: confirmar tramo seleccionado
  const confirmarTramo = () => {
    if (kmTramo === null) return;
    setViaje(prev => ({
      ...prev,
      kilometros_total: kmTramo,
      km_gps: true,
      gps_tramo_desde: gpsPoints[sliderInicio]?.timestamp || "",
      gps_tramo_hasta: gpsPoints[sliderFin]?.timestamp || "",
    }));
  };

  const crearViajeMutation = useMutation({
    mutationFn: async (data) => {
      const { _puntosRuta, ...datosViaje } = data;
      const { data: result, error } = await supabase
        .from("Viaje")
        .insert([datosViaje])
        .select();

      if (error) throw new Error(error.message);
      return { result, puntosRuta: _puntosRuta };
    },
    onSuccess: async (data) => {
      const viajeId = data.result[0]?.id;

      // Guardar puntos del tramo GPS para reproducción posterior
      if (viajeId && data.puntosRuta) {
        await supabase.from("ViajeRuta").insert({
          viaje_id: viajeId,
          puntos: data.puntosRuta,
          total_puntos: data.puntosRuta.length,
        });
      }

      if (viajeRegistradoId) {
        await supabase
          .from("viajes_registrados")
          .update({ combustible_registrado: viaje.litros_combustible !== "" })
          .eq("id", viajeRegistradoId);
      } else {
        await supabase
          .from("viajes_registrados")
          .update({ combustible_registrado: viaje.litros_combustible !== "" })
          .match({
            fecha_viaje: viaje.fecha,
            conductor_id: viaje.conductor_id,
            camion_id: viaje.camion_id
          });
      }
      queryClient.invalidateQueries({ queryKey: ["viajes"] });
      queryClient.invalidateQueries({ queryKey: ["viajes_registrados"] });
      queryClient.invalidateQueries({ queryKey: ["rutasGuardadas"] });
      navigate(createPageUrl("ControlCombustible"));
    },
    onError: (_err) => {
      setError("Error al registrar el viaje.");
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (
      !viaje.fecha ||
      !viaje.conductor_id ||
      !viaje.camion_id ||
      !viaje.ruta_ida ||
      viaje.kilometros_total === "" ||
      isNaN(parseFloat(viaje.kilometros_total))
    ) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }

    let litros = viaje.litros_combustible !== "" ? parseFloat(viaje.litros_combustible) : null;
    let costoFuel = viaje.costo_combustible !== "" ? parseFloat(viaje.costo_combustible) : null;

    if (viaje.sinDiesel) {
      litros = 0;
      costoFuel = 0;
    }

    let casetasIda = viaje.casetas_ida !== "" ? parseFloat(viaje.casetas_ida) : null;
    let casetasRegreso = viaje.casetas_regreso !== "" ? parseFloat(viaje.casetas_regreso) : null;

    if (viaje.sinCasetas) {
      casetasIda = 0;
      casetasRegreso = 0;
    }

    const datosViaje = {
      fecha: `${viaje.fecha}T12:00:00`,
      fecha_llegada: viaje.fecha_llegada || null,
      conductor_id: viaje.conductor_id || null,
      conductor_nombre: viaje.conductor_nombre,
      camion_id: viaje.camion_id || null,
      camion_nombre: viaje.camion_nombre,
      camion_placas: viaje.camion_placas,
      tipo_viaje: viaje.tipo_viaje,
      remolque_id: viaje.remolque_id || null,
      remolque2_id: viaje.remolque2_id || null,
      ruta_ida: viaje.ruta_ida,
      kilometros_total: parseFloat(viaje.kilometros_total),
      km_gps: viaje.km_gps,
      gps_tramo_desde: viaje.gps_tramo_desde || null,
      gps_tramo_hasta: viaje.gps_tramo_hasta || null,
      km_por_litro: (litros !== null && litros > 0)
        ? parseFloat(viaje.kilometros_total) / litros
        : 0,
      litros_combustible: litros,
      costo_combustible: costoFuel,
      casetas_ida: casetasIda,
      casetas_regreso: casetasRegreso,
      notas: viaje.notas,
      viaje_registrado_id: viajeRegistradoId || null,
    };
    crearViajeMutation.mutate({
      ...datosViaje,
      _puntosRuta: viaje.km_gps && tramoPoints.length > 1 ? tramoPoints : null,
    });
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
    setViaje(prev => ({ ...prev, ruta_ida: val }));
  };

  const kmTotales = parseFloat(viaje.kilometros_total) || 0;
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

        {esVinculado && (
          <Alert className="mb-6 bg-blue-50/80 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800 shadow-sm rounded-xl">
            <AlertDescription className="font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Registro vinculado al Programa de Cargas - Datos de unidad y ruta protegidos
            </AlertDescription>
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
                  <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors pointer-events-none" />
                    <Input
                      id="fecha"
                      type="date"
                      value={viaje.fecha}
                      onChange={(e) =>
                        setViaje({ ...viaje, fecha: e.target.value })
                      }
                      required
                      className="pl-10 bg-background border-input cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fecha_llegada"
                    className="text-foreground font-semibold"
                  >
                    Llegada / Carga
                  </Label>
                  <div className="relative group/date cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover/date:text-primary transition-colors pointer-events-none" />
                    <Input
                      id="fecha_llegada"
                      type="date"
                      value={viaje.fecha_llegada}
                      onChange={(e) =>
                        setViaje({ ...viaje, fecha_llegada: e.target.value })
                      }
                      className="pl-10 bg-background border-input cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
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
                      disabled={esVinculado}
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
                      disabled={esVinculado}
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
                      setViaje({
                        ...viaje,
                        tipo_viaje: val,
                        remolque2_id: val === "Sencillo" ? "" : viaje.remolque2_id
                      })
                    }
                    required
                    disabled={esVinculado}
                  >
                    <SelectTrigger className="bg-background border-input font-medium">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sencillo">Sencillo</SelectItem>
                      <SelectItem value="FULL">FULL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">
                    Remolque 1
                  </Label>
                  <Select
                    value={viaje.remolque_id}
                    onValueChange={(val) => setViaje({ ...viaje, remolque_id: val })}
                    disabled={esVinculado}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {remolques.map((r) => {
                        const abv = getAbreviacionTipo(r.tipo);
                        return (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {abv ? `[${abv}] ` : ""}{r.placas}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {viaje.tipo_viaje === "FULL" && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Remolque 2
                    </Label>
                    <Select
                      value={viaje.remolque2_id}
                      onValueChange={(val) => setViaje({ ...viaje, remolque2_id: val })}
                      disabled={esVinculado}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {remolques.map((r) => {
                          const abv = getAbreviacionTipo(r.tipo);
                          return (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {abv ? `[${abv}] ` : ""}{r.placas}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* CAMBIO 6: sección de ruta con selector de tramo GPS */}
              <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-foreground">Ruta del viaje</h3>
                </div>

                {/* Ruta + Kilómetros */}
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
                      placeholder="Ej. Tecomán - San Isidro"
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
                      Kilómetros totales del viaje <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        value={viaje.kilometros_total}
                        onChange={(e) => setViaje(prev => ({
                          ...prev,
                          kilometros_total: e.target.value,
                          km_gps: false,
                          gps_tramo_desde: "",
                          gps_tramo_hasta: "",
                        }))}
                        required
                        placeholder="km"
                        className={`bg-background border-input flex-1 ${
                          viaje.km_gps
                            ? "border-green-500 bg-green-50/50 dark:bg-green-900/10"
                            : ""
                        }`}
                      />
                      {viaje.km_gps && (
                        <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md border border-green-200 dark:border-green-800 whitespace-nowrap">
                          <span>📡</span> GPS
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Estados del fetch GPS */}
                {gpsStatus === "loading" && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Obteniendo recorrido GPS...
                  </div>
                )}

                {gpsStatus === "sin_gps" && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                    Esta unidad no tiene GPS vinculado — ingresa los km manualmente
                  </p>
                )}

                {gpsStatus === "no_data" && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                    Sin datos GPS para este rango de fechas — ingresa los km manualmente
                  </p>
                )}

                {gpsStatus === "error" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No se pudo conectar con GPS — ingresa los km manualmente
                  </p>
                )}

                {/* Panel selector de tramo */}
                {gpsStatus === "success" && (
                  <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Selector de tramo GPS
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {gpsPoints.length} puntos
                        {frecuenciaGps !== null && (
                          <> · reporte cada {
                            frecuenciaGps < 60
                              ? `${frecuenciaGps}s`
                              : `${Math.round(frecuenciaGps / 60)} min`
                          }</>
                        )}
                      </span>
                    </div>

                    {/* Slider inicio */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted-foreground">
                          Inicio del viaje
                        </label>
                        <span className="text-xs font-medium text-foreground">
                          {gpsPoints[sliderInicio]
                            ? new Date(gpsPoints[sliderInicio].timestamp)
                                .toLocaleString("es-MX", {
                                  weekday: "short", day: "2-digit",
                                  month: "short", hour: "2-digit", minute: "2-digit",
                                })
                            : "—"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={gpsPoints.length - 1}
                        value={sliderInicio}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSliderInicio(val);
                          setSliderActivo("inicio");
                          if (val >= sliderFin) setSliderFin(Math.min(val + 1, gpsPoints.length - 1));
                        }}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    {/* Slider fin */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-muted-foreground">
                          Fin del viaje
                        </label>
                        <span className="text-xs font-medium text-foreground">
                          {gpsPoints[sliderFin]
                            ? new Date(gpsPoints[sliderFin].timestamp)
                                .toLocaleString("es-MX", {
                                  weekday: "short", day: "2-digit",
                                  month: "short", hour: "2-digit", minute: "2-digit",
                                })
                            : "—"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={gpsPoints.length - 1}
                        value={sliderFin}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSliderFin(val);
                          setSliderActivo("fin");
                          if (val <= sliderInicio) setSliderInicio(Math.max(val - 1, 0));
                        }}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    {/* Mini-mapa — wrapper con zIndex: 0 obligatorio per CLAUDE.md */}
                    <div
                      style={{ position: "relative", zIndex: 0 }}
                      className="rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900"
                    >
                      <MapContainer
                        center={
                          tramoPoints.length > 0
                            ? [tramoPoints[0].lat, tramoPoints[0].lng]
                            : [19.05, -104.31]
                        }
                        zoom={10}
                        style={{ height: "220px", width: "100%" }}
                        zoomControl={true}
                        scrollWheelZoom={true}
                        attributionControl={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        <FitBounds points={tramoPoints} />
                        <SeguirPunto punto={puntoActivo} />

                        {/* Ruta completa en gris — contexto */}
                        {gpsPoints.length > 1 && (
                          <Polyline
                            positions={gpsPoints.map(p => [p.lat, p.lng])}
                            pathOptions={{ color: "#94a3b8", weight: 2, opacity: 0.4 }}
                          />
                        )}

                        {/* Tramo seleccionado en azul */}
                        {tramoPoints.length > 1 && (
                          <Polyline
                            positions={tramoPoints.map(p => [p.lat, p.lng])}
                            pathOptions={{ color: "#185FA5", weight: 3, opacity: 0.9 }}
                          />
                        )}

                        {/* Inicio — verde */}
                        {tramoPoints.length > 0 && (
                          <CircleMarker
                            center={[tramoPoints[0].lat, tramoPoints[0].lng]}
                            radius={7}
                            pathOptions={{ color: "white", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }}
                          />
                        )}

                        {/* Fin — amarillo GM */}
                        {tramoPoints.length > 1 && (
                          <CircleMarker
                            center={[
                              tramoPoints[tramoPoints.length - 1].lat,
                              tramoPoints[tramoPoints.length - 1].lng,
                            ]}
                            radius={7}
                            pathOptions={{ color: "white", weight: 2, fillColor: "#EAB308", fillOpacity: 1 }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    {/* Resultado del tramo */}
                    {kmTramo !== null && (
                      <div className="flex items-center justify-between bg-background rounded-lg border border-border px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Tramo seleccionado: {kmTramo.toLocaleString("es-MX")} km
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {gpsPoints[sliderFin] && gpsPoints[sliderInicio]
                              ? (() => {
                                  const ms =
                                    new Date(gpsPoints[sliderFin].timestamp) -
                                    new Date(gpsPoints[sliderInicio].timestamp);
                                  const h = Math.floor(ms / 3600000);
                                  const m = Math.floor((ms % 3600000) / 60000);
                                  return `${h}h ${m}min de recorrido`;
                                })()
                              : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={confirmarTramo}
                          className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
                        >
                          Usar estos km
                        </Button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={fetchGpsPoints}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <span>↺</span> Recargar datos GPS
                    </button>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />

              {/* COMBUSTIBLE */}
              <div className="space-y-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-bold text-foreground">Combustible</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/50">
                    <Checkbox
                      id="no-diesel"
                      checked={viaje.sinDiesel}
                      onCheckedChange={(checked) => setViaje({ ...viaje, sinDiesel: !!checked, litros_combustible: checked ? 0 : viaje.litros_combustible, costo_combustible: checked ? 0 : viaje.costo_combustible })}
                    />
                    <Label htmlFor="no-diesel" className="text-xs font-bold cursor-pointer text-green-700 dark:text-green-400">
                      Aún no ha cargado diesel
                    </Label>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Litros
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.sinDiesel ? "0" : viaje.litros_combustible}
                      onChange={(e) =>
                        setViaje({ ...viaje, litros_combustible: e.target.value })
                      }
                      disabled={viaje.sinDiesel}
                      className="bg-background border-input disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Costo Total ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.sinDiesel ? "0" : viaje.costo_combustible}
                      onChange={(e) =>
                        setViaje({ ...viaje, costo_combustible: e.target.value })
                      }
                      disabled={viaje.sinDiesel}
                      className="bg-background border-input disabled:opacity-50"
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

              {/* CASETAS */}
              <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-foreground">Casetas</h3>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <Checkbox
                      id="no-casetas"
                      checked={viaje.sinCasetas}
                      onCheckedChange={(checked) => setViaje({ ...viaje, sinCasetas: !!checked })}
                    />
                    <Label htmlFor="no-casetas" className="text-xs font-bold cursor-pointer text-indigo-700 dark:text-indigo-400">
                      No pagó casetas
                    </Label>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Casetas Ida ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.sinCasetas ? "0" : viaje.casetas_ida}
                      onChange={(e) =>
                        setViaje({ ...viaje, casetas_ida: e.target.value })
                      }
                      disabled={viaje.sinCasetas}
                      className="bg-background border-input disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">
                      Casetas Regreso ($)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={viaje.sinCasetas ? "0" : viaje.casetas_regreso}
                      onChange={(e) =>
                        setViaje({ ...viaje, casetas_regreso: e.target.value })
                      }
                      disabled={viaje.sinCasetas}
                      className="bg-background border-input disabled:opacity-50"
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

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("ControlCombustible"))}
                  className="flex-1 bg-card hover:bg-muted border-border"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={crearViajeMutation.isPending}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 shadow-lg"
                >
                  {crearViajeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Registrar Viaje
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
