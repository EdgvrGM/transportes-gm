// Edge Function: rastreo para el Portal de Cliente.
// Devuelve SOLO las unidades asignadas a la cuenta del cliente autenticado.
// Acciones: bootstrap (datos de la cuenta + unidades) | positions | history
//
// El portal nunca llama al proxy Wialon directo: todo pasa por aquí para que
// un cliente no pueda ver el resto de la flota inspeccionando el navegador.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WIALON_PROXY_URL = Deno.env.get("WIALON_PROXY_URL") ?? "https://wialon-proxy.transportesgm.workers.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1) Autenticar
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "No autenticado" }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Sesión inválida" }, 401);

  // 2) Resolver la cuenta de cliente (activa)
  const { data: cuenta } = await admin
    .from("cuenta_cliente")
    .select("id, nombre, historial_desde, activo")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!cuenta) return json({ error: "No es una cuenta de cliente" }, 403);
  if (!cuenta.activo) return json({ error: "Cuenta desactivada" }, 403);

  const { data: unidadesAsignadas } = await admin
    .from("cuenta_cliente_unidad")
    .select("wialon_unit_id, wialon_nombre")
    .eq("cuenta_id", cuenta.id);
  const idsPermitidos = new Set((unidadesAsignadas ?? []).map((u) => String(u.wialon_unit_id)));

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* bootstrap sin body */ }
  const action = (body.action as string) ?? "bootstrap";

  if (action === "bootstrap") {
    return json({
      cuenta: { nombre: cuenta.nombre, historial_desde: cuenta.historial_desde },
      unidades: unidadesAsignadas ?? [],
    });
  }

  if (action === "positions") {
    const res = await fetch(`${WIALON_PROXY_URL}?action=positions`);
    if (!res.ok) return json({ error: "Proxy no disponible" }, 502);
    const all = await res.json();
    const filtradas = (all as Record<string, unknown>[]).filter((u) =>
      idsPermitidos.has(String(u.id))
    );
    return json(filtradas);
  }

  if (action === "history") {
    const unit = String(body.unit ?? "");
    if (!idsPermitidos.has(unit)) return json({ error: "Unidad no autorizada" }, 403);

    // Recortar el rango: nunca antes de la fecha de alta de la cuenta.
    const desdeEpoch = Math.floor(new Date(cuenta.historial_desde as string).getTime() / 1000);
    let from = Math.floor(Number(body.from) || 0);
    const to = Math.floor(Number(body.to) || Math.floor(Date.now() / 1000));
    if (from < desdeEpoch) from = desdeEpoch;

    const res = await fetch(`${WIALON_PROXY_URL}?action=history&unit=${unit}&from=${from}&to=${to}`);
    if (!res.ok) return json({ error: "Proxy no disponible" }, 502);
    return json(await res.json());
  }

  return json({ error: "Acción no reconocida" }, 400);
});
