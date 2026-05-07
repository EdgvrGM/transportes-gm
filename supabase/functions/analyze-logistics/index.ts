import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const auditData = body.auditData;
  const userQuestion = body.userQuestion;
  const fechaHoy = body.fechaActual || "Desconocida";
  const diaHoy = body.diaSemana || "Desconocido";

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY no configurada" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const prompt =
    `Eres el Experto en Logística de Transportes GM. HOY ES ${diaHoy} ${fechaHoy}.\n\n` +
    "REGLAS DE CALENDARIO:\n" +
    "1. Las semanas en Transportes GM son de LUNES A SÁBADO.\n" +
    "2. Si el usuario dice 'semana pasada', calcula el rango del lunes al sábado anterior a esta semana.\n" +
    "3. IGNORA TOTALMENTE cualquier dato o viaje anterior al 24 de abril de 2026 (datos archivados).\n\n" +
    "REGLAS DE ANÁLISIS:\n" +
    "1. PROHIBIDO USAR IDs técnicos. Usa Fecha, Conductor y Unidad.\n" +
    "2. km_por_litro < 2.0 CRÍTICO, 2.0-2.2 regular, > 2.2 bueno.\n" +
    "3. combustible_registrado = false significa sin registro.\n" +
    "4. Responde en español con emojis.\n\n" +
    "DATOS DISPONIBLES:\n" +
    JSON.stringify(auditData) +
    "\n\nPREGUNTA DEL USUARIO: " +
    userQuestion;

  let geminiRes;
  try {
    geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  } catch (fetchErr) {
    return new Response(JSON.stringify({ error: "Error de red: " + fetchErr.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const result = await geminiRes.json();

  if (!geminiRes.ok) {
    return new Response(JSON.stringify({ error: "Gemini error", details: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const parts = result?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("") || "Sin respuesta.";

  return new Response(JSON.stringify({ text }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
