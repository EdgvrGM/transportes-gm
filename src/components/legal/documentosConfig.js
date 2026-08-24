import {
  IdCard,
  Stethoscope,
  FileBadge,
  Wrench,
  Leaf,
  ShieldCheck,
  FileText,
} from "lucide-react";

export const BUCKET_DOCS = "documentos-legales";

// El bucket es privado: todo se abre con URL firmada de vida corta.
export const URL_FIRMADA_SEG = 300;

export const MAX_MB = 15;

export const MIME_ACEPTADOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.webp,.heic";

// Catálogo de tipos de documento por entidad.
// `venc` enlaza el tipo con la columna de vencimiento de la tabla dueña: al
// subir un documento con fecha, esa columna se actualiza sola y los semáforos
// del encabezado siguen cuadrando sin capturar la fecha dos veces.
export const TIPOS_DOC = {
  conductor: [
    { key: "licencia", label: "Licencia de conducir", icon: IdCard, venc: "venc_licencia" },
    { key: "apto_medico", label: "Apto médico", icon: Stethoscope, venc: "venc_apto_medico" },
    { key: "otro", label: "Otro documento", labelSeccion: "Otros documentos", icon: FileText, libre: true },
  ],
  camion: [
    { key: "tarjeta_circulacion", label: "Tarjeta de circulación", icon: FileBadge },
    { key: "fisicomecanica", label: "Físico-mecánica", icon: Wrench, venc: "venc_fisicomecanica" },
    { key: "contaminantes", label: "Contaminantes", icon: Leaf, venc: "venc_contaminantes" },
    { key: "poliza_seguro", label: "Póliza de seguro", icon: ShieldCheck, venc: "venc_poliza_seguro" },
    { key: "tarjeta_sct", label: "Permiso SCT", icon: FileBadge },
    { key: "otro", label: "Otro documento", labelSeccion: "Otros documentos", icon: FileText, libre: true },
  ],
  remolque: [
    { key: "tarjeta_circulacion", label: "Tarjeta de circulación", icon: FileBadge },
    { key: "fisicomecanica", label: "Físico-mecánica", icon: Wrench, venc: "venc_fisicomecanica" },
    { key: "poliza_seguro", label: "Póliza de seguro", icon: ShieldCheck },
    { key: "otro", label: "Otro documento", labelSeccion: "Otros documentos", icon: FileText, libre: true },
  ],
};

// Nombre real de la tabla dueña (respetan mayúscula en Postgres).
export const TABLA_ENTIDAD = {
  conductor: "Conductor",
  camion: "Camion",
  remolque: "Remolque",
};

export function tipoDoc(entidadTipo, key) {
  const lista = TIPOS_DOC[entidadTipo] || [];
  return lista.find((t) => t.key === key) || { key, label: "Documento", icon: FileText };
}

export function tituloDoc(entidadTipo, doc) {
  const meta = tipoDoc(entidadTipo, doc.tipo_doc);
  if (meta.libre) return doc.notas?.trim() || doc.nombre_archivo;
  return meta.label;
}

export function esImagen(mime) {
  return typeof mime === "string" && mime.startsWith("image/");
}

export function esPDF(mime) {
  return mime === "application/pdf";
}

export function formatoTamano(bytes) {
  const n = Number(bytes);
  if (!n || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Nombre seguro para Storage: sin acentos, espacios ni caracteres raros.
export function nombreSeguro(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);
}

// Valida antes de tocar la red: tamaño y tipo. Devuelve mensaje o null.
export function validarArchivo(file) {
  if (!file) return "No se seleccionó ningún archivo.";
  if (file.size > MAX_MB * 1024 * 1024) {
    return `El archivo pesa ${formatoTamano(file.size)}. El máximo es ${MAX_MB} MB.`;
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const extOk = ["pdf", "jpg", "jpeg", "png", "webp", "heic"].includes(ext);
  if (!MIME_ACEPTADOS.includes(file.type) && !extOk) {
    return "Formato no admitido. Sube un PDF o una imagen (JPG, PNG, WEBP, HEIC).";
  }
  return null;
}
