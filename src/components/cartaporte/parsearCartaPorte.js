// Lee el XML de una factura de flete (CFDI 4.0 + complemento Carta Porte 3.x)
// y devuelve sólo lo que va en la carta porte impresa.
//
// A propósito NO se leen importes: ni SubTotal/Total/impuestos del CFDI, ni
// ValorMercancia, ni PrimaSeguro. La carta porte la lleva el operador y no debe
// mostrar lo que se cobró — si un dato no sale de aquí, el PDF no puede
// imprimirlo por error.
//
// Función pura sobre el texto del XML; el DOMParser se inyecta para poder
// probarla en Node.

export class ErrorCartaPorte extends Error {}

function hijos(nodo, nombre) {
  const out = [];
  if (!nodo) return out;
  for (let n = nodo.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n.localName || n.nodeName.split(":").pop()) === nombre) out.push(n);
  }
  return out;
}

const hijo = (nodo, nombre) => hijos(nodo, nombre)[0] || null;

function buscar(nodo, nombre) {
  if (!nodo) return null;
  for (let n = nodo.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    if ((n.localName || n.nodeName.split(":").pop()) === nombre) return n;
    const r = buscar(n, nombre);
    if (r) return r;
  }
  return null;
}

const a = (nodo, attr) => (nodo?.getAttribute(attr) || "").trim();

function domicilio(nodo) {
  const d = hijo(nodo, "Domicilio");
  if (!d) return null;
  return {
    calle: a(d, "Calle"),
    numExt: a(d, "NumeroExterior"),
    numInt: a(d, "NumeroInterior"),
    colonia: a(d, "Colonia"),
    localidad: a(d, "Localidad"),
    referencia: a(d, "Referencia"),
    municipio: a(d, "Municipio"),
    estado: a(d, "Estado"),
    pais: a(d, "Pais"),
    cp: a(d, "CodigoPostal"),
  };
}

const RE_CONTENEDOR = /\b[A-Z]{4}\d{7}\b/g;

// Referencia del viaje que se captura en el concepto de la factura. Cada quien
// la escribe distinto: "SERV 99156MX", "REM 13404", "rem PT/OUT/00691",
// "REMISION  725", "LCCP 7777  021126" (lo que sigue al número es la fecha).
export const TIPOS_REFERENCIA = {
  servicio: { corto: "Serv.", largo: "No. de servicio", opcion: "Servicio" },
  remision: { corto: "Rem.", largo: "No. de remisión", opcion: "Remisión" },
  lccp: { corto: "L-CCP", largo: "L-CCP", opcion: "L-CCP" },
};

const RE_REFERENCIA =
  /(?<![A-Z0-9])(SERV(?:ICIO)?|REM(?:ISI[OÓ]N)?|L[\s-]?CCP)(?![A-Z0-9])\.?\s*(?:NO\.?|N[UÚ]M\.?|#)?\s*:?\s*([A-Z0-9][A-Z0-9/-]*)/gi;

function tipoDeClave(clave) {
  const c = clave.toUpperCase();
  if (c.startsWith("SERV")) return "servicio";
  if (c.startsWith("REM")) return "remision";
  return "lccp";
}

// Primera coincidencia cuyo valor lleve algún dígito ("SERV DE FLETE" no es referencia).
export function extraerReferencia(texto) {
  for (const m of (texto || "").matchAll(RE_REFERENCIA)) {
    const valor = m[2].replace(/[-/]+$/, "").toUpperCase();
    if (/\d/.test(valor)) return { tipo: tipoDeClave(m[1]), valor };
  }
  return { tipo: null, valor: "" };
}

export function textoReferencia(tipo, valor, forma = "corto") {
  if (!valor) return "";
  const etiqueta = TIPOS_REFERENCIA[tipo]?.[forma];
  return etiqueta ? `${etiqueta} ${valor}` : valor;
}

export function parsearCartaPorte(xmlTexto, DOMParserImpl = globalThis.DOMParser) {
  const dom = new DOMParserImpl().parseFromString(xmlTexto, "application/xml");
  const raiz = dom.documentElement;
  if (!raiz || raiz.nodeName === "parsererror" || dom.getElementsByTagName("parsererror").length) {
    throw new ErrorCartaPorte("El archivo no es un XML válido.");
  }
  if ((raiz.localName || raiz.nodeName.split(":").pop()) !== "Comprobante") {
    throw new ErrorCartaPorte("El XML no es un CFDI (no tiene nodo Comprobante).");
  }

  const complemento = hijo(raiz, "Complemento");
  const tfd = buscar(complemento, "TimbreFiscalDigital");
  const cp = buscar(complemento, "CartaPorte");
  if (!cp) throw new ErrorCartaPorte("Este CFDI no trae complemento Carta Porte.");
  if (!tfd) throw new ErrorCartaPorte("El CFDI no está timbrado (falta el Timbre Fiscal Digital).");

  const emisor = hijo(raiz, "Emisor");
  const receptor = hijo(raiz, "Receptor");
  const descripciones = hijos(hijo(raiz, "Conceptos"), "Concepto").map((c) => a(c, "Descripcion"));
  const textoConceptos = descripciones.join("\n");

  const ubicaciones = hijos(hijo(cp, "Ubicaciones"), "Ubicacion").map((u) => ({
    tipo: a(u, "TipoUbicacion"),
    id: a(u, "IDUbicacion"),
    rfc: a(u, "RFCRemitenteDestinatario"),
    nombre: a(u, "NombreRemitenteDestinatario"),
    numRegIdTrib: a(u, "NumRegIdTrib"),
    residenciaFiscal: a(u, "ResidenciaFiscal"),
    fechaHora: a(u, "FechaHoraSalidaLlegada"),
    distancia: a(u, "DistanciaRecorrida"),
    domicilio: domicilio(u),
  }));

  const mercNodo = hijo(cp, "Mercancias");
  const mercancias = {
    pesoBrutoTotal: a(mercNodo, "PesoBrutoTotal"),
    unidadPeso: a(mercNodo, "UnidadPeso"),
    pesoNetoTotal: a(mercNodo, "PesoNetoTotal"),
    numTotal: a(mercNodo, "NumTotalMercancias"),
    logisticaInversa: a(mercNodo, "LogisticaInversaRecoleccionDevolucion"),
    items: hijos(mercNodo, "Mercancia").map((m) => ({
      bienesTransp: a(m, "BienesTransp"),
      descripcion: a(m, "Descripcion"),
      cantidad: a(m, "Cantidad"),
      claveUnidad: a(m, "ClaveUnidad"),
      unidad: a(m, "Unidad"),
      pesoEnKg: a(m, "PesoEnKg"),
      dimensiones: a(m, "Dimensiones"),
      materialPeligroso: a(m, "MaterialPeligroso"),
      cveMaterialPeligroso: a(m, "CveMaterialPeligroso"),
      embalaje: a(m, "Embalaje"),
      descripEmbalaje: a(m, "DescripEmbalaje"),
      fraccionArancelaria: a(m, "FraccionArancelaria"),
    })),
  };

  const auto = hijo(mercNodo, "Autotransporte");
  const idVeh = hijo(auto, "IdentificacionVehicular");
  const seguros = hijo(auto, "Seguros");
  const autotransporte = auto && {
    permSCT: a(auto, "PermSCT"),
    numPermisoSCT: a(auto, "NumPermisoSCT"),
    configVehicular: a(idVeh, "ConfigVehicular"),
    pesoBrutoVehicular: a(idVeh, "PesoBrutoVehicular"),
    placa: a(idVeh, "PlacaVM"),
    anio: a(idVeh, "AnioModeloVM"),
    seguros: {
      respCivil: a(seguros, "AseguraRespCivil"),
      polizaRespCivil: a(seguros, "PolizaRespCivil"),
      medAmbiente: a(seguros, "AseguraMedAmbiente"),
      polizaMedAmbiente: a(seguros, "PolizaMedAmbiente"),
      carga: a(seguros, "AseguraCarga"),
      polizaCarga: a(seguros, "PolizaCarga"),
    },
    remolques: hijos(hijo(auto, "Remolques"), "Remolque").map((r) => ({
      subtipo: a(r, "SubTipoRem"),
      placa: a(r, "Placa"),
    })),
  };

  const figuras = hijos(hijo(cp, "FiguraTransporte"), "TiposFigura").map((f) => ({
    tipo: a(f, "TipoFigura"),
    rfc: a(f, "RFCFigura"),
    licencia: a(f, "NumLicencia"),
    nombre: a(f, "NombreFigura"),
    numRegIdTrib: a(f, "NumRegIdTrib"),
    residenciaFiscal: a(f, "ResidenciaFiscal"),
    partes: hijos(f, "PartesTransporte").map((p) => a(p, "ParteTransporte")),
    domicilio: domicilio(f),
  }));

  const origen = ubicaciones.find((u) => u.tipo === "Origen");
  const destinos = ubicaciones.filter((u) => u.tipo === "Destino");
  const operador = figuras.find((f) => f.tipo === "01");

  return {
    serie: a(raiz, "Serie"),
    folio: a(raiz, "Folio"),
    fecha: a(raiz, "Fecha"),
    noCertificado: a(raiz, "NoCertificado"),
    lugarExpedicion: a(raiz, "LugarExpedicion"),
    emisor: { rfc: a(emisor, "Rfc"), nombre: a(emisor, "Nombre"), regimen: a(emisor, "RegimenFiscal") },
    receptor: { rfc: a(receptor, "Rfc"), nombre: a(receptor, "Nombre") },
    timbre: {
      uuid: a(tfd, "UUID").toUpperCase(),
      fechaTimbrado: a(tfd, "FechaTimbrado"),
      noCertificadoSAT: a(tfd, "NoCertificadoSAT"),
      rfcProvCertif: a(tfd, "RfcProvCertif"),
      selloCFD: a(tfd, "SelloCFD"),
      selloSAT: a(tfd, "SelloSAT"),
    },
    referencia: extraerReferencia(textoConceptos),
    contenedores: [...new Set(textoConceptos.toUpperCase().match(RE_CONTENEDOR) || [])],
    cartaPorte: {
      version: a(cp, "Version"),
      idCCP: a(cp, "IdCCP"),
      transpInternac: a(cp, "TranspInternac"),
      entradaSalidaMerc: a(cp, "EntradaSalidaMerc"),
      paisOrigenDestino: a(cp, "PaisOrigenDestino"),
      viaEntradaSalida: a(cp, "ViaEntradaSalida"),
      totalDistRec: a(cp, "TotalDistRec"),
      ubicaciones,
      mercancias,
      autotransporte,
      figuras,
    },
    resumen: {
      origen: origen?.nombre || "",
      destino: destinos.at(-1)?.nombre || "",
      fechaSalida: origen?.fechaHora || "",
      fechaLlegada: destinos.at(-1)?.fechaHora || "",
      placas: autotransporte?.placa || "",
      operadorNombre: operador?.nombre || "",
      operadorRfc: operador?.rfc || "",
    },
  };
}

// URL del QR de verificación de la Carta Porte (Guía de llenado CP 3.x). A
// diferencia del QR del CFDI, no lleva el total de la factura.
// Sin URLSearchParams: el SAT publica el formato con los ":" de las fechas sin
// codificar y así lo arma el resto de los emisores.
export function urlVerificacionCCP(datos) {
  return (
    "https://verificacfdi.facturaelectronica.sat.gob.mx/verificaccp/default.aspx" +
    `?&IdCCP=${datos.cartaPorte.idCCP}` +
    `&FechaOrig=${datos.resumen.fechaSalida}` +
    `&FechaTimb=${datos.timbre.fechaTimbrado}`
  );
}

// Fila de la tabla carta_porte (el XML completo va aparte).
export function filaCartaPorte(datos, xml) {
  const n = (v) => v || null;
  return {
    uuid: datos.timbre.uuid,
    id_ccp: n(datos.cartaPorte.idCCP),
    version_cp: n(datos.cartaPorte.version),
    serie: n(datos.serie),
    folio: n(datos.folio),
    fecha_emision: n(datos.fecha),
    referencia_tipo: datos.referencia.valor ? datos.referencia.tipo : null,
    referencia: n(datos.referencia.valor),
    contenedores: n(datos.contenedores.join(", ")),
    emisor_rfc: n(datos.emisor.rfc),
    emisor_nombre: n(datos.emisor.nombre),
    distancia_total: datos.cartaPorte.totalDistRec ? Number(datos.cartaPorte.totalDistRec) : null,
    receptor_nombre: n(datos.receptor.nombre),
    receptor_rfc: n(datos.receptor.rfc),
    origen: n(datos.resumen.origen),
    destino: n(datos.resumen.destino),
    fecha_salida: n(datos.resumen.fechaSalida),
    fecha_llegada: n(datos.resumen.fechaLlegada),
    placas: n(datos.resumen.placas),
    operador_nombre: n(datos.resumen.operadorNombre),
    operador_rfc: n(datos.resumen.operadorRfc),
    xml,
  };
}
