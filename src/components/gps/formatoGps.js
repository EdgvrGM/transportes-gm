import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";

// El proxy manda epochs en segundos; el fallback mock del worker, strings ISO.
export const aMs = (ts) => (typeof ts === "number" ? ts * 1000 : new Date(ts).getTime());

// `ultima_actualizacion` es la hora del último fix GPS y se congela cuando la unidad está
// parada aunque el equipo siga reportando; `msg_ts` es el último mensaje recibido.
export const ultimoReporteMs = (u) =>
  Math.max(
    u?.msg_ts ? u.msg_ts * 1000 : 0,
    u?.ultima_actualizacion ? aMs(u.ultima_actualizacion) || 0 : 0
  ) || null;

export function duracion(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

export function tiempoDesde(ms) {
  if (!ms) return "Sin datos";
  const diff = Date.now() - ms;
  if (diff < 0 || diff > 30 * 86400000) return "Sin señal reciente";
  if (diff < 60000) return `hace ${Math.floor(diff / 1000)} s`;
  return `hace ${duracion(diff)}`;
}

// Hora sola si es de hoy; con fecha si no, para que "11:39" de ayer no se lea como de hoy.
export function horaReporte(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const hora = d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
  return isToday(d) ? hora : `${format(d, "d MMM", { locale: es })}, ${hora}`;
}

const PUNTOS_CARDINALES = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
export const rumboCardinal = (grados) =>
  PUNTOS_CARDINALES[Math.round((((grados ?? 0) % 360) + 360) % 360 / 45) % 8];
