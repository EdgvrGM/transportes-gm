// Descripciones de los catálogos SAT que aparecen en la Carta Porte. Sólo las
// claves que usamos o es razonable que aparezcan: una clave que no esté aquí
// se imprime sola (sin descripción), nunca se pierde.
// Municipios: municipiosSat.json (generado por scripts/generar-municipios-sat.mjs).

export const ESTADOS = {
  AGU: "Aguascalientes", BCN: "Baja California", BCS: "Baja California Sur", CAM: "Campeche",
  COA: "Coahuila", COL: "Colima", CHP: "Chiapas", CHH: "Chihuahua", CMX: "Ciudad de México",
  DIF: "Ciudad de México", DUR: "Durango", GUA: "Guanajuato", GRO: "Guerrero", HID: "Hidalgo",
  JAL: "Jalisco", MEX: "Estado de México", MIC: "Michoacán", MOR: "Morelos", NAY: "Nayarit",
  NLE: "Nuevo León", OAX: "Oaxaca", PUE: "Puebla", QUE: "Querétaro", ROO: "Quintana Roo",
  SLP: "San Luis Potosí", SIN: "Sinaloa", SON: "Sonora", TAB: "Tabasco", TAM: "Tamaulipas",
  TLA: "Tlaxcala", VER: "Veracruz", YUC: "Yucatán", ZAC: "Zacatecas",
};

export const PAISES = { MEX: "México", USA: "Estados Unidos", CAN: "Canadá" };

export const CONFIG_VEHICULAR = {
  VL: "Vehículo ligero de carga (2 llantas en el eje delantero y 2 llantas en el eje trasero)",
  C2: "Camión Unitario (2 llantas en el eje delantero y 4 llantas en el eje trasero)",
  C3: "Camión Unitario (2 llantas en el eje delantero y 6 o 8 llantas en los dos ejes traseros)",
  C2R2: "Camión-Remolque (6 llantas en el camión y 8 llantas en remolque)",
  C3R2: "Camión-Remolque (10 llantas en el camión y 8 llantas en remolque)",
  C2R3: "Camión-Remolque (6 llantas en el camión y 12 llantas en remolque)",
  C3R3: "Camión-Remolque (10 llantas en el camión y 12 llantas en remolque)",
  T2S1: "Tractocamión Articulado (6 llantas en el tractocamión, 4 llantas en el semirremolque)",
  T2S2: "Tractocamión Articulado (6 llantas en el tractocamión, 8 llantas en el semirremolque)",
  T2S3: "Tractocamión Articulado (6 llantas en el tractocamión, 12 llantas en el semirremolque)",
  T3S1: "Tractocamión Articulado (10 llantas en el tractocamión, 4 llantas en el semirremolque)",
  T3S2: "Tractocamión Articulado (10 llantas en el tractocamión, 8 llantas en el semirremolque)",
  T3S3: "Tractocamión Articulado (10 llantas en el tractocamión, 12 llantas en el semirremolque)",
  T3S2R4: "Tractocamión Doblemente Articulado (10 llantas en el tractocamión, 8 llantas en el semirremolque y 16 llantas en el remolque)",
  T3S2S2: "Tractocamión Semirremolque-Semirremolque (10 llantas en el tractocamión, 8 llantas en el semirremolque delantero y 8 llantas en el semirremolque trasero)",
};

export const SUBTIPO_REMOLQUE = {
  CTR001: "Caballete", CTR002: "Caja", CTR003: "Caja Abierta", CTR004: "Caja Cerrada",
  CTR005: "Caja De Recolección Con Cargador Frontal", CTR006: "Caja Refrigerada", CTR007: "Caja Seca",
  CTR008: "Caja Transferencia", CTR009: "Cama Baja o Cuello Ganso", CTR010: "Chasis Portacontenedor",
  CTR011: "Convencional De Chasis", CTR012: "Equipo Especial", CTR013: "Estacas", CTR014: "Góndola Madrina",
  CTR015: "Grúa Industrial", CTR016: "Grúa", CTR017: "Integral", CTR018: "Jaula", CTR019: "Media Redila",
  CTR020: "Pallet o Celdillas", CTR021: "Plataforma", CTR022: "Plataforma Con Grúa",
  CTR023: "Plataforma Encortinada", CTR024: "Redilas", CTR025: "Refrigerador", CTR026: "Revolvedora",
  CTR027: "Semicaja", CTR028: "Tanque", CTR029: "Tolva", CTR031: "Volteo", CTR032: "Volteo Desmontable",
};

export const TIPO_PERMISO = {
  TPAF01: "Autotransporte Federal de carga general.",
  TPAF02: "Transporte privado de carga.",
  TPAF03: "Autotransporte Federal de Carga Especializada de materiales y residuos peligrosos.",
  TPXX00: "Permiso no contemplado en el catálogo.",
};

export const TIPO_FIGURA = { "01": "Operador", "02": "Propietario", "03": "Arrendador", "04": "Notificado" };

export const PARTE_TRANSPORTE = {
  PT01: "Camión unitario", PT02: "Camión", PT03: "Tractocamión", PT04: "Remolque",
  PT05: "Semirremolque", PT06: "Vehículo ligero de carga",
};

export const UNIDADES = {
  H87: "Pieza", KGM: "Kilogramo", TNE: "Tonelada", LTR: "Litro", XBX: "Caja", XPK: "Paquete",
  XPX: "Pallet", E48: "Unidad de servicio", XUN: "Unidad", MTQ: "Metro cúbico", XBG: "Bolsa", XSA: "Saco",
};

// "T3S2 - Tractocamión Articulado (…)" o sólo la clave si no está en el catálogo.
export function conDescripcion(catalogo, clave) {
  if (!clave) return "";
  const desc = catalogo[clave];
  return desc ? `${clave} - ${desc}` : clave;
}
