import { wialonFetch } from "@/lib/wialonFetch";
import { WIALON_PROXY_URL } from "@/components/gps/constants";

// Posiciones en vivo para los widgets del panel (compartido por EstadoFlota y PulsoDia).
export async function fetchPositions(unidadesInactivas = []) {
  const exclude = unidadesInactivas.join(",");
  const url = exclude
    ? `${WIALON_PROXY_URL}?action=positions&exclude=${exclude}`
    : `${WIALON_PROXY_URL}?action=positions`;
  const r = await wialonFetch(url);
  if (!r.ok) throw new Error("No se pudieron cargar posiciones");
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}
