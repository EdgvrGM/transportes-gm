import {
  CircleDot,
  Wrench,
  Cog,
  Droplet,
  ClipboardCheck,
  Droplets,
  Hammer,
  MoreHorizontal,
} from "lucide-react";

// Catálogo de categorías. Debe coincidir con el CHECK `costo_unidad_categoria`
// (última versión: 20260928_costos_talachas.sql): si agregas una aquí, agrégala allá.
// Cada categoría tiene su color fijo (--costo-N): nunca reasignar un color existente.
// El orden de la lista es el de la UI; los colores vecinos están validados para
// daltonismo en este orden — si mueves o agregas una, re-valida la paleta.
export const CATEGORIAS = [
  { key: "llantas", label: "Llantas", icon: CircleDot, color: "var(--costo-1)" },
  { key: "reparacion", label: "Reparación", icon: Wrench, color: "var(--costo-2)" },
  { key: "refacciones", label: "Refacciones", icon: Cog, color: "var(--costo-3)" },
  { key: "aceites", label: "Aceites", icon: Droplet, color: "var(--costo-4)" },
  { key: "servicio_preventivo", label: "Servicio preventivo", icon: ClipboardCheck, color: "var(--costo-5)" },
  { key: "lavado", label: "Lavado", icon: Droplets, color: "var(--costo-6)" },
  { key: "talachas", label: "Talachas", icon: Hammer, color: "var(--costo-8)" },
  { key: "otros", label: "Otros", icon: MoreHorizontal, color: "var(--costo-7)" },
];

export const getCategoria = (key) =>
  CATEGORIAS.find((c) => c.key === key) || CATEGORIAS[CATEGORIAS.length - 1];

// Camiones y remolques son unidades separadas. "General" son compras de flota
// que no son de una unidad (cubetas de aceite, etc.): camion_id y remolque_id
// ambos NULL. El CHECK de la tabla impide que un gasto tenga las dos unidades.
export const TIPOS_UNIDAD = {
  camion: { label: "Camiones", singular: "Camión", columna: "camion_id", tabla: "Camion" },
  remolque: { label: "Remolques", singular: "Remolque", columna: "remolque_id", tabla: "Remolque" },
  general: { label: "Generales", singular: "General", columna: null, tabla: null },
};

export const tipoDeCosto = (g) => (g.camion_id ? "camion" : g.remolque_id ? "remolque" : "general");

// Todas las vistas mezclan camiones, remolques y generales: una unidad se
// identifica por la llave "tipo:id" (general = "general:0").
export const keyUnidad = (tipo, id) => `${tipo}:${tipo === "general" ? 0 : id}`;
export const keyDeCosto = (g) => keyUnidad(tipoDeCosto(g), g.camion_id ?? g.remolque_id);

export function parseKeyUnidad(key) {
  const [tipo, id] = String(key).split(":");
  return { tipo, id: tipo === "general" ? null : parseInt(id, 10) };
}

export function etiquetaUnidad(tipo, u) {
  if (tipo === "general") return "Generales de flota";
  if (!u) return "—";
  if (tipo === "camion") return u.placas ? `${u.nombre} · ${u.placas}` : u.nombre;
  return `${u.placas}${u.tipo ? ` · ${u.tipo}` : ""}`;
}
