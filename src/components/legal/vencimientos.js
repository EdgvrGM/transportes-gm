import { differenceInDays, format, parseISO } from "date-fns";

// Semáforo de vencimientos compartido por la tabla de Documentación Legal y por
// el archivo de documentos. Umbral único: 30 días para "por vencer".
export function getEstadoVencimiento(fechaStr) {
  if (!fechaStr) return "sin_registro";
  try {
    const date = parseISO(fechaStr);
    if (isNaN(date.getTime())) return "sin_registro";
    const dias = differenceInDays(date, new Date());
    if (dias < 0) return "vencido";
    if (dias <= 30) return "por_vencer";
    return "vigente";
  } catch (_e) {
    return "sin_registro";
  }
}

export function getBadgeClasses(estado) {
  switch (estado) {
    case "vencido":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "por_vencer":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "vigente":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

export function getBadgeLabel(estado, fechaStr) {
  if (estado === "sin_registro" || !fechaStr) return "Sin registro";
  try {
    const date = parseISO(fechaStr);
    if (isNaN(date.getTime())) return "Sin registro";

    if (estado === "vencido") {
      const dias = Math.abs(differenceInDays(date, new Date()));
      return `Vencido hace ${dias}d`;
    }
    if (estado === "por_vencer") {
      const dias = differenceInDays(date, new Date());
      return `Vence en ${dias}d`;
    }
    return format(date, "dd/MM/yyyy");
  } catch (_e) {
    return "Sin registro";
  }
}
