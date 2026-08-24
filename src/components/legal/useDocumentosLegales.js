import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";

export const QK_DOCS = ["documentos_legales"];

// Todas las filas del archivo. Es metadata ligera (sin binarios) y la página la
// usa tanto para el contador de cada renglón como para el diálogo, así que una
// sola consulta compartida evita una petición por expediente abierto.
export function useDocumentosLegales() {
  return useQuery({
    queryKey: QK_DOCS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_legales")
        .select(
          "id, entidad_tipo, entidad_id, tipo_doc, nombre_archivo, storage_path, mime_type, tamano_bytes, fecha_vencimiento, notas, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Mapa "conductor:12" → nº de documentos, para las insignias de las tablas.
export function contarPorEntidad(docs) {
  const mapa = new Map();
  (docs || []).forEach((d) => {
    const k = `${d.entidad_tipo}:${d.entidad_id}`;
    mapa.set(k, (mapa.get(k) || 0) + 1);
  });
  return mapa;
}
