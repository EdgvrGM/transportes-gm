// Genera src/components/cartaporte/municipiosSat.json desde el catálogo
// geoestadístico de INEGI. El XML de Carta Porte trae el municipio como clave
// ("007") y el estado como clave SAT ("COL"); el SAT usa las mismas claves de
// municipio que INEGI, así que con esto el PDF muestra "Manzanillo, Colima".
//
// Uso: node scripts/generar-municipios-sat.mjs
// Sólo hay que volver a correrlo si INEGI crea municipios nuevos.

import { writeFile } from "node:fs/promises";

// Clave SAT (c_Estado) → clave INEGI de entidad.
const ESTADOS = {
  AGU: "01", BCN: "02", BCS: "03", CAM: "04", COA: "05", COL: "06", CHP: "07", CHH: "08",
  CMX: "09", DUR: "10", GUA: "11", GRO: "12", HID: "13", JAL: "14", MEX: "15", MIC: "16",
  MOR: "17", NAY: "18", NLE: "19", OAX: "20", PUE: "21", QUE: "22", ROO: "23", SLP: "24",
  SIN: "25", SON: "26", TAB: "27", TAM: "28", TLA: "29", VER: "30", YUC: "31", ZAC: "32",
};

const salida = {};
for (const [sat, inegi] of Object.entries(ESTADOS)) {
  const res = await fetch(`https://gaia.inegi.org.mx/wscatgeo/v2/mgem/${inegi}`);
  if (!res.ok) throw new Error(`INEGI ${inegi}: HTTP ${res.status}`);
  const { datos } = await res.json();
  if (!datos?.length) throw new Error(`INEGI ${inegi}: sin municipios`);
  salida[sat] = Object.fromEntries(datos.map((m) => [m.cve_mun, m.nomgeo]));
  console.log(sat, datos.length);
}

const destino = new URL("../src/components/cartaporte/municipiosSat.json", import.meta.url);
await writeFile(destino, JSON.stringify(salida));
console.log("OK →", destino.pathname);
