import { supabase } from "@/supabaseClient";
import { BUCKET_DOCS, URL_FIRMADA_SEG } from "./documentosConfig";

// El bucket es privado: nada se puede enlazar directo, todo pasa por una URL
// firmada de vida corta o por una descarga autenticada.

export async function urlFirmada(storagePath, segundos = URL_FIRMADA_SEG) {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCS)
    .createSignedUrl(storagePath, segundos);
  return { url: data?.signedUrl || null, error };
}

export async function urlsFirmadas(rutas, segundos = URL_FIRMADA_SEG) {
  if (!rutas?.length) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCS)
    .createSignedUrls(rutas, segundos);
  if (error) throw error;
  const mapa = {};
  (data || []).forEach((r) => {
    if (r.signedUrl) mapa[r.path] = r.signedUrl;
  });
  return mapa;
}

// Descarga el objeto en vez de enlazar a la URL firmada: así el navegador lo
// guarda con su nombre original en lugar de abrir una pestaña con un nombre
// autogenerado por Storage.
export async function descargarDocumento(doc) {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCS)
    .download(doc.storage_path);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.nombre_archivo || "documento";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocar de inmediato aborta la descarga en Safari; un tick es suficiente.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
