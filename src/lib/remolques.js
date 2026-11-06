export const getAbreviacionTipo = (tipo) => {
  if (!tipo) return "";
  const t = tipo.toLowerCase();
  if (t.includes("seca") || t.includes("caja")) return "CS";
  if (
    t.includes("chasis") ||
    t.includes("contenedor") ||
    t.includes("portacontenedor")
  )
    return "CH";
  if (t.includes("plataforma")) return "PT";
  return "";
};

const ORDEN_TIPO = { CH: 0, CS: 1, PT: 2 };

export const ordenarRemolques = (remolques = []) =>
  [...remolques].sort((a, b) => {
    const ta = ORDEN_TIPO[getAbreviacionTipo(a.tipo)] ?? 3;
    const tb = ORDEN_TIPO[getAbreviacionTipo(b.tipo)] ?? 3;
    if (ta !== tb) return ta - tb;
    return (a.placas || "").localeCompare(b.placas || "", "es", {
      numeric: true,
      sensitivity: "base",
    });
  });
