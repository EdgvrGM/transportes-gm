const WIALON_HOST = "https://hst-api.wialon.com/wialon/ajax.html";

const PATIO_LAT      = 18.9350;
const PATIO_LNG      = -103.8899;
const PATIO_RADIO_M  = 70;

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estaEnPatio(lat: number, lng: number): boolean {
  if (lat === 0 && lng === 0) return false;
  return distanciaMetros(lat, lng, PATIO_LAT, PATIO_LNG) <= PATIO_RADIO_M;
}


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
      satelites: 8,
      uri: null,
      odometro: null,
      horas_motor: null,
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
    flags: 1 | 8 | 16 | 1024 | 4096 | 8192, // base + último mensaje + icono + última posición + contadores + sensores
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

async function getAddress(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { "User-Agent": "TransportesGM-ERP/1.0" } }
    );
    const data = await res.json() as Record<string, unknown>;
    return (data.display_name as string) ?? "";
  } catch {
    return "";
  }
}

async function parsearPosicionCompleta(item: Record<string, unknown>, includeAddress = false) {
  const pos      = item.pos  as Record<string, number> | null;
  const sensores = (item.sens as Record<string, Record<string, unknown>>) ?? {};
  const lmsg     = item.lmsg as Record<string, unknown> | null | undefined;
  const params   = (lmsg?.p as Record<string, number>) ?? {};
  const lmsgP    = (lmsg?.p ?? {}) as Record<string, unknown>;

  const sensoresArr = Object.values(sensores).map((s) => ({
    id:     s.id,
    nombre: s.n as string,
    tipo:   s.t as string,
    unidad: s.m as string,
  }));

  let direccion = "";
  if (includeAddress && pos && pos.y !== 0 && pos.x !== 0) {
    direccion = await getAddress(pos.y, pos.x);
  }

  const odometro = typeof item.cnm === "number" ? Math.round(item.cnm) : null;

  // lmsg.p.engine_hours viene en segundos → dividir entre 3600 para horas
  // Fallback: cneh ya viene en horas, sin conversión
  const engineRaw = typeof params.engine_hours === "number" ? params.engine_hours : null;
  const horas_motor = engineRaw != null
    ? parseFloat((engineRaw / 3600).toFixed(2))
    : typeof item.cneh === "number" ? parseFloat(item.cneh.toFixed(2)) : null;

  const sensoresObj    = (item.sens as Record<string, Record<string, unknown>>) ?? {};
  const sensorIgnicion = Object.values(sensoresObj).find((s) => s.t === "engine operation");
  let motorEncendido: boolean;
  if (lmsgP.ign !== undefined) {
    // Queclink — campo ign en lmsg.p (vt del sensor no es confiable)
    motorEncendido = lmsgP.ign === 1;
  } else if (lmsgP.io_239 !== undefined) {
    // Teltonika — campo io_239 en lmsg.p
    motorEncendido = lmsgP.io_239 === 1;
  } else if (sensorIgnicion) {
    // Fallback — sensor procesado por Wialon
    motorEncendido = (sensorIgnicion.vt as number) === 1;
  } else {
    // Último recurso — velocidad
    motorEncendido = (pos?.s ?? 0) > 2;
  }

  return {
    id:        item.id,
    nombre:    item.nm,
    lat:       pos?.y ?? 0,
    lng:       pos?.x ?? 0,
    velocidad: pos?.s ?? 0,
    rumbo:     pos?.c ?? 0,
    motor:     motorEncendido,
    satelites: pos?.sc ?? 0,
    uri:       (item.uri as string) ?? null,
    odometro,
    horas_motor,
    sensores:  sensoresArr,
    direccion,
    ultima_actualizacion: pos?.t ?? Math.floor(Date.now() / 1000),
  };
}

async function wialonGetHistory(eid: string, unitId: string, from: number, to: number) {
  const data = await wialonPost("messages/load_interval", {
    itemId: parseInt(unitId),
    timeFrom: from,
    timeTo: to,
    flags: 0x0000,
    flagsMask: 0xFF00,
    loadCount: 10000,
  }, eid);
  console.log("History response:", JSON.stringify(data).substring(0, 300));
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

const RALENTI_UMBRAL_S = 15 * 60;

// ── Cron: geocerca del patio ──────────────────────────────────────────────────
async function ejecutarGeocerca(env: Env): Promise<void> {
  let eid: string | null = null;
  try {
    eid = await wialonLogin(env.WIALON_TOKEN);
    const items     = await wialonGetUnitsBasic(eid);
    const positions = await Promise.all(
      items.map((item) => parsearPosicionCompleta(item, false))
    );

    for (const unit of positions) {
      const enPatioAhora = estaEnPatio(unit.lat as number, unit.lng as number);
      const kvKey        = `geocerca:${unit.id}`;
      const prevStr      = await env.GEOCERCA_KV.get(kvKey);
      const enPatioPrev  = prevStr === null ? null : prevStr === "true";

      await env.GEOCERCA_KV.put(kvKey, String(enPatioAhora));

      if (enPatioPrev === null) continue;
      if (enPatioAhora === enPatioPrev) continue;

      const tipo = enPatioAhora ? "entrada" : "salida";

      await fetch(`${env.SUPABASE_URL}/rest/v1/EventoGeocerca`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        env.SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify({
          wialon_unit_id:   parseInt(String(unit.id), 10),
          wialon_nombre:    unit.nombre,
          tipo,
          lat:              unit.lat,
          lng:              unit.lng,
          fuera_de_horario: false,
        }),
      });

      console.log(`[Geocerca] ${unit.nombre} → ${tipo}`);
    }
  } catch (err) {
    console.error("[Geocerca cron] error:", String(err));
  } finally {
    if (eid) await wialonLogout(eid);
  }
}

// ── Cron: monitor de ralentí ──────────────────────────────────────────────────
async function ejecutarRalenti(env: Env): Promise<void> {
  let eid: string | null = null;
  try {
    eid = await wialonLogin(env.WIALON_TOKEN);
    const items     = await wialonGetUnitsBasic(eid);
    const positions = await Promise.all(
      items.map((item) => parsearPosicionCompleta(item, false))
    );

    for (const unit of positions) {
      const enRalenti = (unit.motor as boolean) === true &&
                        (unit.velocidad as number) === 0;
      const unitId = parseInt(String(unit.id), 10);
      const nombre = unit.nombre as string;

      if (enRalenti) {
        const getRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/RalentiActivo?wialon_unit_id=eq.${unitId}&select=id,inicio_ralenti,alerta_enviada`,
          {
            headers: {
              "apikey":        env.SUPABASE_SERVICE_KEY,
              "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        if (!getRes.ok) {
          console.error(`[Ralenti] Error leyendo RalentiActivo para ${nombre}: ${getRes.status} ${await getRes.text()}`);
          continue;
        }
        const existing = JSON.parse(await getRes.text()) as { id: number; inicio_ralenti: string; alerta_enviada: boolean }[];

        if (existing.length === 0) {
          const postRes = await fetch(`${env.SUPABASE_URL}/rest/v1/RalentiActivo`, {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              "apikey":        env.SUPABASE_SERVICE_KEY,
              "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              "Prefer":        "return=minimal",
            },
            body: JSON.stringify({
              wialon_unit_id: unitId,
              wialon_nombre:  nombre,
              inicio_ralenti: new Date().toISOString(),
              alerta_enviada: false,
            }),
          });
          if (!postRes.ok) {
            console.error(`[Ralenti] Error creando RalentiActivo para ${nombre}: ${postRes.status} ${await postRes.text()}`);
          } else {
            console.log(`[Ralenti] ${nombre} → inicio de ralentí`);
          }
        } else {
          const registro  = existing[0];
          const inicioMs  = new Date(registro.inicio_ralenti).getTime();
          const duracionS = (Date.now() - inicioMs) / 1000;

          if (duracionS >= RALENTI_UMBRAL_S && !registro.alerta_enviada) {
            const minutos = Math.round(duracionS / 60);
            const alertaRes = await fetch(`${env.SUPABASE_URL}/rest/v1/AlertaGPS`, {
              method: "POST",
              headers: {
                "Content-Type":  "application/json",
                "apikey":        env.SUPABASE_SERVICE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                "Prefer":        "return=minimal",
              },
              body: JSON.stringify({
                tipo:           "ralenti",
                wialon_unit_id: unitId,
                wialon_nombre:  nombre,
                mensaje:        `${nombre} lleva ${minutos} minutos con motor encendido sin moverse`,
                leida:          false,
              }),
            });
            if (!alertaRes.ok) {
              console.error(`[Ralenti] Error insertando alerta para ${nombre}: ${alertaRes.status} ${await alertaRes.text()}`);
            } else {
              await fetch(
                `${env.SUPABASE_URL}/rest/v1/RalentiActivo?wialon_unit_id=eq.${unitId}`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type":  "application/json",
                    "apikey":        env.SUPABASE_SERVICE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    "Prefer":        "return=minimal",
                  },
                  body: JSON.stringify({ alerta_enviada: true }),
                }
              );
              console.log(`[Ralenti] ${nombre} → alerta enviada (${minutos} min)`);
            }
          }
        }
      } else {
        const delRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/RalentiActivo?wialon_unit_id=eq.${unitId}`,
          {
            method: "DELETE",
            headers: {
              "apikey":        env.SUPABASE_SERVICE_KEY,
              "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        if (delRes.status === 204) {
          console.log(`[Ralenti] ${nombre} → fin de ralentí`);
        }
      }
    }
  } catch (err) {
    console.error("[Ralenti cron] error:", String(err));
  } finally {
    if (eid) await wialonLogout(eid);
  }
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

      if (action === "details") {
        const unitId = parseInt(url.searchParams.get("unit") || "0");
        if (!unitId) {
          return new Response(JSON.stringify({ error: "unit requerido" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await wialonPost("core/search_item", {
          id: unitId,
          flags: 1 | 16 | 1024 | 4096 | 8192,
        }, eid);

        const item = data.item as Record<string, unknown>;
        if (!item) {
          return new Response(JSON.stringify({ error: "unidad no encontrada" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const detalle = await parsearPosicionCompleta(item, true);
        return new Response(JSON.stringify(detalle), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // action: positions (default)
      const excludeParam = url.searchParams.get("exclude") || "";
      const excludeIds   = excludeParam
        ? excludeParam.split(",").map(Number)
        : [];

      const items     = await wialonGetUnitsBasic(eid);
      const positions = await Promise.all(
        items
          .filter((item) => !excludeIds.includes(item.id as number))
          .map((item) => parsearPosicionCompleta(item, false))
      );
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

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(Promise.all([
      ejecutarGeocerca(env),
      ejecutarRalenti(env),
    ]));
  },
} satisfies ExportedHandler<Env>;

interface Env {
  WIALON_TOKEN:        string;
  SUPABASE_URL:        string;
  SUPABASE_SERVICE_KEY: string;
  GEOCERCA_KV:         KVNamespace;
}
