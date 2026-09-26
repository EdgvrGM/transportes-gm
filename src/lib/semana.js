import { parseISO, getISOWeek, addDays } from "date-fns";

// Fuente única del orden de la semana operativa del Programa de Cargas.
//
// El orden NO se hardcodea: se deriva del día de la semana en que cae la
// `fecha_inicio` de cada programa. Así, una semana vieja guardada con
// fecha_inicio en lunes sigue leyéndose Lunes→Sábado, y una nueva con
// fecha_inicio en domingo se lee Domingo→Viernes, sin migrar nada en BD.

const NOMBRES_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DIAS_POR_SEMANA = 6;

// Día en que arranca una semana nueva mientras el usuario no elige fecha (0 = Domingo).
export const DIA_INICIO_SEMANA = 0;

function toDate(fecha) {
  if (!fecha) return null;
  const d = fecha instanceof Date ? fecha : parseISO(fecha);
  return isNaN(d) ? null : d;
}

// Nombre del día de una fecha real. Independiente del orden de la semana:
// un miércoles es "Miércoles" empiece la semana en domingo o en lunes.
export function nombreDia(fecha) {
  const d = toDate(fecha);
  return d ? NOMBRES_DIA[d.getDay()] : null;
}

// Los días de un programa, en orden, empezando por el de su fecha_inicio.
export function diasDeSemana(fechaInicio) {
  const d = toDate(fechaInicio);
  const inicio = d ? d.getDay() : DIA_INICIO_SEMANA;
  return Array.from(
    { length: DIAS_POR_SEMANA },
    (_, i) => NOMBRES_DIA[(inicio + i) % 7],
  );
}

// Posición (0..DIAS_POR_SEMANA-1) de un día dentro de su programa.
export function offsetDia(fechaInicio, nombre) {
  const idx = diasDeSemana(fechaInicio).indexOf(nombre);
  return idx === -1 ? 0 : idx;
}

// Estructura `programacion` vacía con las llaves del orden que corresponde.
export function plantillaVacia(fechaInicio) {
  return diasDeSemana(fechaInicio).reduce(
    (acc, dia) => ({ ...acc, [dia]: [] }),
    {},
  );
}

export function abreviaDia(nombre) {
  return nombre ? nombre.slice(0, 3) : "";
}

// Número de semana para el título. getISOWeek cuenta semanas Lunes→Domingo,
// así que un domingo pertenece a la semana ISO que *termina* ese día: pedirlo
// directo devolvería el número de la semana anterior. Se calcula sobre el
// primer lunes contenido en el programa.
export function numeroSemana(fechaInicio) {
  const d = toDate(fechaInicio);
  if (!d) return null;
  const haciaLunes = (8 - d.getDay()) % 7;
  return getISOWeek(addDays(d, haciaLunes));
}

// Reasigna los viajes a las llaves del nuevo orden conservando su posición
// dentro de la semana. Se usa al mover la fecha_inicio de un programa ya
// capturado a otro día de la semana.
export function remapearProgramacion(programacion, fechaInicioPrevia, fechaInicioNueva) {
  const previos = diasDeSemana(fechaInicioPrevia);
  const nuevos = diasDeSemana(fechaInicioNueva);
  const salida = plantillaVacia(fechaInicioNueva);
  nuevos.forEach((dia, i) => {
    salida[dia] = programacion?.[previos[i]] ?? [];
  });
  return salida;
}

// ── Semana calendario Lunes–Domingo ──────────────────────────────────────────
// Independiente del Programa de Cargas: la usan Control de Vacíos y Costos por
// Unidad, que agrupan por semana calendario y no por semana operativa.

// Lunes (00:00 local) de la semana que contiene `fecha`.
export function lunesDeSemana(fecha) {
  const x = toDate(fecha) ?? new Date();
  const d = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Suma días en hora local (sin pasar por UTC).
export function sumarDias(fecha, n) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}
