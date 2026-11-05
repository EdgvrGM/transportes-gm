import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { getRolInterno } from "@/lib/rol";

// Mientras carga, esAdmin = false: nunca se muestra "Eliminar" de más.
export function useRol() {
  const queryClient = useQueryClient();
  const { data: rol, isLoading } = useQuery({
    queryKey: ["rol"],
    queryFn: getRolInterno,
    staleTime: 5 * 60 * 1000,
  });

  // La caché sobrevive al logout (SPA): al cambiar de cuenta hay que releer el rol.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") {
        queryClient.invalidateQueries({ queryKey: ["rol"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { rol, esAdmin: rol === "admin", cargando: isLoading };
}
