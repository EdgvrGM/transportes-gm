// Lectura de los datos de la licencia y del apto médico desde el TEXTO de sus
// PDF oficiales (sin IA ni OCR): la SICT y Medicina Preventiva los generan
// digitales, con el texto adentro. Una foto o escaneo no trae texto → no se lee
// nada y los campos se llenan a mano, como antes.
//
// Funciones puras sobre el texto ya extraído (ver textoPDF.js): se prueban en
// Node con los PDF reales.

const DD_MM_AAAA_GUION = /(\d{2})-(\d{2})-(\d{4})/;
const DD_MM_AAAA_DIAG = /(\d{2})\/(\d{2})\/(\d{4})/g;

const aISO = (d, m, a) => `${a}-${m}-${d}`;
const limpiar = (t) => (t || "").replace(/\s+/g, " ").trim();

function sumarAnios(iso, anios) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${String(a + anios).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// "Constancia de Expedición de Licencia Federal Digital de Conductor" (SICT).
//   Número de Licencia: COL0003839
//   Vigencia de la Licencia: 03-03-2026 - 03-03-2030
export function extraerLicencia(textoCrudo) {
  const t = limpiar(textoCrudo);
  if (!/LICENCIA FEDERAL/i.test(t) || !/N[uú]mero de Licencia/i.test(t)) return null;

  const numero = t.match(/N[uú]mero de Licencia:?\s*([A-Z0-9][A-Z0-9-]{4,})/i)?.[1]?.toUpperCase() || "";
  const vig = t.match(/Vigencia de la Licencia:?\s*(\d{2}-\d{2}-\d{4})\s*-\s*(\d{2}-\d{2}-\d{4})/i);
  const hasta = vig ? aISO(...vig[2].match(DD_MM_AAAA_GUION).slice(1)) : "";
  const nombre = t.match(/DE CONDUCTOR\s+(.+?)\s+Fecha y hora/i)?.[1] || "";
  const categoria = t.match(/Categor[ií]a:?\s*([A-Z](?:\s*,\s*[A-Z])*)/i)?.[1]?.replace(/\s+/g, "") || "";
  const curp = t.match(/CURP:?\s*([A-Z]{4}\d{6}[A-Z0-9]{8})/i)?.[1] || "";

  return { tipo: "licencia", numero, vence: hasta, nombre: limpiar(nombre), categoria, curp };
}

// "Constancia de Aptitud Psicofísica" (DGPMPT). El recuadro VIGENTE trae
//   DE: 25/02/2026   A: 25/02/2028
// En el texto las etiquetas salen antes que las fechas ("DE: A: 25/02/2026
// 25/02/2028"), así que se toman las dos primeras fechas después de "DE:" y la
// mayor es el vencimiento. Si no aparecen, fecha del examen + 2 años (la
// periodicidad que marca el mismo documento).
export function extraerApto(textoCrudo) {
  const t = limpiar(textoCrudo);
  if (!/APTITUD PSICOF[IÍ]SICA/i.test(t)) return null;

  let vence = "";
  const iDe = t.search(/\bDE:/);
  if (iDe >= 0) {
    const fechas = [...t.slice(iDe, iDe + 120).matchAll(DD_MM_AAAA_DIAG)].slice(0, 2).map((m) => aISO(m[1], m[2], m[3]));
    if (fechas.length) vence = fechas.sort().at(-1);
  }
  const examen = t.match(/(\d{4}-\d{2}-\d{2})\s*Fecha del exam/i)?.[1] || t.match(/Fecha del exam[eé]n:?\s*(\d{4}-\d{2}-\d{2})/i)?.[1] || "";
  const calculada = !vence && Boolean(examen);
  if (calculada) vence = sumarAnios(examen, 2);

  // "N O  A P T O" / "NO APTO" antes que "A P T O": el primero contiene al segundo.
  const dictamen = /\bN\s?O\s+A\s?P\s?T\s?O\b/.test(t) ? "NO APTO" : /\bA\s?P\s?T\s?O\b/.test(t) ? "APTO" : "";
  const nombre = t.match(/\bA\s?P\s?T\s?O\s+(.+?)\s+Usa Lentes/i)?.[1] || "";
  const curp = t.match(/\b([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)\b/)?.[1] || "";

  return { tipo: "apto", vence, examen, calculada, dictamen, nombre: limpiar(nombre), curp };
}

const tokens = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((p) => p.length > 2);

// El documento es de este operador si comparten al menos dos palabras del
// nombre ("SERGIO HERNANDEZ CHAVEZ" ↔ "Sergio Hernandez Chavez"). Tolera
// segundos nombres o apellidos faltantes en el catálogo.
export function nombresCoinciden(a, b) {
  const tb = new Set(tokens(b));
  return tokens(a).filter((p) => tb.has(p)).length >= 2;
}
