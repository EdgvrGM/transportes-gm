// Datos de la bitácora de horas de servicio del conductor. Casi todo sale del
// XML de la carta porte; el complemento del SAT NO trae la marca del vehículo
// ni la vigencia de la licencia, así que esos dos se cruzan con los catálogos
// (Camion por placa, Conductor por licencia o nombre).
//
// Puro (sin Supabase ni DOM): también se prueba desde Node.
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { razonSocial } from "./razonesSociales.js";

// Abreviaturas de uso común en México (como se escriben a mano en la bitácora).
const ESTADO_ABREV = {
  AGU: "AGS.", BCN: "B.C.", BCS: "B.C.S.", CAM: "CAMP.", COA: "COAH.", COL: "COL.", CHP: "CHIS.",
  CHH: "CHIH.", CMX: "CDMX", DIF: "CDMX", DUR: "DGO.", GUA: "GTO.", GRO: "GRO.", HID: "HGO.",
  JAL: "JAL.", MEX: "MEX.", MIC: "MICH.", MOR: "MOR.", NAY: "NAY.", NLE: "N.L.", OAX: "OAX.",
  PUE: "PUE.", QUE: "QRO.", ROO: "Q. ROO", SLP: "S.L.P.", SIN: "SIN.", SON: "SON.", TAB: "TAB.",
  TAM: "TAMPS.", TLA: "TLAX.", VER: "VER.", YUC: "YUC.", ZAC: "ZAC.",
};

const TIPO_SERVICIO = {
  TPAF01: "Autotransporte federal carga",
  TPAF02: "Transporte privado de carga",
  TPAF03: "Autotransporte federal carga especializada (materiales peligrosos)",
};

const sinAcentos = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const clave = (s) => sinAcentos(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
const nombreClave = (s) => sinAcentos(s).toUpperCase().replace(/\s+/g, " ").trim();

// "FREIGHTLINER 2012" → "FREIGHTLINER": algunos camiones traen el año en el nombre.
export function marcaDeCamion(nombre) {
  return (nombre || "").replace(/\s+(19|20)\d{2}$/, "").trim().toUpperCase();
}

// La licencia del XML y la del catálogo no siempre coinciden (guiones, "N/A",
// un dígito de más o de menos), así que si no hay match exacto se busca por nombre.
export function buscarConductor(conductores, { licencia, nombre }) {
  const lic = clave(licencia);
  if (lic.length >= 5) {
    const porLicencia = conductores.find((c) => clave(c.licencia) === lic);
    if (porLicencia) return porLicencia;
  }
  const nom = nombreClave(nombre);
  return conductores.find((c) => nombreClave(c.nombre) === nom) || null;
}

// "MARIA DE LA LUZ MONTELONGO ESTRADA" → "MARIA DE LA LUZ MONTELONGO E" (como en la firma).
export function nombreFirma(nombre) {
  const p = sinAcentos(nombre).toUpperCase().trim().split(/\s+/).filter(Boolean);
  if (p.length < 3) return p.join(" ");
  return `${p.slice(0, -1).join(" ")} ${p.at(-1)[0]}`;
}

function lugar(ubicacion, municipios) {
  const d = ubicacion?.domicilio;
  if (!d) return "";
  const municipio = municipios?.[d.estado]?.[d.municipio] || "";
  return sinAcentos(municipio).toUpperCase();
}

// "MANZANILLO – QUERETARO, QRO." (con escalas: "A – B – C, EDO.").
export function rutaBitacora(ubicaciones, municipios) {
  const origen = ubicaciones.find((u) => u.tipo === "Origen");
  const destinos = ubicaciones.filter((u) => u.tipo === "Destino");
  const puntos = [origen, ...destinos].map((u) => lugar(u, municipios)).filter(Boolean);
  if (!puntos.length) return "";
  const estadoFinal = destinos.at(-1)?.domicilio?.estado;
  const abrev = ESTADO_ABREV[estadoFinal];
  return puntos.join(" – ") + (abrev ? `, ${abrev}` : "");
}

function fechaLarga(s) {
  if (!s) return "";
  try {
    return format(parseISO(s), "dd 'de' MMMM yyyy", { locale: es });
  } catch {
    return s;
  }
}

function fechaVigencia(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}-${m}-${y}` : s;
}

// `faltantes` lista lo que no se pudo llenar, para avisar al usuario: esas
// casillas salen en blanco y se escriben a mano.
export function datosBitacora(datos, { camiones = [], conductores = [], municipios = {} } = {}) {
  const cp = datos.cartaPorte;
  const at = cp.autotransporte;
  const operador = cp.figuras.find((f) => f.tipo === "01");
  const propietario = cp.figuras.find((f) => f.tipo === "02");
  const rs = razonSocial(datos.emisor.rfc, datos.emisor.nombre);

  const camion = camiones.find((c) => clave(c.placas) === clave(at?.placa));
  const conductor = operador ? buscarConductor(conductores, { licencia: operador.licencia, nombre: operador.nombre }) : null;

  const campos = {
    empresa: "TRANSPORTES GM",
    giro: "SERVICIO DE TRANSPORTE DE CARGA EN GENERAL",
    razonSocial: sinAcentos(datos.emisor.nombre).toUpperCase(),
    domicilioEncabezado: rs.domicilio,
    telefonos: rs.telefonos,
    fecha: fechaLarga(cp.ubicaciones.find((u) => u.tipo === "Origen")?.fechaHora || datos.fecha),
    permisionario: propietario?.nombre || datos.emisor.nombre,
    domicilioPermisionario: rs.domicilioCorto,
    tipoServicio: TIPO_SERVICIO[at?.permSCT] || "Autotransporte federal carga",
    modalidad: "Carga",
    marca: camion ? marcaDeCamion(camion.nombre) : "",
    modelo: at?.anio || "",
    placas: at?.placa || "",
    conductor: (operador?.nombre || "").toUpperCase(),
    licencia: operador?.licencia || "",
    vigencia: fechaVigencia(conductor?.venc_licencia),
    ruta: rutaBitacora(cp.ubicaciones, municipios),
    firmaResponsable: nombreFirma(datos.emisor.nombre),
    firmaConductor: nombreFirma(operador?.nombre),
  };

  const faltantes = [];
  if (!campos.marca) faltantes.push(`marca del camión ${campos.placas || ""} (no está en el catálogo de Camiones)`.trim());
  if (!campos.vigencia) {
    faltantes.push(
      conductor
        ? `vigencia de licencia de ${conductor.nombre.trim()} (captúrala en Documentación Legal)`
        : `vigencia de licencia (${campos.conductor || "operador"} no está en el catálogo de Conductores)`,
    );
  }
  if (!campos.domicilioEncabezado) faltantes.push(`domicilio de ${datos.emisor.nombre} (razón social no configurada)`);
  if (!campos.ruta) faltantes.push("origen-destino");

  return { campos, faltantes };
}
