import { supabase } from "@/supabaseClient";

// Drop-in para fetch() en llamadas al proxy GPS de Wialon.
// El proxy ya no es público: exige el JWT del usuario interno autenticado.
// Adjunta el access_token de la sesión Supabase actual como Bearer.
//
// Las páginas PÚBLICAS de rastreo (/rastreo/:token, /historial/:token) NO usan
// este helper: se autorizan con el query param ?token=<hex> y usan fetch normal.
export async function wialonFetch(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return fetch(url, { ...options, headers });
}
