import {
  CircleDot,
  Wrench,
  Cog,
  Siren,
  ClipboardCheck,
  Droplets,
  MoreHorizontal,
} from "lucide-react";

// Catálogo de categorías. Debe coincidir con el CHECK `costo_unidad_categoria`
// de 20260926_costos_unidad.sql: si agregas una aquí, agrégala allá.
// El orden es fijo y define el color (--costo-N): nunca reordenar, sólo agregar.
export const CATEGORIAS = [
  { key: "llantas", label: "Llantas", icon: CircleDot, color: "var(--costo-1)" },
  { key: "reparacion", label: "Reparación", icon: Wrench, color: "var(--costo-2)" },
  { key: "refacciones", label: "Refacciones", icon: Cog, color: "var(--costo-3)" },
  { key: "rescate_carretera", label: "Rescate en carretera", icon: Siren, color: "var(--costo-4)" },
  { key: "servicio_preventivo", label: "Servicio preventivo", icon: ClipboardCheck, color: "var(--costo-5)" },
  { key: "lavado", label: "Lavado", icon: Droplets, color: "var(--costo-6)" },
  { key: "otros", label: "Otros", icon: MoreHorizontal, color: "var(--costo-7)" },
];

export const getCategoria = (key) =>
  CATEGORIAS.find((c) => c.key === key) || CATEGORIAS[CATEGORIAS.length - 1];

// Camiones y remolques son unidades separadas: cada gasto lleva camion_id XOR
// remolque_id (lo garantiza el CHECK de la tabla).
export const TIPOS_UNIDAD = {
  camion: { label: "Camiones", singular: "Camión", columna: "camion_id", tabla: "Camion" },
  remolque: { label: "Remolques", singular: "Remolque", columna: "remolque_id", tabla: "Remolque" },
};

export function etiquetaUnidad(tipo, u) {
  if (!u) return "—";
  if (tipo === "camion") return u.placas ? `${u.nombre} · ${u.placas}` : u.nombre;
  return `${u.placas}${u.tipo ? ` · ${u.tipo}` : ""}`;
}
