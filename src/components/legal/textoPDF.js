import { extraerApto, extraerLicencia } from "./lectorDocumentos";

// pdf.js se descarga sólo al subir un PDF de licencia o apto (chunk aparte de
// ~1 MB entre librería y worker); el resto de Documentación Legal no lo carga.
let pdfjsPromesa = null;
async function cargarPdfjs() {
  if (!pdfjsPromesa) {
    pdfjsPromesa = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsPromesa;
}

// Texto de las primeras páginas. Una foto escaneada devuelve "" (no hay texto).
export async function textoDePDF(file, maxPaginas = 3) {
  const pdfjs = await cargarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  try {
    let texto = "";
    for (let p = 1; p <= Math.min(doc.numPages, maxPaginas); p++) {
      const contenido = await (await doc.getPage(p)).getTextContent();
      texto += contenido.items.map((i) => i.str).join(" ") + " ";
    }
    return texto;
  } finally {
    doc.destroy();
  }
}

const LECTORES = { licencia: extraerLicencia, apto: extraerApto };

// null si el archivo no es PDF, no trae texto o no es el documento esperado.
export async function leerDocumento(file, lector) {
  const esPDF = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!esPDF || !LECTORES[lector]) return null;
  const texto = await textoDePDF(file);
  return texto.trim() ? LECTORES[lector](texto) : null;
}
