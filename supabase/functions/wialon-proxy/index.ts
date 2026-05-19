import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const USE_MOCK = false; // ← Fase 3: conectado a Wialon real

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WIALON_HOST = "https://hosting.wialon.com/wialon/ajax.html";

// ── Mock data (fallback si Wialon falla) ─────────────────────────────────────
const MOCK_UNITS = [
  { id: 1001, nombre: "ECO-01 Kenworth T680",  lat: 19.0536, lng: -104.3158 },
  { id: 1002, nombre: "ECO-02 Freightliner",   lat: 19.2433, lng: -103.7250 },
  { id: 1003, nombre: "ECO-03 International",  lat: 19.7060, lng: -103.4610 },
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

// ── Wialon login ─────────────────────────────────────────────────────────────
async function wialonLogin(token: string): Promise<string> {
  const url = `${WIALON_HOST}?svc=core/login&params={"token":"${token}","fl":1}`;
  const res  = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json, text/plain, */*",
    }
  });
  const text = await res.text();
  console.log("Status:", res.status, "URL final:", res.url);
  console.log("Response:", text.substring(0, 300));
  const data = JSON.parse(text);
  if (data.error) throw new Error(`Wialon login error: ${data.error}`);
  return data.eid;
}

// ── Obtener unidades con posición ─────────────────────────────────────────────
async function wialonGetUnits(eid: string) {
  const params = encodeURIComponent(JSON.stringify({
    spec: {
      itemsType: "avl_unit",
      propName: "sys_name",
      propValueMask: "*",
      sortType: "sys_name",
    },
    force: 1,
    flags: 1 | 256 | 4096,
    from: 0,
    to: 0,
  }));
  const url = `${WIALON_HOST}?svc=core/search_items&params=${params}&sid=${eid}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Wialon search error: ${data.error}`);
  return data.items || [];
}

// ── Parsear posición de una unidad ────────────────────────────────────────────
function parsearPosicion(item: Record<string, unknown>) {
  const pos = item.pos as Record<string, number> | null;
  return {
    id:     item.id,
    nombre: item.nm,
    lat:    pos?.y ?? 0,
    lng:    pos?.x ?? 0,
    velocidad: pos?.s ?? 0,
    rumbo:     pos?.c ?? 0,
    motor:     (pos?.s ?? 0) > 2,
    ultima_actualizacion: pos?.t
      ? new Date((pos.t as number) * 1000).toISOString()
      : new Date().toISOString(),
  };
}

// ── Historial de posiciones ───────────────────────────────────────────────────
async function wialonGetHistory(eid: string, unitId: string, from: number, to: number) {
  const params = encodeURIComponent(JSON.stringify({
    itemId: parseInt(unitId),
    timeFrom: from,
    timeTo: to,
    flags: 0x0001,
    flagsMask: 0xFF00,
    loadCount: 0xFFFFFFFF,
  }));
  const url = `${WIALON_HOST}?svc=messages/load_interval&params=${params}&sid=${eid}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Wialon history error: ${data.error}`);

  const unitsParams = encodeURIComponent(JSON.stringify({
    id: parseInt(unitId), flags: 1,
  }));
  const unitsRes  = await fetch(`${WIALON_HOST}?svc=core/search_item&params=${unitsParams}&sid=${eid}`);
  const unitsData = await unitsRes.json();
  const nombre    = unitsData.item?.nm ?? `Unidad ${unitId}`;

  const messages = data.messages || [];
  const points   = messages
    .filter((m: Record<string, unknown>) => m.pos)
    .map((m: Record<string, unknown>) => {
      const pos = m.pos as Record<string, number>;
      return {
        lat:       pos.y,
        lng:       pos.x,
        velocidad: pos.s ?? 0,
        rumbo:     pos.c ?? 0,
        motor:     (pos.s ?? 0) > 2,
        timestamp: new Date((m.t as number) * 1000).toISOString(),
      };
    });

  return { unit_id: parseInt(unitId), nombre, points };
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function wialonLogout(eid: string) {
  await fetch(`${WIALON_HOST}?svc=core/logout&params={}&sid=${eid}`).catch(() => {});
}

// ── Handler principal ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url    = new URL(req.url);
  const action = url.searchParams.get("action") || "positions";

  // ── MOCK mode ──
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
      const base   = MOCK_UNITS.find((u) => u.id === unitId) ?? MOCK_UNITS[0];
      const durMs  = toTs - fromTs;
      const POINTS = 60;
      const points = [];
      for (let i = 0; i < POINTS; i++) {
        const t     = i / POINTS;
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
    return new Response(JSON.stringify(getMockPositions()), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── REAL mode ──
  const token = Deno.env.get("WIALON_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "WIALON_TOKEN no configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let eid: string | null = null;

  try {
    eid = await wialonLogin(token);
    console.log("Wialon login exitoso, eid:", eid);

    if (action === "units") {
      const items = await wialonGetUnits(eid);
      const units = items.map((item: Record<string, unknown>) => ({
        id:     item.id,
        nombre: item.nm,
      }));
      return new Response(JSON.stringify(units), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "history") {
      const unitId = url.searchParams.get("unit") || "";
      const from   = parseInt(url.searchParams.get("from") || "0");
      const to     = parseInt(url.searchParams.get("to")   || "0") || Math.floor(Date.now() / 1000);
      const data   = await wialonGetHistory(eid, unitId, from, to);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action: positions (default)
    const items     = await wialonGetUnits(eid);
    const positions = items.map(parsearPosicion);
    return new Response(JSON.stringify(positions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Wialon error:", e);
    console.warn("Fallback a mock data");
    return new Response(JSON.stringify(getMockPositions()), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    if (eid) await wialonLogout(eid);
  }
});
