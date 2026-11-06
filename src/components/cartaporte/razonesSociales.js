// Razones sociales con las que factura la empresa: nombre corto y color en la
// lista, y el encabezado de la bitácora (domicilio y teléfonos, que no vienen en
// el XML). Un RFC que no esté aquí se muestra con su nombre del XML y en gris,
// y su bitácora sale sin domicilio.
const TELEFONOS = "TELEFONOS 01 313 32 42919,   CEL. 313 113 0198  Y  313 136 9606";

// Mismo domicilio para las dos razones sociales; sólo cambia el número.
const domicilio = (numero) => ({
  domicilio: `H. COLEGIO MILITAR NO. ${numero} COL. TEPEYAC TECOMAN, COL. C.P. 28110`,
  domicilioCorto: `COLEGIO MILITAR NO. ${numero} TECOMAN, COL.`,
  telefonos: TELEFONOS,
});

export const RAZONES_SOCIALES = {
  GOCE7905243F2: {
    corto: "Edgar José",
    franja: "bg-gm-primary",
    chip: "bg-gm-primary/15 text-yellow-700 dark:text-yellow-400 border-gm-primary/30",
    punto: "bg-gm-primary",
    ...domicilio(680),
  },
  MOEL791221U42: {
    corto: "María de la Luz",
    franja: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    punto: "bg-sky-500",
    ...domicilio(690),
  },
};

const OTRA = {
  franja: "bg-muted-foreground/40",
  chip: "bg-muted text-muted-foreground border-border",
  punto: "bg-muted-foreground/60",
  domicilio: "",
  domicilioCorto: "",
  telefonos: "",
};

function nombreCorto(nombre) {
  return nombre
    .toLowerCase()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function razonSocial(rfc, nombre) {
  return RAZONES_SOCIALES[rfc] || { ...OTRA, corto: nombre ? nombreCorto(nombre) : rfc || "Sin emisor" };
}
