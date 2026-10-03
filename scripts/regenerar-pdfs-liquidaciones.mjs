// Regenera los PDFs archivados del bucket privado "liquidaciones" desde el
// snapshot `detalle` de la tabla Liquidaciones, con el mismo constructor que usa
// la app (src/components/liquidaciones/pdfLiquidacion.js), y los sube al MISMO
// path. Motivo: los PDFs viejos pesaban ~24 MB por el logo PNG sin comprimir.
//
// Antes de reemplazar nada descarga cada original a un respaldo local. Una fila
// cuyo original no se pudo respaldar NUNCA se sobrescribe.
//
// Uso (desde la raíz del proyecto; requiere service_role porque el bucket y la
// tabla tienen RLS):
//
//   node --env-file=.env.regen scripts/regenerar-pdfs-liquidaciones.mjs            # simulacro
//   node --env-file=.env.regen scripts/regenerar-pdfs-liquidaciones.mjs --aplicar   # sube
//   ... --id=<uuid>   para procesar una sola liquidación
//   ... --respaldo=D:/respaldos   carpeta del respaldo (default: ./backups; ocupa ~24 MB por PDF viejo)
//
// .env.regen:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// El simulacro respalda los originales y deja los PDFs nuevos en
// backups/liquidaciones-<fecha>/nuevos/ para revisarlos, sin subir nada.

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { construirPDFLiquidacion } from "../src/components/liquidaciones/pdfLiquidacion.js";

const BUCKET = "liquidaciones";
const MAX_BYTES_NUEVO = 500 * 1024;
const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const APLICAR = args.includes("--aplicar");
const SOLO_ID = args.find((a) => a.startsWith("--id="))?.slice(5);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const sello = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const BASE_RESPALDO = resolve(args.find((a) => a.startsWith("--respaldo="))?.slice(11) || join(RAIZ, "backups"));
const DIR = join(BASE_RESPALDO, `liquidaciones-${sello}`);
const DIR_ORIG = join(DIR, "originales");
const DIR_NUEVOS = join(DIR, "nuevos");

const logo = new Uint8Array(readFileSync(join(RAIZ, "public", "img", "logo-pdf.jpg")));

function rutaLocal(base, pdfPath) {
  const destino = resolve(base, pdfPath);
  if (!destino.startsWith(base + sep)) throw new Error(`pdf_path fuera del respaldo: ${pdfPath}`);
  mkdirSync(dirname(destino), { recursive: true });
  return destino;
}

// JSONB no conserva el orden de las llaves, y el recibo lista los anticipos en
// el orden de la semana. La semana son 6 días consecutivos: arranca el día
// siguiente al que falta (sin Domingo → Lunes–Sábado; sin Sábado → Domingo–Viernes).
function ordenarAnticipos(anticipos = {}) {
  const dias = Object.keys(anticipos);
  const faltantes = NOMBRES_DIA.filter((d) => !dias.includes(d));
  const inicio = faltantes.length === 1 ? (NOMBRES_DIA.indexOf(faltantes[0]) + 1) % 7 : 1;
  const orden = [...NOMBRES_DIA.slice(inicio), ...NOMBRES_DIA.slice(0, inicio)];
  const rango = (d) => (orden.includes(d) ? orden.indexOf(d) : 99);
  return Object.fromEntries([...dias].sort((a, b) => rango(a) - rango(b)).map((d) => [d, anticipos[d]]));
}

// La "Fecha Emisión" impresa se tomaba al generar el PDF, minutos antes de que
// terminara la subida y se escribiera la fila: created_at/updated_at no la
// reproducen. Se lee del PDF original (texto plano o stream FlateDecode).
function fechaEmisionDelPDF(buf) {
  const s = buf.toString("latin1");
  const patron = /\(Fecha Emisi.n: (\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})\)\s*Tj/;
  const armar = (m) => new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  const directo = s.match(patron);
  if (directo) return armar(directo);
  const re = /<<([\s\S]*?)>>\s*stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    if (!/FlateDecode/.test(m[1]) || /\/Subtype\s*\/Image/.test(m[1])) continue;
    const ini = m.index + m[0].length;
    try {
      const hallado = inflateSync(buf.subarray(ini, s.indexOf("endstream", ini))).toString("latin1").match(patron);
      if (hallado) return armar(hallado);
    } catch { /* stream no inflable: seguir buscando */ }
  }
  return null;
}

function pdfDesdeFila(liq, fechaEmision) {
  const d = liq.detalle;
  const doc = construirPDFLiquidacion({
    logo,
    conductorNombre: liq.conductor_nombre,
    periodoTexto: d.periodo_texto ?? "",
    fechaEmision: fechaEmision ?? new Date(liq.updated_at ?? liq.created_at),
    viajes: d.viajes ?? [],
    conceptosExtras: d.conceptos_extras ?? [],
    gastos: d.gastos ?? [],
    anticipos: ordenarAnticipos(d.anticipos),
    anticiposExtras: d.anticipos_extras ?? [],
    totales: {
      comisiones: Number(liq.total_comisiones) || 0,
      gastos: Number(liq.total_gastos) || 0,
      anticipos: Number(liq.total_anticipos) || 0,
      neto: Number(liq.monto_final) || 0,
    },
  });
  return Buffer.from(doc.output("arraybuffer"));
}

async function leerLiquidaciones() {
  const filas = [];
  const PAGINA = 500;
  for (let desde = 0; ; desde += PAGINA) {
    let q = supabase
      .from("Liquidaciones")
      .select("id, conductor_id, conductor_nombre, fecha_corte, created_at, updated_at, total_comisiones, total_gastos, total_anticipos, monto_final, pdf_path, detalle")
      .not("pdf_path", "is", null)
      .order("fecha_corte", { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (SOLO_ID) q = q.eq("id", SOLO_ID);
    const { data, error } = await q;
    if (error) throw new Error(`No se pudo leer Liquidaciones: ${error.message}`);
    filas.push(...data);
    if (data.length < PAGINA) return filas;
  }
}

const kb = (n) => (n == null ? "-" : `${(n / 1024).toFixed(0)} KB`);

async function main() {
  console.log(APLICAR ? "MODO APLICAR: se sobrescribirán los PDFs en Storage." : "SIMULACRO: no se subirá nada.");
  const filas = await leerLiquidaciones();
  console.log(`${filas.length} liquidaciones con PDF archivado.\nRespaldo en ${DIR}\n`);
  mkdirSync(DIR_ORIG, { recursive: true });
  mkdirSync(DIR_NUEVOS, { recursive: true });

  const manifiesto = [];

  // Fase 1: respaldar original + generar nuevo. Nada se sube aquí.
  for (const liq of filas) {
    const item = { id: liq.id, pdf_path: liq.pdf_path, conductor: liq.conductor_nombre, fecha_corte: liq.fecha_corte, bytes_antes: null, bytes_despues: null, estado: null };
    manifiesto.push(item);

    if (liq.detalle?.origen !== "app") {
      item.estado = "omitida: sin snapshot completo (legacy)";
      continue;
    }

    let blob, error;
    for (let intento = 1; intento <= 3; intento++) {
      ({ data: blob, error } = await supabase.storage.from(BUCKET).download(liq.pdf_path));
      if (!error && blob) break;
      await new Promise((r) => setTimeout(r, 2000 * intento));
    }
    if (error || !blob) {
      const detalle = error?.message || error?.name || error?.originalError?.status || "sin datos";
      item.estado = `omitida: no se pudo respaldar (${detalle})`;
      continue;
    }
    const original = Buffer.from(await blob.arrayBuffer());
    if (original.subarray(0, 5).toString() !== "%PDF-") {
      item.estado = "omitida: el original no parece un PDF";
      continue;
    }
    writeFileSync(rutaLocal(DIR_ORIG, liq.pdf_path), original);
    item.bytes_antes = original.length;

    let nuevo;
    try {
      nuevo = pdfDesdeFila(liq, fechaEmisionDelPDF(original));
    } catch (e) {
      item.estado = `omitida: error al generar (${e.message})`;
      continue;
    }
    writeFileSync(rutaLocal(DIR_NUEVOS, liq.pdf_path), nuevo);
    item.bytes_despues = nuevo.length;
    item.estado = nuevo.length > MAX_BYTES_NUEVO ? `omitida: nuevo PDF excede ${kb(MAX_BYTES_NUEVO)}` : "lista";
    item._buffer = nuevo;
  }

  // Fase 2: subir sólo las que tienen respaldo y PDF nuevo válido.
  if (APLICAR) {
    for (const item of manifiesto.filter((i) => i.estado === "lista")) {
      const { error } = await supabase.storage.from(BUCKET).upload(item.pdf_path, item._buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
      item.estado = error ? `error al subir: ${error.message}` : "reemplazada";
    }
  }

  for (const item of manifiesto) delete item._buffer;
  writeFileSync(join(DIR, "manifiesto.json"), JSON.stringify(manifiesto, null, 2));

  console.table(manifiesto.map((i) => ({ path: i.pdf_path, conductor: i.conductor, antes: kb(i.bytes_antes), despues: kb(i.bytes_despues), estado: i.estado })));

  const conteo = manifiesto.reduce((acc, i) => ({ ...acc, [i.estado.split(":")[0]]: (acc[i.estado.split(":")[0]] || 0) + 1 }), {});
  const antes = manifiesto.reduce((s, i) => s + (i.bytes_antes || 0), 0);
  const despues = manifiesto.reduce((s, i) => s + (i.bytes_despues || 0), 0);
  console.log("\nResumen:", conteo);
  console.log(`Peso de los procesados: ${(antes / 1048576).toFixed(1)} MB → ${(despues / 1048576).toFixed(2)} MB`);
  console.log(`Manifiesto: ${join(DIR, "manifiesto.json")}`);
  if (!APLICAR) console.log("\nSimulacro terminado. Revisa backups/.../nuevos/ y vuelve a correr con --aplicar.");
  if (manifiesto.some((i) => i.estado.startsWith("error"))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
