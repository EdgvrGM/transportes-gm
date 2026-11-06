import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import QRCode from "qrcode";
// Imports relativos (sin "@/"): el módulo también se prueba desde Node.
import { cargarLogoPDF } from "../liquidaciones/pdfLiquidacion.js";
import { parsearCartaPorte, urlVerificacionCCP, TIPOS_REFERENCIA, textoReferencia } from "./parsearCartaPorte.js";
import {
  ESTADOS, PAISES, CONFIG_VEHICULAR, SUBTIPO_REMOLQUE, TIPO_PERMISO,
  TIPO_FIGURA, PARTE_TRANSPORTE, UNIDADES, conDescripcion,
} from "./catalogosSat.js";
import { datosBitacora } from "./datosBitacora.js";
import { construirPDFBitacora } from "./pdfBitacora.js";

// Representación impresa de la Carta Porte SIN importes. Sólo recibe lo que
// devuelve parsearCartaPorte(), que ya excluye todo campo de dinero.

const MARGEN = 12;
const NEGRO = [20, 20, 20];
const GRIS = [100, 116, 139];
const FONDO_SECCION = [241, 245, 249];
const AMARILLO = [234, 179, 8];
const BORDE = [203, 213, 225];

function fmtFecha(s) {
  if (!s) return "—";
  try {
    return format(parseISO(s), "dd/MMM/yyyy HH:mm", { locale: es });
  } catch {
    return s;
  }
}

function fmtNum(s, decimales) {
  if (s === "" || s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("es-MX", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

const v = (s) => (s ? s : "—");

function textoDomicilio(d, municipios) {
  if (!d) return "—";
  const calle = [d.calle, d.numExt && `No. ${d.numExt}`, d.numInt && `Int. ${d.numInt}`].filter(Boolean).join(" ");
  const municipio = municipios?.[d.estado]?.[d.municipio] || (d.municipio && `Mpio. ${d.municipio}`);
  const lugar = [municipio, ESTADOS[d.estado] || d.estado, PAISES[d.pais] || d.pais].filter(Boolean).join(", ");
  return [calle, d.referencia, lugar, d.cp && `C.P. ${d.cp}`].filter(Boolean).join("\n");
}

export function construirPDFCartaPorte({ datos, logo, qr, municipios }) {
  const doc = new jsPDF({ compress: true, format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  const cp = datos.cartaPorte;
  const at = cp.autotransporte;
  let y = MARGEN;

  const espacio = (necesario) => {
    if (y + necesario > alto - 16) {
      doc.addPage();
      y = MARGEN;
    }
  };

  // Título + encabezado + al menos una fila: nunca un título o encabezado
  // huérfano al pie de la página.
  const seccion = (titulo) => {
    espacio(26);
    doc.setFillColor(...FONDO_SECCION);
    doc.rect(MARGEN, y, util, 6.5, "F");
    doc.setFillColor(...AMARILLO);
    doc.rect(MARGEN, y, 1.4, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NEGRO);
    doc.text(titulo.toUpperCase(), MARGEN + 4, y + 4.5);
    y += 8;
  };

  // separacion 0 = la siguiente tabla queda pegada (bloques de una misma sección).
  const tabla = ({ separacion = 5, ...opciones }) => {
    espacio(opciones.head ? 16 : 8);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      theme: "grid",
      styles: { font: "helvetica", fontSize: 7.5, textColor: NEGRO, lineColor: BORDE, lineWidth: 0.2, cellPadding: 1.6, valign: "middle" },
      headStyles: { fillColor: [255, 255, 255], textColor: GRIS, fontStyle: "bold", fontSize: 6.8 },
      ...opciones,
    });
    y = doc.lastAutoTable.finalY + separacion;
  };

  // Pares etiqueta/valor en N columnas (sin encabezado).
  const datosClave = (pares, columnas = 3, separacion = 5) => {
    const filas = [];
    for (let i = 0; i < pares.length; i += columnas) {
      const fila = [];
      for (let j = 0; j < columnas; j++) {
        const p = pares[i + j];
        fila.push(p ? p[0] : "", p ? v(p[1]) : "");
      }
      filas.push(fila);
    }
    const anchoPar = util / columnas;
    const columnStyles = {};
    for (let j = 0; j < columnas; j++) {
      columnStyles[j * 2] = { cellWidth: anchoPar * 0.38, textColor: GRIS, fontStyle: "bold", fontSize: 6.8 };
      columnStyles[j * 2 + 1] = { cellWidth: anchoPar * 0.62 };
    }
    tabla({ body: filas, columnStyles, separacion });
  };

  // ── Encabezado ──────────────────────────────────────────────────────────────
  let logoAlto = 0;
  if (logo) {
    const { width, height } = doc.getImageProperties(logo);
    logoAlto = 38 * (height / width);
    doc.addImage(logo, "JPEG", MARGEN, y, 38, logoAlto, "logo");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NEGRO);
  doc.text("CARTA PORTE", ancho - MARGEN, y + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text(`Complemento Carta Porte ${cp.version} · Autotransporte`, ancho - MARGEN, y + 13.5, { align: "right" });

  const infoX = ancho / 2 + 4;
  autoTable(doc, {
    startY: y + 17,
    margin: { left: infoX, right: MARGEN },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.5, textColor: NEGRO, cellPadding: { top: 0.6, bottom: 0.6, left: 1.5, right: 1.5 } },
    columnStyles: { 0: { fontStyle: "bold", textColor: GRIS, cellWidth: 31 } },
    body: [
      ["Factura", [datos.serie, datos.folio].filter(Boolean).join("-") || "—"],
      ["Fecha de emisión", fmtFecha(datos.fecha)],
      [TIPOS_REFERENCIA[datos.referencia.tipo]?.largo || "Referencia", v(datos.referencia.valor)],
      ["Contenedores", datos.contenedores.length ? datos.contenedores.join(", ") : "—"],
      ["Lugar de expedición", datos.lugarExpedicion ? `C.P. ${datos.lugarExpedicion}` : "—"],
    ],
  });
  y = Math.max(doc.lastAutoTable.finalY, y + logoAlto) + 4;
  doc.setDrawColor(...AMARILLO);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y, ancho - MARGEN, y);
  y += 5;

  // ── Emisor / Cliente ────────────────────────────────────────────────────────
  seccion("Emisor y cliente");
  datosClave([
    ["Emisor", datos.emisor.nombre], ["Cliente", datos.receptor.nombre],
    ["RFC emisor", datos.emisor.rfc], ["RFC cliente", datos.receptor.rfc],
  ], 2);

  // ── Datos generales ─────────────────────────────────────────────────────────
  seccion("Datos generales del traslado");
  const internacional = cp.transpInternac === "Sí";
  datosClave([
    ["IdCCP", cp.idCCP],
    ["Folio fiscal (UUID)", datos.timbre.uuid],
    ["Transporte internacional", cp.transpInternac || "No"],
    ["Distancia total recorrida", cp.totalDistRec && `${fmtNum(cp.totalDistRec, 2)} km`],
    ...(internacional
      ? [
          ["Entrada / salida", cp.entradaSalidaMerc],
          ["País origen / destino", PAISES[cp.paisOrigenDestino] || cp.paisOrigenDestino],
          ["Vía entrada / salida", cp.viaEntradaSalida],
        ]
      : []),
  ], 2);

  // ── Ubicaciones ─────────────────────────────────────────────────────────────
  seccion("Ubicaciones");
  tabla({
    head: [["Tipo", "Remitente / destinatario", "Domicilio", "Fecha y hora", "Distancia"]],
    body: cp.ubicaciones.map((u) => [
      `${u.tipo === "Origen" ? "Origen" : "Destino"}\n${u.id}`,
      `${v(u.nombre)}\nRFC: ${v(u.rfc)}${u.numRegIdTrib ? `\nNumRegIdTrib: ${u.numRegIdTrib}` : ""}`,
      textoDomicilio(u.domicilio, municipios),
      `${u.tipo === "Origen" ? "Salida" : "Llegada"}\n${fmtFecha(u.fechaHora)}`,
      u.distancia ? `${fmtNum(u.distancia, 2)} km` : "—",
    ]),
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: 50 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20, halign: "right" },
    },
  });

  // ── Mercancías ──────────────────────────────────────────────────────────────
  const m = cp.mercancias;
  seccion("Mercancías");
  datosClave([
    ["Núm. de mercancías", m.numTotal],
    ["Peso bruto total", m.pesoBrutoTotal && `${fmtNum(m.pesoBrutoTotal, 3)} ${m.unidadPeso === "KGM" ? "kg" : m.unidadPeso}`],
    ["Peso neto total", m.pesoNetoTotal && `${fmtNum(m.pesoNetoTotal, 3)} ${m.unidadPeso === "KGM" ? "kg" : m.unidadPeso}`],
  ]);
  tabla({
    head: [["Cantidad", "Unidad", "Clave producto", "Descripción", "Peso (kg)", "Mat. peligroso", "Embalaje", "Dimensiones"]],
    body: m.items.map((it) => [
      fmtNum(it.cantidad, 2),
      `${it.claveUnidad}${it.unidad || UNIDADES[it.claveUnidad] ? ` - ${it.unidad || UNIDADES[it.claveUnidad]}` : ""}`,
      it.bienesTransp,
      it.descripcion + (it.fraccionArancelaria ? `\nFr. arancelaria: ${it.fraccionArancelaria}` : ""),
      fmtNum(it.pesoEnKg, 3),
      it.materialPeligroso === "Sí" ? `Sí${it.cveMaterialPeligroso ? ` (${it.cveMaterialPeligroso})` : ""}` : "No",
      it.embalaje ? `${it.embalaje}${it.descripEmbalaje ? ` - ${it.descripEmbalaje}` : ""}` : "—",
      v(it.dimensiones),
    ]),
    columnStyles: {
      0: { halign: "right", cellWidth: 16 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      4: { halign: "right", cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
    },
  });

  // ── Autotransporte ──────────────────────────────────────────────────────────
  if (at) {
    seccion("Autotransporte");
    datosClave([
      ["Placa", at.placa], ["Año modelo", at.anio], ["Peso bruto vehicular", at.pesoBrutoVehicular && `${fmtNum(at.pesoBrutoVehicular, 2)} t`],
    ], 3, 0);
    datosClave([
      ["Tipo de permiso", conDescripcion(TIPO_PERMISO, at.permSCT)], ["Núm. de permiso SCT", at.numPermisoSCT],
    ], 2, 0);
    datosClave([["Configuración vehicular", conDescripcion(CONFIG_VEHICULAR, at.configVehicular)]], 1);

    if (at.remolques.length) {
      tabla({
        head: [["Remolque", "Subtipo", "Placa"]],
        body: at.remolques.map((r, i) => [`Remolque ${i + 1}`, conDescripcion(SUBTIPO_REMOLQUE, r.subtipo), r.placa]),
        columnStyles: { 0: { cellWidth: 26, fontStyle: "bold" }, 2: { cellWidth: 40 } },
      });
    }

    const s = at.seguros;
    tabla({
      head: [["Seguro", "Aseguradora", "Póliza"]],
      body: [
        ["Responsabilidad civil", v(s.respCivil), v(s.polizaRespCivil)],
        ...(s.medAmbiente || s.polizaMedAmbiente ? [["Medio ambiente", v(s.medAmbiente), v(s.polizaMedAmbiente)]] : []),
        ...(s.carga || s.polizaCarga ? [["Carga", v(s.carga), v(s.polizaCarga)]] : []),
      ],
      columnStyles: { 0: { cellWidth: 36, fontStyle: "bold" }, 2: { cellWidth: 40 } },
    });
  }

  // ── Figuras de transporte ───────────────────────────────────────────────────
  seccion("Figuras de transporte");
  tabla({
    head: [["Tipo", "Nombre", "RFC", "Licencia", "Partes del transporte"]],
    body: cp.figuras.map((f) => [
      conDescripcion(TIPO_FIGURA, f.tipo),
      v(f.nombre),
      v(f.rfc || f.numRegIdTrib),
      v(f.licencia),
      f.partes.length ? f.partes.map((p) => conDescripcion(PARTE_TRANSPORTE, p)).join("\n") : "—",
    ]),
    columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 2: { cellWidth: 30 }, 3: { cellWidth: 28 } },
  });

  // ── Timbre fiscal ───────────────────────────────────────────────────────────
  const QR = 34;
  espacio(QR + 40);
  seccion("Timbre fiscal digital");
  const yQR = y;
  if (qr) doc.addImage(qr, "PNG", MARGEN, y, QR, QR, "qr");
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN + QR + 4, right: MARGEN },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.5, textColor: NEGRO, cellPadding: { top: 0.7, bottom: 0.7, left: 1.5, right: 1.5 } },
    columnStyles: { 0: { fontStyle: "bold", textColor: GRIS, cellWidth: 36 } },
    body: [
      ["IdCCP", cp.idCCP],
      ["Folio fiscal (UUID)", datos.timbre.uuid],
      ["Fecha de certificación", fmtFecha(datos.timbre.fechaTimbrado)],
      ["No. certificado emisor", v(datos.noCertificado)],
      ["No. certificado SAT", v(datos.timbre.noCertificadoSAT)],
      ["RFC proveedor de certificación", v(datos.timbre.rfcProvCertif)],
    ],
  });
  y = Math.max(doc.lastAutoTable.finalY, yQR + QR) + 4;

  for (const [titulo, sello] of [["Sello digital del emisor", datos.timbre.selloCFD], ["Sello digital del SAT", datos.timbre.selloSAT]]) {
    if (!sello) continue;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    const lineas = doc.splitTextToSize(sello, util);
    espacio(6 + lineas.length * 2.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(titulo, MARGEN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...NEGRO);
    doc.text(lineas, MARGEN, y + 3.5);
    y += 5 + lineas.length * 2.6;
  }

  // ── Pie de página ───────────────────────────────────────────────────────────
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(
      `Representación impresa del complemento Carta Porte del CFDI ${datos.timbre.uuid}`,
      MARGEN, alto - 7,
    );
    doc.text(`Página ${p} de ${paginas}`, ancho - MARGEN, alto - 7, { align: "right" });
  }

  return doc;
}

// "Rem 13404", "Serv 99156MX" o el folio de la factura; apto para nombre de archivo.
export function refArchivo(datos) {
  const { tipo, valor } = datos.referencia;
  const ref =
    textoReferencia(tipo, valor).replace(".", "") ||
    [datos.serie, datos.folio].filter(Boolean).join("-") ||
    datos.timbre.uuid.slice(0, 8);
  return ref.replace(/[\\/:*?"<>|]+/g, "-");
}

export function nombreArchivoCartaPorte(datos) {
  return `Carta Porte ${refArchivo(datos)}.pdf`;
}

// Del XML guardado a los documentos del viaje (sólo navegador): la carta
// porte, la bitácora o ambas en un solo PDF (carta porte primero).
// `referencia` ({ tipo, valor }) reemplaza la del XML cuando se corrigió a mano.
// `catalogos` ({ camiones, conductores }) completa la bitácora (marca y vigencia).
// `faltantes`: casillas de la bitácora que salieron en blanco.
export async function generarDocumentosViaje(xml, referencia, { cartaPorte = true, bitacora = false, catalogos = {} } = {}) {
  const datos = parsearCartaPorte(xml);
  if (referencia) datos.referencia = { tipo: referencia.tipo || null, valor: referencia.valor || "" };
  const [logo, qr, { default: municipios }] = await Promise.all([
    cartaPorte ? cargarLogoPDF().catch(() => null) : null,
    cartaPorte ? QRCode.toDataURL(urlVerificacionCCP(datos), { errorCorrectionLevel: "M", margin: 0, width: 320 }) : null,
    import("./municipiosSat.json"),
  ]);

  let doc = cartaPorte ? construirPDFCartaPorte({ datos, logo, qr, municipios }) : null;
  let faltantes = [];
  if (bitacora) {
    const bit = datosBitacora(datos, { ...catalogos, municipios });
    faltantes = bit.faltantes;
    doc = construirPDFBitacora({ campos: bit.campos, doc: doc || undefined });
  }

  const ref = refArchivo(datos);
  const nombre = cartaPorte && bitacora
    ? `Carta Porte y Bitácora ${ref}.pdf`
    : bitacora
      ? `Bitácora ${ref}.pdf`
      : `Carta Porte ${ref}.pdf`;
  return { doc, datos, nombre, faltantes };
}
