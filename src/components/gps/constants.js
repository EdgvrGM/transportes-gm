// Constantes compartidas del módulo GPS
export const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";
export const WIALON_IMG_BASE  = "https://hst-api.wialon.com";

// Geocerca del patio (centro de operaciones)
export const PATIO_LAT     = 18.9350;
export const PATIO_LNG     = -103.8899;
export const PATIO_RADIO_M = 70;

// Umbrales
export const RALENTI_UMBRAL_MS  = 15 * 60 * 1000;
export const VELOCIDAD_EXCESO   = 110; // km/h — único umbral de exceso: panel, historial, reproductor y portal
export const RASTRO_MAX         = 10;
export const RALENTI_VEL_MAX    = 2;   // km/h — por debajo de esto se considera "parado" (tolera ruido GPS)
export const SIN_SENAL_MS       = 30 * 60 * 1000;
export const PARADA_RADIO_M     = 150; // "mismo lugar": holgura para la deriva del GPS estacionado
export const PARADA_VENTANA_H   = 48;  // historial que se revisa para saber desde cuándo está ahí

// Estado de ralentí instantáneo para la vista en vivo (tooltip y panel "En vivo").
// Usa un umbral en vez de === 0 para no parpadear cuando el GPS reporta 1-2 km/h estando parado.
export const estaEnRalenti = (u) => !!u?.motor && (u?.velocidad ?? 0) <= RALENTI_VEL_MAX;

// `motor` es la ignición, no el movimiento: un camión parado con motor encendido está en ralentí.
export const estadoUnidad = (u) =>
  estaEnRalenti(u) ? { emoji: "🟡", texto: "Ralentí · motor encendido" }
  : u?.motor       ? { emoji: "🟢", texto: "En movimiento" }
  :                  { emoji: "⚪", texto: "Motor apagado" };

// Polling
export const POLL_POSITIONS_MS  = 15000;
export const POLL_ALERTAS_MS    = 30000;

// Visitas a enlaces compartidos: las páginas públicas laten cada ≤ 20 s,
// así que un visitante sin latido en 45 s ya cerró o dejó la pestaña en segundo plano.
export const PING_HISTORIAL_MS  = 20000;
export const VISITA_ACTIVA_MS   = 45000;

// Mapa
export const CENTRO_MX = [23.6345, -102.5528];

// Mapa oscuro: Esri Dark Gray Canvas (sin API key). CARTO dark_all dejó de servir
// sin key en 2026-11 (devuelve un tile "API KEY REQUIRED"). Usar <CapaOscura />.
const ESRI_CANVAS = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
export const TILE_OSCURO_BASE      = `${ESRI_CANVAS}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
export const TILE_OSCURO_ETIQUETAS = `${ESRI_CANVAS}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
export const TILE_OSCURO_MAX_NATIVO = 16; // Esri Canvas no tiene tiles más allá de z16; Leaflet los escala
