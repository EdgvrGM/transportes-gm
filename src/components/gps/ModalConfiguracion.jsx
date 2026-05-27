import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Loader2, Check, Truck } from "lucide-react";
import { WIALON_PROXY_URL } from "@/components/gps/constants";

async function fetchWialonUnits() {
  const res = await fetch(`${WIALON_PROXY_URL}?action=units`);
  if (!res.ok) throw new Error("Error al obtener unidades Wialon");
  return res.json();
}

export default function ModalConfiguracion({ open, onClose }) {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState({});
  const [saveError, setSaveError] = useState(null);

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["wialon-units"],
    queryFn: fetchWialonUnits,
    enabled: open,
    staleTime: Infinity,
  });

  const { data: camiones = [] } = useQuery({
    queryKey: ["camiones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Camion")
        .select("id, nombre, placas")
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: vinculaciones = [] } = useQuery({
    queryKey: ["unidades-gps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("UnidadGPS")
        .select("wialon_unit_id, camion_id")
        .eq("activo", true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Pre-cargar selecciones actuales cuando llegan los datos
  useEffect(() => {
    if (units.length === 0) return;
    const initial = {};
    units.forEach((u) => {
      const found = vinculaciones.find((v) => v.wialon_unit_id === u.id);
      initial[u.id] = found?.camion_id ?? "";
    });
    setSelections(initial);
  }, [units.length, vinculaciones.length]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const unit of units) {
        // Eliminar vinculación anterior (si existe)
        const { error: delError } = await supabase
          .from("UnidadGPS")
          .delete()
          .eq("wialon_unit_id", unit.id);
        if (delError) throw delError;

        // Insertar nueva si hay camión seleccionado
        if (selections[unit.id]) {
          const { error: insError } = await supabase.from("UnidadGPS").insert({
            wialon_unit_id: unit.id,
            wialon_nombre: unit.nombre,
            camion_id: selections[unit.id],
            activo: true,
          });
          if (insError) throw insError;
        }
      }
    },
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["unidades-gps"] });
      onClose();
    },
    onError: (err) => setSaveError(err.message),
  });

  const assignedCount = Object.values(selections).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar vinculación GPS
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-1">
          Asigna cada unidad Wialon a un camión del ERP para mostrar su nombre en el mapa.
        </p>

        {loadingUnits ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Cargando unidades...
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 py-1">
            {units.map((unit) => {
              const selected = selections[unit.id] ?? "";
              const camion = camiones.find((c) => c.id === selected);
              return (
                <div
                  key={unit.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selected
                      ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-700"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {/* Icono estado */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                      selected
                        ? "bg-yellow-400 text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                  </div>

                  {/* Nombre de la unidad Wialon */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {unit.nombre}
                    </p>
                    <p className="text-xs text-slate-400">
                      {camion
                        ? `${camion.nombre}${camion.placas ? ` · ${camion.placas}` : ""}`
                        : "Sin asignar"}
                    </p>
                  </div>

                  {/* Selector de camión */}
                  <select
                    value={selected}
                    onChange={(e) =>
                      setSelections((prev) => ({ ...prev, [unit.id]: e.target.value }))
                    }
                    className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">— Sin asignar —</option>
                    {camiones.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}{c.placas ? ` · ${c.placas}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {saveError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">
            {assignedCount} de {units.length} unidades asignadas
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || loadingUnits}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Check className="w-4 h-4 mr-1.5" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
