import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Bitácora de horas de servicio del conductor. Replica el formato que se
// llenaba a mano (mismo orden de casillas); la cuadrícula de 24 horas y las
// horas de salida/llegada salen en blanco para llenarse a mano en el viaje.
// Recibe `campos` de datosBitacora(). Con `doc` agrega la bitácora como página
// nueva de ese documento (carta porte + bitácora en un solo PDF).

const MARGEN = 18;
const NEGRO = [0, 0, 0];
const GRIS = [217, 217, 217];
const LINEA = [90, 90, 90];
const ACTIVIDADES = ["CARGA", "CONDUCIENDO", "DESCANSO", "CONDUCIENDO", "DESCARGA"];

export function construirPDFBitacora({ campos, doc: docExistente } = {}) {
  const doc = docExistente || new jsPDF({ compress: true, format: "letter" });
  if (docExistente) doc.addPage("letter", "portrait");
  const ancho = doc.internal.pageSize.getWidth();
  const util = ancho - MARGEN * 2;
  const centro = ancho / 2;
  let y = 20;

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setTextColor(...NEGRO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(campos.empresa, centro, y, { align: "center" });
  doc.setFontSize(8);
  doc.text(campos.giro, centro, (y += 5), { align: "center" });
  doc.text(campos.razonSocial, centro, (y += 3.6), { align: "center" });
  if (campos.domicilioEncabezado) {
    doc.setFontSize(8.5);
    doc.text(campos.domicilioEncabezado, centro, (y += 5), { align: "center" });
  }
  if (campos.telefonos) {
    doc.setFontSize(8);
    doc.text(campos.telefonos, centro, (y += 3.8), { align: "center" });
  }
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.4);
  doc.line(MARGEN, (y += 2), ancho - MARGEN, y);

  doc.setFontSize(11.5);
  const titulo = "BITÁCORA DE HORAS DE SERVICIO DEL CONDUCTOR";
  y += 12;
  doc.text(titulo, centro, y, { align: "center" });
  const tw = doc.getTextWidth(titulo);
  doc.setLineWidth(0.3);
  doc.line(centro - tw / 2, y + 1, centro + tw / 2, y + 1);
  y += 10;

  const base = {
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: { font: "helvetica", fontSize: 8, textColor: NEGRO, lineColor: LINEA, lineWidth: 0.2, cellPadding: 1.4, valign: "middle" },
  };
  // autoTable deduce el número de columnas de las celdas del primer renglón y
  // no cuenta los colSpan: sin declararlas, una tabla de 5 columnas cuyo primer
  // renglón tiene 2 celdas combinadas se dibuja con 2 y todo se aprieta.
  const columnas = (n) => ({ columns: Array.from({ length: n }, (_, i) => ({ header: "", dataKey: i })), showHead: "never" });
  // colSpan/rowSpan van en la celda, no en styles (ahí autoTable los ignora).
  const gris = (content, { colSpan, rowSpan, ...extra } = {}) => ({ content, colSpan, rowSpan, styles: { fillColor: GRIS, fontSize: 7.5, halign: "center", ...extra } });
  const valor = (content, { colSpan, rowSpan, ...extra } = {}) => ({ content: content || "", colSpan, rowSpan, styles: { fontStyle: "bold", fontSize: 9, ...extra } });

  // ── Datos del viaje ─────────────────────────────────────────────────────────
  // 5 columnas: tipo de servicio | modalidad | marca | modelo | placas.
  autoTable(doc, {
    ...base,
    ...columnas(5),
    startY: y,
    columnStyles: { 0: { cellWidth: util * 0.19 }, 1: { cellWidth: util * 0.16 }, 2: { cellWidth: util * 0.31 }, 3: { cellWidth: util * 0.14 }, 4: { cellWidth: util * 0.2 } },
    body: [
      [gris("FECHA:", { colSpan: 3, halign: "right", minCellHeight: 10 }), valor(campos.fecha, { colSpan: 2 })],
      [gris("NOMBRE DEL PERMISIONARIO", { colSpan: 2 }), gris("DOMICILIO", { colSpan: 3 })],
      [valor(campos.permisionario, { colSpan: 2, minCellHeight: 11 }), valor(campos.domicilioPermisionario, { colSpan: 3, halign: "center" })],
      [gris("TIPO DE SERVICIO"), gris("MODALIDAD"), gris("MARCA"), gris("MODELO"), gris("PLACAS No.")],
      [
        valor(campos.tipoServicio, { halign: "center" }),
        valor(campos.modalidad, { halign: "center" }),
        valor(campos.marca),
        valor(campos.modelo, { halign: "center" }),
        valor(campos.placas, { halign: "center" }),
      ],
      [gris("NOMBRE DEL CONDUCTOR", { minCellHeight: 12 }), valor(campos.conductor, { colSpan: 4, halign: "center", fontSize: 10 })],
      [gris("LICENCIA", { colSpan: 2, halign: "left" }), gris("VIGENCIA"), gris("ORIGEN-DESTINO (ESPECIFICAR LA RUTA A SEGUIR)", { colSpan: 2, fontSize: 6.5 })],
      [
        { content: campos.licencia, colSpan: 2 },
        { content: campos.vigencia, styles: { halign: "center" } },
        valor(campos.ruta, { colSpan: 2, fontSize: 7.5 }),
      ],
      [{ content: "", colSpan: 2, styles: { minCellHeight: 5 } }, "", { content: "", colSpan: 2 }],
    ],
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Bitácora del operador (24 horas, se llena a mano) ───────────────────────
  const anchoEtiqueta = 19;
  const anchoTotal = 12;
  const anchoHora = (util - anchoEtiqueta - anchoTotal) / 24;
  const estilosHoras = { 0: { cellWidth: anchoEtiqueta, fontSize: 5.5, halign: "left" } };
  for (let h = 1; h <= 24; h++) estilosHoras[h] = { cellWidth: anchoHora, halign: "right" };
  estilosHoras[25] = { cellWidth: anchoTotal, fontSize: 6.5, halign: "center" };

  autoTable(doc, {
    ...base,
    ...columnas(26),
    startY: y,
    styles: { ...base.styles, cellPadding: 0.8, fontSize: 7.5, minCellHeight: 5.5 },
    columnStyles: estilosHoras,
    body: [
      [{ content: "BITACORA DEL OPERADOR:", colSpan: 26, styles: { fontSize: 9, halign: "left", lineWidth: 0 } }],
      [{ content: "", styles: { minCellHeight: 4 } }, ...Array.from({ length: 24 }, () => ""), ""],
      ["", ...Array.from({ length: 24 }, (_, i) => String(i + 1)), { content: "TOTAL", styles: { fontSize: 6.5 } }],
      ...ACTIVIDADES.map((a) => [a, ...Array.from({ length: 24 }, () => ""), ""]),
    ],
  });
  y = doc.lastAutoTable.finalY + 14;

  // ── Horas y firmas ──────────────────────────────────────────────────────────
  autoTable(doc, {
    ...base,
    ...columnas(5),
    startY: y,
    columnStyles: { 0: { cellWidth: util * 0.09 }, 1: { cellWidth: util * 0.11 }, 2: { cellWidth: util * 0.11 }, 3: { cellWidth: util * 0.19 }, 4: { cellWidth: util * 0.5 } },
    body: [
      [
        { content: "HORAS", rowSpan: 2, styles: { fillColor: GRIS, fontSize: 6, valign: "bottom", halign: "center" } },
        gris("DE SALIDA", { fontSize: 6 }),
        gris("DE LLEGADA", { fontSize: 6 }),
        gris("DE SERVICIO CONDUCIENDO", { colSpan: 2, fontSize: 6, halign: "left" }),
      ],
      [{ content: "", styles: { minCellHeight: 7 } }, "", { content: "", colSpan: 2 }],
      [{ content: "", colSpan: 5, styles: { minCellHeight: 5 } }],
      [gris("FIRMA DEL RESPONSABLE", { colSpan: 4 }), gris("FIRMA DEL CONDUCTOR")],
      [
        valor(campos.firmaResponsable, { colSpan: 4, halign: "center", fontSize: 10.5, minCellHeight: 12 }),
        valor(campos.firmaConductor, { halign: "center", fontSize: 10.5 }),
      ],
      [{ content: "", colSpan: 4, styles: { minCellHeight: 12 } }, ""],
    ],
  });

  return doc;
}
