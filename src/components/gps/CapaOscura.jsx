import { LayerGroup, TileLayer } from "react-leaflet";
import { TILE_OSCURO_BASE, TILE_OSCURO_ETIQUETAS, TILE_OSCURO_MAX_NATIVO } from "./constants";

// Mapa base oscuro (fondo + etiquetas de ciudades). Única fuente para el modo oscuro
// de todos los mapas: panel, Rastreo GPS y páginas públicas.
export default function CapaOscura() {
  return (
    <LayerGroup>
      <TileLayer
        attribution="&copy; Esri"
        url={TILE_OSCURO_BASE}
        maxNativeZoom={TILE_OSCURO_MAX_NATIVO}
        maxZoom={19}
      />
      <TileLayer
        url={TILE_OSCURO_ETIQUETAS}
        maxNativeZoom={TILE_OSCURO_MAX_NATIVO}
        maxZoom={19}
      />
    </LayerGroup>
  );
}
