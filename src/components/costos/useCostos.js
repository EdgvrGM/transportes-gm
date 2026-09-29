import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { TIPOS_UNIDAD, etiquetaUnidad, keyUnidad } from "./costosConfig";

// Todas las queries del módulo cuelgan de "costos": invalidar ["costos"]
// refresca tabla semanal, detalle por unidad y el widget del panel a la vez.
export const COSTOS_KEY = "costos";

// El widget del Panel usa su propia key "panel-…" (el botón refrescar del panel
// sólo recarga esas); se invalida aquí para que no muestre datos de hasta 1 min.
export function invalidarCostos(queryClient) {
  queryClient.invalidateQueries({ queryKey: [COSTOS_KEY] });
  queryClient.invalidateQueries({ queryKey: ["panel-costos-semana"] });
}

// Lista única de destinos de gasto, en el orden en que se muestran:
// camiones (por nombre) → remolques (por tipo, luego placas) → generales.
// `seccion` agrupa filas en tablas y selectores.
export function useUnidades() {
  return useQuery({
    queryKey: [COSTOS_KEY, "unidades"],
    queryFn: async () => {
      const [c, r] = await Promise.all([
        supabase.from("Camion").select("id, nombre, placas").order("nombre"),
        supabase.from("Remolque").select("id, placas, tipo").order("tipo", { nullsFirst: false }).order("placas"),
      ]);
      if (c.error) throw c.error;
      if (r.error) throw r.error;
      return [
        ...(c.data || []).map((u) => ({
          key: keyUnidad("camion", u.id),
          tipo: "camion",
          id: u.id,
          etiqueta: etiquetaUnidad("camion", u),
          seccion: TIPOS_UNIDAD.camion.label,
        })),
        ...(r.data || []).map((u) => ({
          key: keyUnidad("remolque", u.id),
          tipo: "remolque",
          id: u.id,
          etiqueta: etiquetaUnidad("remolque", u),
          seccion: `${TIPOS_UNIDAD.remolque.label} · ${u.tipo || "Sin tipo"}`,
        })),
        {
          key: keyUnidad("general"),
          tipo: "general",
          id: null,
          etiqueta: etiquetaUnidad("general"),
          seccion: TIPOS_UNIDAD.general.label,
        },
      ];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Gastos en [desde, hasta] (YYYY-MM-DD, inclusivo) de todas las unidades, o de
// una sola si se pasa `unidad` (objeto de useUnidades).
export function useCostosRango(desde, hasta, { unidad = null, enabled = true } = {}) {
  return useQuery({
    queryKey: [COSTOS_KEY, "rango", desde, hasta, unidad?.key ?? "todas"],
    queryFn: async () => {
      let q = supabase
        .from("CostoUnidad")
        .select("*")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (unidad?.tipo === "general") q = q.is("camion_id", null).is("remolque_id", null);
      else if (unidad) q = q.eq(TIPOS_UNIDAD[unidad.tipo].columna, unidad.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: enabled && Boolean(desde && hasta),
  });
}

export function useEliminarCosto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (costo) => {
      const { error } = await supabase.from("CostoUnidad").delete().eq("id", costo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidarCostos(queryClient);
      toast({ title: "Gasto eliminado" });
    },
    onError: (e) => {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: e.message });
    },
  });
}

export const sumaMontos = (lista) => lista.reduce((s, c) => s + (Number(c.monto) || 0), 0);
