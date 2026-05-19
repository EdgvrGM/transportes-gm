// Edge Function: wialon-proxy
// FASE 1 — modo MOCK. No se conecta a Wialon real todavía.
// Cuando llegue el token, cambiar USE_MOCK a false (Fase 3).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const USE_MOCK = true; // ← Fase 3 cambiará esto a false

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Unidades simuladas con base en Colima/Manzanillo
const MOCK_UNITS = [
  { id: 1001, nombre: "ECO-01 Kenworth T680",  lat: 19.0536, lng: -104.3158 },
  { id: 1002, nombre: "ECO-02 Freightliner",   lat: 19.2433, lng: -103.7250 },
  { id: 1003, nombre: "ECO-03 International",   lat: 19.7060, lng: -103.4610 },
  { id: 1004, nombre: "ECO-04 Volvo VNL",      lat: 20.6597, lng: -103.3496 },
  { id: 1005, nombre: "ECO-05 Kenworth T880",  lat: 19.0414, lng: -104.3000 },
];

function getMockPositions() {
  const now = Date.now();
  return MOCK_UNITS.map((u, i) => {
    const t = (now / 1000 + i * 50) * 0.05;
    const speed = Math.round(40 + Math.abs(Math.sin(t)) * 50);
    return {
      id: u.id,
      nombre: u.nombre,
      lat: u.lat + Math.sin(t) * 0.02,
      lng: u.lng + Math.cos(t) * 0.02,
      velocidad: speed,
      rumbo: Math.round((Math.sin(t) + 1) * 180),
      motor: speed > 5,
      ultima_actualizacion: new Date().toISOString(),
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "positions";

  try {
    if (USE_MOCK) {
      if (action === "units") {
        return new Response(JSON.stringify(MOCK_UNITS), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "history") {
        const unitId = parseInt(url.searchParams.get("unit") || "1001");
        const fromTs = parseInt(url.searchParams.get("from") || "0") * 1000;
        const toTs   = parseInt(url.searchParams.get("to")   || "0") * 1000 || Date.now();

        const unitBases: Record<number, { lat: number; lng: number; nombre: string }> = {
          1001: { lat: 19.0536, lng: -104.3158, nombre: "ECO-01 Kenworth T680" },
          1002: { lat: 19.2433, lng: -103.7250, nombre: "ECO-02 Freightliner" },
          1003: { lat: 19.7060, lng: -103.4610, nombre: "ECO-03 International" },
          1004: { lat: 20.6597, lng: -103.3496, nombre: "ECO-04 Volvo VNL" },
          1005: { lat: 19.0414, lng: -104.3000, nombre: "ECO-05 Kenworth T880" },
        };

        const base = unitBases[unitId] ?? unitBases[1001];
        const durMs = toTs - fromTs;
        const POINTS = 60;
        const points = [];

        for (let i = 0; i < POINTS; i++) {
          const t = i / POINTS;
          const angle = t * Math.PI * 4 + (unitId * 0.5);
          const speed = Math.round(40 + Math.abs(Math.sin(angle)) * 60);
          points.push({
            lat: base.lat + Math.sin(angle) * 0.08 + t * 0.05,
            lng: base.lng + Math.cos(angle) * 0.08 + t * 0.05,
            velocidad: speed,
            rumbo: Math.round(((angle * 180) / Math.PI) % 360),
            motor: speed > 5,
            timestamp: new Date(fromTs + durMs * t).toISOString(),
          });
        }

        return new Response(
          JSON.stringify({ unit_id: unitId, nombre: base.nombre, points }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // action === "positions"
      return new Response(JSON.stringify(getMockPositions()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fase 3: aquí irá la conexión real a Wialon ──
    // const token = Deno.env.get("WIALON_TOKEN");
    // ... login a Wialon, fetch unidades/posiciones ...

    return new Response(JSON.stringify({ error: "Wialon real no configurado" }), {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
