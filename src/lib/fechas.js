import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Fecha local YYYY-MM-DD. NUNCA usar toISOString().split("T")[0]: devuelve la
// fecha en UTC y en México (UTC-6) después de las 18:00 ya es "mañana".
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Fecha legible corta para tarjetas y listas: "05 jul 2026".
export function formatearFecha(s) {
  if (!s) return "—";
  try {
    return format(parseISO(s), "dd MMM yyyy", { locale: es });
  } catch {
    return s;
  }
}
