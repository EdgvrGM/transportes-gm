import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
// Imports relativos con extensión: este módulo también lo carga Node desde
// scripts/regenerar-pdfs-liquidaciones.mjs, que no entiende el alias "@/".
import { formatCurrency } from "../../lib/formato.js";

// Logo pre-reducido para el PDF: 600 px de ancho (~360 dpi a 42 mm), aplanado
// sobre blanco y en JPEG (~30 KB). NO usar /img/LOGO.PNG aquí: jsPDF incrusta
// los PNG con transparencia como píxeles crudos sin comprimir, y ese logo de
// 3170×2010 hacía pesar cada liquidación ~24 MB.
export const LOGO_PDF_URL = "/img/logo-pdf.jpg";
const LOGO_ANCHO_MM = 42;

export async function cargarLogoPDF() {
  const res = await fetch(LOGO_PDF_URL);
  if (!res.ok) throw new Error(`No se pudo cargar el logo del PDF (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

// Recibo de liquidación. Función pura: la usa la pantalla al emitir y el script
// de regeneración desde el snapshot `detalle`, para que ambos salgan idénticos.
// `logo` son los bytes JPEG de LOGO_PDF_URL (o null para omitirlo).
export function construirPDFLiquidacion({
  logo,
  conductorNombre,
  periodoTexto,
  fechaEmision,
  viajes = [],
  conceptosExtras = [],
  gastos = [],
  anticipos = {},
  anticiposExtras = [],
  totales,
}) {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.width;
  let logoBottomY = 10;

  if (logo) {
    const { width, height } = doc.getImageProperties(logo);
    const logoH = Math.round(LOGO_ANCHO_MM * (height / width));
    doc.addImage(logo, "JPEG", 14, 8, LOGO_ANCHO_MM, logoH, "logo");
    logoBottomY = 8 + logoH;
  }

  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text("Liquidación de Operador", pageWidth / 2, 22, { align: "center" });
  doc.setFont(undefined, 'normal');

  const infoY = Math.max(logoBottomY + 6, 36);
  doc.setFontSize(12);
  doc.text(`Operador: ${conductorNombre}`, 14, infoY);
  doc.text(`Periodo: ${periodoTexto}`, 14, infoY + 7);
  doc.text(`Fecha Emisión: ${format(fechaEmision, "dd/MM/yyyy HH:mm")}`, 14, infoY + 14);

  // Tabla Viajes
  const totalFleteBruto = viajes.reduce((sum, v) => sum + (parseFloat(v.flete_bruto) || 0), 0);
  const rowsExtrasViajesConceptos = conceptosExtras
    .filter(c => c.monto > 0 || c.concepto !== "")
    .map(c => [c.fecha || '-', c.concepto || '-', 'EXTRA', '', '', `$${formatCurrency(c.monto)}`]);
  autoTable(doc, {
    startY: infoY + 22,
    head: [['Fecha', 'Ruta', 'Tipo', 'Flete Bruto', '% Aplicado', 'Comisión']],
    body: [
      ...viajes.map(v => [v.fecha, v.ruta, v.tipo, `$${formatCurrency(v.flete_bruto)}`, `${v.porcentaje}%`, `$${formatCurrency(v.comision)}`]),
      ...rowsExtrasViajesConceptos,
    ],
    foot: [['', '', 'TOTAL', `$${formatCurrency(totalFleteBruto)}`, '', `$${formatCurrency(totales.comisiones)}`]],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], halign: 'center', valign: 'middle' },
    styles: { fontSize: 12, textColor: [20, 20, 20], valign: 'middle', halign: 'center' },
    columnStyles: {
      1: { halign: 'left', valign: 'top' },
      3: { halign: 'right' },
      5: { halign: 'right' },
    },
    footStyles: { fillColor: [237, 233, 254], fontStyle: 'bold', textColor: [55, 48, 163], fontSize: 12, halign: 'center', valign: 'middle' },
    showFoot: 'lastPage',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1 && data.row.index < viajes.length) {
        data.cell.styles.minCellHeight = 14;
        // Reservar espacio abajo para dibujar las métricas (km · L · km/L)
        // sin importar cuántas líneas ocupe la ruta al hacer wrap.
        const cp = data.cell.styles.cellPadding;
        const pad = typeof cp === 'number'
          ? { top: cp, right: cp, bottom: cp, left: cp }
          : { top: cp.top ?? 0, right: cp.right ?? 0, bottom: cp.bottom ?? 0, left: cp.left ?? 0 };
        pad.bottom += 6;
        data.cell.styles.cellPadding = pad;
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 1 && data.row.index < viajes.length) {
        const v = viajes[data.row.index];
        const parts = [
          { text: formatCurrency(v.km).replace('.00', ''), bold: true },
          { text: ' km · ', bold: false },
          { text: formatCurrency(v.litros).replace('.00', ''), bold: true },
          { text: ' L · ', bold: false },
          ...(v.litros > 0
            ? [{ text: Number(v.rendimiento).toFixed(2), bold: true }, { text: ' km/L', bold: false }]
            : [{ text: 'S/D', bold: false }]
          ),
        ];
        doc.setFontSize(10);
        doc.setTextColor(70);
        let x = data.cell.x + 2;
        const y = data.cell.y + data.cell.height - 3;
        for (const part of parts) {
          doc.setFont(undefined, part.bold ? 'bold' : 'normal');
          doc.text(part.text, x, y);
          x += doc.getTextWidth(part.text);
        }
        doc.setFont(undefined, 'normal');
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
      }
    },
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  const rowsGastos = gastos
    .filter(g => g.monto > 0 || g.concepto !== "")
    .map(g => [g.concepto || '-', g.monto > 0 ? `$${formatCurrency(g.monto)}` : '']);

  const rowsAnticipos = [
    ...Object.keys(anticipos).filter(dia => (anticipos[dia] || 0) > 0).map(dia => [dia, `$${formatCurrency(anticipos[dia])}`]),
    ...anticiposExtras.filter(a => a.monto > 0 || a.concepto !== "").map(a => [a.concepto || '-', `$${formatCurrency(a.monto)}`]),
  ];

  // Tabla Gastos — mitad izquierda
  autoTable(doc, {
    startY: finalY,
    margin: { left: 14, right: 109 },
    head: [['Concepto Gasto', 'Monto']],
    body: rowsGastos.length > 0 ? rowsGastos : [['Sin gastos registrados', '']],
    foot: rowsGastos.length > 0 ? [['TOTAL', `$${formatCurrency(totales.gastos)}`]] : [],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 11, textColor: [20, 20, 20] },
    footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 11 },
  });
  const finalYGastos = doc.lastAutoTable.finalY;

  // Tabla Anticipos — mitad derecha, mismo Y de inicio
  autoTable(doc, {
    startY: finalY,
    margin: { left: 109, right: 14 },
    head: [['Día', 'Anticipo']],
    body: rowsAnticipos.length > 0 ? rowsAnticipos : [['Sin anticipos', '']],
    foot: rowsAnticipos.length > 0 ? [['TOTAL', `$${formatCurrency(totales.anticipos)}`]] : [],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 11, textColor: [20, 20, 20] },
    footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 11 },
  });
  const finalYAnticipos = doc.lastAutoTable.finalY;

  finalY = Math.max(finalYGastos, finalYAnticipos) + 15;

  // Resumen
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Comisión + Gastos: $${formatCurrency(totales.comisiones + totales.gastos)}`, 130, finalY);
  doc.text(`Total de Anticipos: $${formatCurrency(totales.anticipos)}`, 130, finalY + 7);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`Sueldo Neto: $${formatCurrency(totales.neto)}`, 130, finalY + 18);

  // Firmas
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const firmaY = finalY + 50;
  doc.line(30, firmaY, 80, firmaY);
  doc.text("Firma Operador", 55, firmaY + 5, { align: "center" });

  doc.line(130, firmaY, 180, firmaY);
  doc.text("Firma Autorización", 155, firmaY + 5, { align: "center" });

  return doc;
}
