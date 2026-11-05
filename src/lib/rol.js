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

// Rol del usuario interno: "admin" | "operativo". Sin fila en perfil_usuario
// (o si falla la consulta) es operativo: menor privilegio por defecto.
export async function getRolInterno() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("perfil_usuario")
    .select("rol")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) return "operativo";
  return data?.rol ?? "operativo";
}
