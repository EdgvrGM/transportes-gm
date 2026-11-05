import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { eliminarRegistro, invalidarEliminacion, mensajeEliminacion } from "@/lib/eliminaciones";

export const QK_SOLICITUDES = ["solicitudes-eliminacion"];
const VACIO = new Set();

export function useSolicitudes() {
  return useQuery({
    queryKey: [...QK_SOLICITUDES, "todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitud_eliminacion")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
  });
}

// Set de registro_id con solicitud pendiente en una tabla (etiqueta "Eliminación solicitada").
export function useSolicitudesPendientes(tabla) {
  const { data } = useQuery({
    queryKey: [...QK_SOLICITUDES, "pendientes", tabla],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitud_eliminacion")
        .select("registro_id")
        .eq("tabla", tabla)
        .eq("estado", "pendiente");
      if (error) throw error;
      return data || [];
    },
  });
  return useMemo(() => (data ? new Set(data.map((s) => s.registro_id)) : VACIO), [data]);
}

export function useContadorSolicitudes(enabled) {
  const { data } = useQuery({
    queryKey: [...QK_SOLICITUDES, "contador"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("solicitud_eliminacion")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente");
      if (error) throw error;
      return count || 0;
    },
    enabled,
    refetchInterval: 60000,
  });
  return data ?? 0;
}

export function useCrearSolicitud() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ tabla, registroId, descripcion, motivo }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("solicitud_eliminacion").insert({
        tabla,
        registro_id: String(registroId),
        descripcion,
        motivo: motivo.trim(),
        solicitado_por_email: session?.user?.email ?? null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Ya hay una solicitud pendiente para este registro.");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK_SOLICITUDES });
      toast({ title: "Solicitud enviada", description: "El administrador revisará la eliminación." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "No se pudo enviar la solicitud", description: err.message });
    },
  });
}

// Aprobar = ejecutar la misma eliminación que el módulo (eliminarRegistro marca
// la solicitud como aprobada). Si la eliminación falla, la solicitud sigue pendiente.
export function useResolverSolicitud() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ solicitud, accion, nota }) => {
      if (accion === "aprobar") {
        await eliminarRegistro(solicitud.tabla, solicitud.registro_id);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("solicitud_eliminacion")
        .update({
          estado: "rechazada",
          resuelto_por: session?.user?.id ?? null,
          resuelto_at: new Date().toISOString(),
          nota_resolucion: nota?.trim() || null,
        })
        .eq("id", solicitud.id)
        .eq("estado", "pendiente")
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("La solicitud ya no está pendiente.");
    },
    onSuccess: (_, { solicitud, accion }) => {
      invalidarEliminacion(queryClient, solicitud.tabla);
      toast({
        title: accion === "aprobar" ? "Registro eliminado" : "Solicitud rechazada",
        description: solicitud.descripcion,
      });
    },
    onError: (err, { accion }) => {
      toast({
        variant: "destructive",
        title: accion === "aprobar" ? "No se pudo eliminar" : "No se pudo rechazar",
        description: mensajeEliminacion(err),
      });
    },
  });
}
