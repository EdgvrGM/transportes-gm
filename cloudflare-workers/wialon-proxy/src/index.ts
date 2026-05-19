const WIALON_HOST = "https://hst-api.wialon.com/wialon/ajax.html";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Mock data (fallback) ──────────────────────────────────────────────────────
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

// ── Helper POST a Wialon ──────────────────────────────────────────────────────
async function wialonPost(svc: string, params: Record<string, unknown>, sid?: string): Promise<Record<string, unknown>> {
  let body = `svc=${svc}&params=${encodeURIComponent(JSON.stringify(params))}`;
  if (sid) body += `&sid=${sid}`;
  const res = await fetch(WIALON_HOST, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json() as Record<string, unknown>;
  return data;
}

// ── Wialon helpers ────────────────────────────────────────────────────────────
async function wialonLogin(token: string): Promise<string> {
  const data = await wialonPost("token/login", { token, fl: 1 });
  console.log("Wialon login response:", JSON.stringify(data));
  if (data.error) throw new Error(`Wialon login error: ${data.error}`);
  return data.eid as string;
}

async function wialonGetUnitsBasic(eid: string) {
  const data = await wialonPost("core/search_items", {
    spec: {
      itemsType: "avl_unit",
      propName: "sys_name",
      propValueMask: "*",
      sortType: "sys_name",
    },
    force: 1,
    flags: 1 | 1024, // 1 (nombre/id) + 1024 (última posición en item.pos)
    from: 0,
    to: 0,
  }, eid);
  if (data.error) throw new Error(`Wialon search error: ${data.error}`);
  const items = (data.items as Record<string, unknown>[]) || [];
  if (items.length > 0) {
    console.log("Item crudo Wialon:", JSON.stringify(items[0]));
  }
  return items;
}

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
      ? new Date(pos.t * 1000).toISOString()
      : new Date().toISOString(),
  };
}

async function wialonGetHistory(eid: string, unitId: string, from: number, to: number) {
  const data = await wialonPost("messages/load_interval", {
    itemId: parseInt(unitId),
    timeFrom: from,
    timeTo: to,
    flags: 0x0001,
    flagsMask: 0xFF00,
    loadCount: 0xFFFFFFFF,
  }, eid);
  if (data.error) throw new Error(`Wialon history error: ${data.error}`);

  const unitData = await wialonPost("core/search_item", {
    id: parseInt(unitId), flags: 1,
  }, eid);
  const nombre = (unitData.item as Record<string, unknown>)?.nm ?? `Unidad ${unitId}`;

  const messages = (data.messages as Record<string, unknown>[]) || [];
  const points   = messages
    .filter((m) => m.pos)
    .map((m) => {
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

async function wialonLogout(eid: string) {
  await wialonPost("core/logout", {}, eid).catch(() => {});
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url    = new URL(request.url);
    const action = url.searchParams.get("action") || "positions";
    const token  = env.WIALON_TOKEN;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "WIALON_TOKEN no configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let eid: string | null = null;

    try {
      eid = await wialonLogin(token);
      console.log("Login exitoso, eid:", eid);

      if (action === "units") {
        const items = await wialonGetUnitsBasic(eid);
        const units = items.map((item) => ({ id: item.id, nombre: item.nm }));
        return new Response(JSON.stringify(units), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "history") {
        const unitId = url.searchParams.get("unit") || "";
        const from   = parseInt(url.searchParams.get("from") || "0");
        const to     = parseInt(url.searchParams.get("to") || "0") || Math.floor(Date.now() / 1000);
        const data   = await wialonGetHistory(eid, unitId, from, to);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // action: positions (default)
      const items     = await wialonGetUnitsBasic(eid);
      const positions = items.map(parsearPosicion);
      return new Response(JSON.stringify(positions), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (e) {
      console.error("Wialon error:", String(e));
      return new Response(JSON.stringify(getMockPositions()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      if (eid) await wialonLogout(eid);
    }
  },
} satisfies ExportedHandler<Env>;

interface Env {
  WIALON_TOKEN: string;
}
