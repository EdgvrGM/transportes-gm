// Constantes compartidas del módulo GPS
export const WIALON_PROXY_URL = "https://wialon-proxy.transportesgm.workers.dev";
export const WIALON_IMG_BASE  = "https://hst-api.wialon.com";

// Geocerca del patio (centro de operaciones)
export const PATIO_LAT     = 18.9350;
export const PATIO_LNG     = -103.8899;
export const PATIO_RADIO_M = 70;

// Umbrales
export const RALENTI_UMBRAL_MS  = 15 * 60 * 1000;
export const VELOCIDAD_ALERTA   = 80;
export const VELOCIDAD_EXCESO   = 105; // exceso marcado en la ruta del historial
export const RASTRO_MAX         = 10;
export const RALENTI_VEL_MAX    = 2;   // km/h — por debajo de esto se considera "parado" (tolera ruido GPS)

// Estado de ralentí instantáneo para la vista en vivo (tooltip y panel "En vivo").
// Usa un umbral en vez de === 0 para no parpadear cuando el GPS reporta 1-2 km/h estando parado.
export const estaEnRalenti = (u) => !!u?.motor && (u?.velocidad ?? 0) <= RALENTI_VEL_MAX;

// Polling
export const POLL_POSITIONS_MS  = 15000;
export const POLL_ALERTAS_MS    = 30000;

// Mapa
export const CENTRO_MX = [23.6345, -102.5528];
