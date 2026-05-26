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
    `Eres el Auditor Maestro de Transportes GM. HOY ES ${diaHoy} ${fechaHoy}.\n\n` +
    "REGLAS DE IDENTIDAD Y CALENDARIO:\n" +
    "1. Tienes acceso a dos bloques: ejecución (viajes ya cargados con combustible/casetas/rendimiento) y planeación (programa de cargas con cliente, destino, modalidad, estado_registro y remisiones de cada viaje).\n" +
    "2. Las semanas son de LUNES A SÁBADO.\n" +
    "3. Si el usuario pide una 'comparativa' o pregunta por un cliente específico (ej. SOLAREVER), filtra los datos y genera un CUADRO COMPARATIVO usando TABLAS DE MARKDOWN.\n" +
    "4. IGNORA TOTALMENTE cualquier dato o viaje anterior al 24 de abril de 2026.\n" +
    "5. Cada viaje de planeación trae `remisiones: { total, entregadas, pendientes, estado }`. Cuando el usuario pregunte por remisiones, entregas o evidencia, usa esos campos directamente; el resumen del periodo trae el total agregado en `resumen.remisiones`.\n\n" +
    "REGLAS DE ANÁLISIS Y ERRORES:\n" +
    "1. Si el usuario pregunta por un cliente que NO aparece en los datos, responde: 'No veo viajes de [Cliente] en los datos cargados. Veo viajes para: [Lista de clientes únicos que sí aparecen]'.\n" +
    "2. km_por_litro < 2.0 CRÍTICO, 2.0-2.2 regular, > 2.2 bueno.\n" +
    "3. Identifica viajes por Fecha, Conductor y Unidad. NUNCA uses IDs técnicos.\n" +
    "4. Responde en español con un tono experto, analítico y profesional.\n\n" +
    "DATOS DISPONIBLES (Contexto 30 días):\n" +
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
