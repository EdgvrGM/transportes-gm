// Edge Function: gestión de cuentas espejo de cliente (solo usuarios internos).
// Acciones: list | create | update-unidades | set-activo | reset-password
//
// Seguridad: valida el JWT del que llama y exige que sea un usuario INTERNO
// (autenticado y SIN fila en cuenta_cliente). Usa service_role para crear/editar.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  // 1) Autenticar al que llama
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "No autenticado" }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Sesión inválida" }, 401);
  const caller = userData.user;

  // 2) Exigir que sea interno (no cliente)
  const { data: esCliente } = await admin
    .from("cuenta_cliente").select("id").eq("user_id", caller.id).maybeSingle();
  if (esCliente) return json({ error: "Sin permiso" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Body inválido" }, 400); }
  const action = body.action as string;

  try {
    if (action === "list") {
      const { data: cuentas, error } = await admin
        .from("cuenta_cliente")
        .select("id, user_id, nombre, cliente_id, historial_desde, activo, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: unidades } = await admin
        .from("cuenta_cliente_unidad")
        .select("cuenta_id, wialon_unit_id, wialon_nombre");

      // adjuntar email de cada cuenta + sus unidades
      const result = [];
      for (const c of cuentas ?? []) {
        const { data: u } = await admin.auth.admin.getUserById(c.user_id as string);
        result.push({
          ...c,
          email: u?.user?.email ?? null,
          unidades: (unidades ?? []).filter((x) => x.cuenta_id === c.id),
        });
      }
      return json({ cuentas: result });
    }

    if (action === "create") {
      const { email, password, nombre, cliente_id, unidades } = body as {
        email: string; password: string; nombre: string;
        cliente_id?: string | null; unidades?: { wialon_unit_id: number; wialon_nombre?: string }[];
      };
      if (!email || !password || !nombre) return json({ error: "Faltan datos" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "No se pudo crear el usuario" }, 400);

      const { data: cuenta, error: cuentaErr } = await admin
        .from("cuenta_cliente")
        .insert({ user_id: created.user.id, nombre, cliente_id: cliente_id ?? null })
        .select("id")
        .single();
      if (cuentaErr) {
        // rollback del usuario auth si falla la fila
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: cuentaErr.message }, 400);
      }

      if (unidades && unidades.length > 0) {
        await admin.from("cuenta_cliente_unidad").insert(
          unidades.map((u) => ({
            cuenta_id: cuenta.id,
            wialon_unit_id: u.wialon_unit_id,
            wialon_nombre: u.wialon_nombre ?? null,
          }))
        );
      }
      return json({ ok: true, cuenta_id: cuenta.id });
    }

    if (action === "update-unidades") {
      const { cuenta_id, unidades } = body as {
        cuenta_id: string; unidades: { wialon_unit_id: number; wialon_nombre?: string }[];
      };
      if (!cuenta_id) return json({ error: "Falta cuenta_id" }, 400);
      await admin.from("cuenta_cliente_unidad").delete().eq("cuenta_id", cuenta_id);
      if (unidades && unidades.length > 0) {
        await admin.from("cuenta_cliente_unidad").insert(
          unidades.map((u) => ({
            cuenta_id,
            wialon_unit_id: u.wialon_unit_id,
            wialon_nombre: u.wialon_nombre ?? null,
          }))
        );
      }
      return json({ ok: true });
    }

    if (action === "set-activo") {
      const { cuenta_id, activo } = body as { cuenta_id: string; activo: boolean };
      if (!cuenta_id) return json({ error: "Falta cuenta_id" }, 400);
      const { error } = await admin.from("cuenta_cliente").update({ activo }).eq("id", cuenta_id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "reset-password") {
      const { cuenta_id, password } = body as { cuenta_id: string; password: string };
      if (!cuenta_id || !password) return json({ error: "Faltan datos" }, 400);
      const { data: cuenta } = await admin
        .from("cuenta_cliente").select("user_id").eq("id", cuenta_id).single();
      if (!cuenta) return json({ error: "Cuenta no encontrada" }, 404);
      const { error } = await admin.auth.admin.updateUserById(cuenta.user_id as string, { password });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
