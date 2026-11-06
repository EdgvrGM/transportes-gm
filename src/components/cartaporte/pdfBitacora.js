import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MARGEN, NEGRO, GRIS, FONDO_SECCION, AMARILLO, AMARILLO_SUAVE, BORDE, LOGO_ANCHO } from "./estiloPDF.js";

// Bitácora de horas de servicio del conductor, con la identidad de Transportes
// GM (logo, amarillo de marca, secciones como la carta porte). Conserva las
// casillas y el orden de la hoja que se llenaba a mano; la cuadrícula de 24 h,
// las horas y las firmas salen en blanco para llenarse en el viaje.
// Recibe `campos` de datosBitacora(). Con `doc` agrega la bitácora como página
// nueva de ese documento (carta porte + bitácora en un solo PDF).

const ACTIVIDADES = ["Carga", "Conduciendo", "Descanso", "Conduciendo", "Descarga"];
// Líneas de la cuadrícula más oscuras que las del resto: se marcan a pluma.
const LINEA_CUADRICULA = [148, 163, 184];

export function construirPDFBitacora({ campos, logo, doc: docExistente } = {}) {
  const doc = docExistente || new jsPDF({ compress: true, format: "letter" });
  if (docExistente) doc.addPage("letter", "portrait");
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  let y = MARGEN;

  const seccion = (titulo, nota) => {
    doc.setFillColor(...FONDO_SECCION);
    doc.rect(MARGEN, y, util, 6.5, "F");
    doc.setFillColor(...AMARILLO);
    doc.rect(MARGEN, y, 1.4, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NEGRO);
    doc.text(titulo.toUpperCase(), MARGEN + 4, y + 4.5);
    if (nota) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...GRIS);
      doc.text(nota, ancho - MARGEN - 2, y + 4.4, { align: "right" });
    }
    y += 8;
  };

  const base = {
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    showHead: "never",
    styles: { font: "helvetica", fontSize: 8.5, textColor: NEGRO, lineColor: BORDE, lineWidth: 0.2, cellPadding: 1.8, valign: "middle" },
  };
  // autoTable deduce el número de columnas de las celdas del primer renglón y
  // no cuenta los colSpan: hay que declararlas.
  const columnas = (n) => ({ columns: Array.from({ length: n }, (_, i) => ({ header: "", dataKey: i })) });
  const etiqueta = (content, extra = {}) => ({
    content,
    styles: { textColor: GRIS, fontStyle: "bold", fontSize: 6.8, ...extra },
  });
  const valor = (content, { colSpan, ...extra } = {}) => ({
    content: content || "",
    colSpan,
    styles: { fontStyle: "bold", ...extra },
  });

  // Pares etiqueta/valor en N columnas, como en la carta porte. `pesos` reparte
  // el ancho entre pares (p. ej. más espacio para el nombre del conductor).
  const datosClave = (pares, n = 3, { separacion = 4, pesos } = {}) => {
    const fracciones = pesos || Array.from({ length: n }, () => 1 / n);
    const estilos = {};
    for (let j = 0; j < n; j++) {
      const anchoPar = util * fracciones[j];
      const anchoEtiqueta = Math.min(anchoPar * 0.36, 22);
      estilos[j * 2] = { cellWidth: anchoEtiqueta };
      estilos[j * 2 + 1] = { cellWidth: anchoPar - anchoEtiqueta };
    }
    const filas = [];
    for (let i = 0; i < pares.length; i += n) {
      const fila = [];
      for (let j = 0; j < n; j++) {
        const p = pares[i + j];
        fila.push(p ? etiqueta(p[0]) : "", p ? valor(p[1], p[2]) : "");
      }
      filas.push(fila);
    }
    autoTable(doc, { ...base, ...columnas(n * 2), startY: y, columnStyles: estilos, body: filas });
    y = doc.lastAutoTable.finalY + separacion;
  };

  // ── Encabezado ──────────────────────────────────────────────────────────────
  let logoAlto = 0;
  if (logo) {
    const { width, height } = doc.getImageProperties(logo);
    logoAlto = LOGO_ANCHO * (height / width);
    doc.addImage(logo, "JPEG", MARGEN, y, LOGO_ANCHO, logoAlto, "logo");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...NEGRO);
  doc.text("BITÁCORA DE HORAS DE SERVICIO", ancho - MARGEN, y + 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text("del conductor · Autotransporte federal de carga", ancho - MARGEN, y + 12, { align: "right" });

  const infoX = ancho / 2 + 4;
  autoTable(doc, {
    startY: y + 16,
    margin: { left: infoX, right: MARGEN },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8, textColor: NEGRO, cellPadding: { top: 0.7, bottom: 0.7, left: 1.5, right: 1.5 } },
    columnStyles: { 0: { fontStyle: "bold", textColor: GRIS, cellWidth: 24 }, 1: { fontStyle: "bold" } },
    body: [
      ["Fecha", campos.fecha || "—"],
      ...(campos.referencia ? [["Referencia", campos.referencia]] : []),
      ...(campos.factura ? [["Factura", campos.factura]] : []),
      ["Unidad", [campos.marca, campos.placas].filter(Boolean).join(" · ") || "—"],
    ],
  });
  y = Math.max(doc.lastAutoTable.finalY, y + logoAlto) + 3;
  doc.setDrawColor(...AMARILLO);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y, ancho - MARGEN, y);
  y += 5;

  // ── Datos (mismas casillas que la hoja a mano) ─────────────────────────────
  seccion("Permisionario");
  datosClave(
    [
      ["Nombre", campos.permisionario],
      ["Domicilio", campos.domicilioEncabezado || campos.domicilioPermisionario],
      ["Teléfonos", (campos.telefonos || "").replace(/^TELEFONOS\s*/i, "").replace(/\s{2,}/g, " ")],
      ["Tipo de servicio", `${campos.tipoServicio} · ${campos.modalidad}`],
    ],
    2,
  );

  seccion("Vehículo");
  datosClave([["Marca", campos.marca], ["Modelo", campos.modelo], ["Placas", campos.placas]]);

  seccion("Conductor");
  datosClave([["Nombre", campos.conductor], ["Licencia", campos.licencia], ["Vigencia", campos.vigencia]], 3, {
    pesos: [0.48, 0.28, 0.24],
  });

  // La ruta va resaltada: es lo primero que se revisa contra la carta porte.
  seccion("Origen – destino", "Ruta a seguir");
  autoTable(doc, {
    ...base,
    ...columnas(1),
    startY: y,
    body: [[valor(campos.ruta || " ", { fontSize: 10.5, fillColor: AMARILLO_SUAVE, halign: "center", cellPadding: 2.6 })]],
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── Registro de actividades: 24 h, se llena a mano ──────────────────────────
  seccion("Bitácora del operador", "Marque con una línea las horas de cada actividad");
  const anchoEtiqueta = 24;
  const anchoTotal = 13;
  const anchoHora = (util - anchoEtiqueta - anchoTotal) / 24;
  const estilosHoras = { 0: { cellWidth: anchoEtiqueta, halign: "left" } };
  for (let h = 1; h <= 24; h++) estilosHoras[h] = { cellWidth: anchoHora, halign: "center" };
  estilosHoras[25] = { cellWidth: anchoTotal, halign: "center" };
  const encabezado = { fillColor: NEGRO, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6.8, cellPadding: 1 };

  autoTable(doc, {
    ...base,
    ...columnas(26),
    startY: y,
    styles: { ...base.styles, lineColor: LINEA_CUADRICULA, lineWidth: 0.25, cellPadding: 0.8, minCellHeight: 6.8, fontSize: 7 },
    columnStyles: estilosHoras,
    body: [
      [
        { content: "Actividad", styles: { ...encabezado, halign: "left" } },
        ...Array.from({ length: 24 }, (_, i) => ({ content: String(i + 1), styles: encabezado })),
        { content: "Total", styles: encabezado },
      ],
      ...ACTIVIDADES.map((a, i) => [
        { content: a, styles: { fontStyle: "bold", textColor: GRIS, fillColor: FONDO_SECCION } },
        ...Array.from({ length: 24 }, () => ({ content: "", styles: { fillColor: i % 2 ? [250, 250, 250] : [255, 255, 255] } })),
        { content: "", styles: { fillColor: AMARILLO_SUAVE } },
      ]),
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── Horas ───────────────────────────────────────────────────────────────────
  seccion("Horas");
  const tercio = util / 3;
  autoTable(doc, {
    ...base,
    ...columnas(3),
    startY: y,
    columnStyles: { 0: { cellWidth: tercio }, 1: { cellWidth: tercio }, 2: { cellWidth: tercio } },
    body: [
      [etiqueta("DE SALIDA"), etiqueta("DE LLEGADA"), etiqueta("DE SERVICIO CONDUCIENDO")],
      [{ content: "", styles: { minCellHeight: 9 } }, "", ""],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  // ── Firmas ──────────────────────────────────────────────────────────────────
  seccion("Firmas");
  const anchoFirma = (util - 12) / 2;
  // Ocupa lo que queda de la hoja sin pisar el pie (mín. 20 mm para firmar).
  const altoFirma = Math.max(20, Math.min(30, alto - 14 - y));
  [
    { x: MARGEN, titulo: "Firma del responsable", nombre: campos.firmaResponsable },
    { x: MARGEN + anchoFirma + 12, titulo: "Firma del conductor", nombre: campos.firmaConductor },
  ].forEach(({ x, titulo, nombre }) => {
    doc.setDrawColor(...BORDE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, anchoFirma, altoFirma, 1.5, 1.5, "S");
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.line(x + 10, y + altoFirma - 9, x + anchoFirma - 10, y + altoFirma - 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(nombre || "", x + anchoFirma / 2, y + altoFirma - 4.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(titulo.toUpperCase(), x + anchoFirma / 2, y + altoFirma - 1.5, { align: "center" });
  });

  // ── Pie ─────────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRIS);
  const pie = [campos.empresa, campos.razonSocial, campos.uuid && `CFDI ${campos.uuid}`].filter(Boolean).join(" · ");
  doc.text(pie, MARGEN, alto - 7);
  doc.text("Bitácora de horas de servicio del conductor", ancho - MARGEN, alto - 7, { align: "right" });

  return doc;
}
