import { CATEGORIAS, getCategoria } from "./costosConfig";

const MONEDA = '"$"#,##0.00';

function encabezado(ws, valores) {
  const fila = ws.addRow(valores);
  fila.font = { bold: true };
  fila.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAB308" } };
    c.alignment = { horizontal: "center" };
  });
}

function titulo(ws, texto, columnas) {
  ws.mergeCells(1, 1, 1, columnas);
  ws.getCell("A1").value = texto;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.addRow([]);
}

// Hoja "Detalle": una fila por gasto. La comparten ambos reportes.
function hojaDetalle(wb, gastos, nombreUnidad) {
  const ws = wb.addWorksheet("Detalle");
  encabezado(ws, ["Fecha", "Unidad", "Categoría", "Concepto", "Proveedor", "Monto", "Notas"]);
  gastos.forEach((g) =>
    ws.addRow([
      g.fecha,
      nombreUnidad(g),
      getCategoria(g.categoria).label,
      g.concepto,
      g.proveedor || "",
      Number(g.monto) || 0,
      g.notas || "",
    ]),
  );
  ws.columns = [
    { width: 12 }, { width: 26 }, { width: 20 }, { width: 40 },
    { width: 22 }, { width: 14 }, { width: 40 },
  ];
  ws.getColumn(6).numFmt = MONEDA;
}

async function descargar(wb, nombreArchivo) {
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

// Matriz unidades × categorías de una semana + hoja de detalle.
export async function exportarSemana({ tituloTexto, nombreArchivo, filas, gastos, nombreUnidad }) {
  // Import dinámico: ExcelJS (~1 MB) sólo se descarga al exportar.
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resumen");
  const ncol = CATEGORIAS.length + 3;
  titulo(ws, tituloTexto, ncol);
  encabezado(ws, ["Tipo", "Unidad", ...CATEGORIAS.map((c) => c.label), "Total"]);
  filas.forEach((f) =>
    ws.addRow([f.seccion, f.etiqueta, ...CATEGORIAS.map((c) => f.porCat[c.key] || 0), f.total]),
  );
  const tot = ws.addRow([
    "TOTAL",
    "",
    ...CATEGORIAS.map((c) => filas.reduce((s, f) => s + (f.porCat[c.key] || 0), 0)),
    filas.reduce((s, f) => s + f.total, 0),
  ]);
  tot.font = { bold: true };
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 28;
  for (let i = 3; i <= ncol; i++) {
    ws.getColumn(i).width = 16;
    ws.getColumn(i).numFmt = MONEDA;
  }
  hojaDetalle(wb, gastos, nombreUnidad);
  await descargar(wb, nombreArchivo);
}

// Serie semanal de una unidad + hoja de detalle.
export async function exportarUnidad({ tituloTexto, nombreArchivo, semanas, gastos, nombreUnidad }) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Por semana");
  const ncol = CATEGORIAS.length + 2;
  titulo(ws, tituloTexto, ncol);
  encabezado(ws, ["Semana (lunes)", ...CATEGORIAS.map((c) => c.label), "Total"]);
  semanas.forEach((s) => ws.addRow([s.lunes, ...CATEGORIAS.map((c) => s[c.key] || 0), s.total]));
  const tot = ws.addRow([
    "TOTAL",
    ...CATEGORIAS.map((c) => semanas.reduce((a, s) => a + (s[c.key] || 0), 0)),
    semanas.reduce((a, s) => a + s.total, 0),
  ]);
  tot.font = { bold: true };
  ws.getColumn(1).width = 16;
  for (let i = 2; i <= ncol; i++) {
    ws.getColumn(i).width = 16;
    ws.getColumn(i).numFmt = MONEDA;
  }
  hojaDetalle(wb, gastos, nombreUnidad);
  await descargar(wb, nombreArchivo);
}
