import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { TIPOS_UNIDAD } from "./costosConfig";

// Todas las queries del módulo cuelgan de "costos": invalidar ["costos"]
// refresca tabla semanal, detalle por unidad y el widget del panel a la vez.
export const COSTOS_KEY = "costos";

// El widget del Panel usa su propia key "panel-…" (el botón refrescar del panel
// sólo recarga esas); se invalida aquí para que no muestre datos de hasta 1 min.
export function invalidarCostos(queryClient) {
  queryClient.invalidateQueries({ queryKey: [COSTOS_KEY] });
  queryClient.invalidateQueries({ queryKey: ["panel-costos-semana"] });
}

export function useUnidades(tipo) {
  return useQuery({
    queryKey: [COSTOS_KEY, "unidades", tipo],
    queryFn: async () => {
      const q =
        tipo === "camion"
          ? supabase.from("Camion").select("id, nombre, placas, estado").order("nombre")
          : supabase.from("Remolque").select("id, placas, tipo").order("tipo", { nullsFirst: false }).order("placas");
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Gastos de un tipo de unidad en [desde, hasta] (YYYY-MM-DD, inclusivo).
// `unidadId` opcional para limitar a una sola unidad.
export function useCostosRango(tipo, desde, hasta, { unidadId = null, enabled = true } = {}) {
  const columna = TIPOS_UNIDAD[tipo].columna;
  return useQuery({
    queryKey: [COSTOS_KEY, "rango", tipo, desde, hasta, unidadId],
    queryFn: async () => {
      let q = supabase
        .from("CostoUnidad")
        .select("*")
        .not(columna, "is", null)
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (unidadId) q = q.eq(columna, unidadId);
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
