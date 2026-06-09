import { supabase } from "@/supabaseClient";

// Devuelve la fila de cuenta_cliente del usuario autenticado, o null si es interno.
// La RLS garantiza que solo se devuelve la fila del propio usuario (user_id = auth.uid()).
export async function getCuentaCliente() {
  const { data, error } = await supabase
    .from("cuenta_cliente")
    .select("id, nombre, activo, historial_desde")
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}
