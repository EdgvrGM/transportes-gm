import { supabase } from "@/supabaseClient";
import { FECHA_LIMITE_ARCHIVO } from "@/lib/archivo";
import { BUCKET_DOCS } from "@/components/legal/documentosConfig";

// Registro único de eliminaciones. Lo usan el botón "Eliminar" de cada módulo
// (admin) y el botón "Aprobar" de la bandeja de solicitudes: así aprobar borra
// exactamente igual que el módulo, limpieza de Storage incluida.
// Toda eliminación nueva del ERP se agrega aquí — ver CLAUDE.md "Roles".

export const SIN_FILAS = "No se eliminó: no tienes permiso o el registro ya no existe.";
export const TIENE_VIAJES_ACTIVOS = "TIENE_VIAJES_ACTIVOS";

// Un DELETE bloqueado por RLS no da error: devuelve 0 filas. Por eso se pide
// la fila borrada de vuelta y se falla si no llegó ninguna.
async function borrarFila(tabla, columna, valor) {
  const { data, error } = await supabase.from(tabla).delete().eq(columna, valor).select(columna);
  if (error) throw error;
  if (!data?.length) throw new Error(SIN_FILAS);
}

// Borra todas las fotos de uno o varios viajes (carpeta evidencias/{viajeId}).
// Best-effort: no bloquea si el Storage falla.
export async function limpiarFotosDeViajes(viajeIds) {
  for (const vid of viajeIds) {
    try {
      const { data: files } = await supabase.storage.from("evidencias").list(`evidencias/${vid}`);
      if (files?.length) {
        await supabase.storage.from("evidencias").remove(files.map((f) => `evidencias/${vid}/${f.name}`));
      }
    } catch (_e) {
      // ignorar errores de limpieza de Storage
    }
  }
}

async function tieneViajesActivos(columna, id) {
  const { data } = await supabase
    .from("Viaje")
    .select("id")
    .eq(columna, id)
    .gte("fecha", FECHA_LIMITE_ARCHIVO)
    .limit(1);
  return data?.length > 0;
}

async function eliminarViaje(id) {
  await borrarFila("Viaje", "id", id);
}

// Quita un viaje de su semana: la fila de viajes_registrados y su entrada en
// ProgramaCargas.programacion (si no, el siguiente guardado de la semana lo
// volvería a crear). La fila se borra primero: si falla por un Viaje vinculado,
// la programación queda intacta.
async function eliminarViajeProgramado(id) {
  const { data: vr, error } = await supabase
    .from("viajes_registrados")
    .select("id, programa_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!vr) throw new Error(SIN_FILAS);

  try {
    await borrarFila("viajes_registrados", "id", id);
  } catch (e) {
    if (e.message === SIN_FILAS) throw e;
    throw new Error(`No se pudo eliminar el viaje. Es probable que ya tenga consumos vinculados. Detalle: ${e.message}`);
  }

  if (vr.programa_id) {
    const { data: programa } = await supabase
      .from("ProgramaCargas")
      .select("programacion")
      .eq("id", vr.programa_id)
      .maybeSingle();
    if (programa?.programacion) {
      const programacion = Object.fromEntries(
        Object.entries(programa.programacion).map(([dia, viajes]) => [
          dia,
          Array.isArray(viajes) ? viajes.filter((v) => String(v.id) !== String(id)) : viajes,
        ]),
      );
      const { error: updErr } = await supabase
        .from("ProgramaCargas")
        .update({ programacion })
        .eq("id", vr.programa_id);
      if (updErr) throw updErr;
    }
  }

  await limpiarFotosDeViajes([id]);
}

async function eliminarSemana(id) {
  // Reunir los viajes antes de borrar la semana (la cascada los elimina)
  // para poder limpiar sus fotos del Storage.
  const { data: viajesDeSemana } = await supabase
    .from("viajes_registrados")
    .select("id")
    .eq("programa_id", id);

  await borrarFila("ProgramaCargas", "id", id);

  if (viajesDeSemana?.length) {
    await limpiarFotosDeViajes(viajesDeSemana.map((v) => v.id));
  }
}

async function eliminarCliente(id) {
  try {
    await borrarFila("Cliente", "id", id);
  } catch (e) {
    if (e.message?.includes("foreign key")) {
      throw new Error("Este cliente tiene viajes asignados y no puede eliminarse mientras tenga registros activos.");
    }
    throw e;
  }
}

async function eliminarConductor(id) {
  if (await tieneViajesActivos("conductor_id", id)) throw new Error(TIENE_VIAJES_ACTIVOS);
  // Sin viajes activos — desligar registros históricos para poder eliminar
  await supabase.from("viajes_registrados").update({ conductor_id: null }).eq("conductor_id", id);
  await supabase.from("Viaje").update({ conductor_id: null }).eq("conductor_id", id);
  await borrarFila("Conductor", "id", id);
}

async function eliminarCamion(id) {
  if (await tieneViajesActivos("camion_id", id)) throw new Error(TIENE_VIAJES_ACTIVOS);
  await supabase.from("Viaje").update({ camion_id: null }).eq("camion_id", id);
  await borrarFila("Camion", "id", id);
}

async function eliminarRemolque(id) {
  if (await tieneViajesActivos("remolque_id", id)) throw new Error(TIENE_VIAJES_ACTIVOS);
  await supabase.from("Viaje").update({ remolque_id: null }).eq("remolque_id", id);
  await borrarFila("Remolque", "id", id);
}

async function eliminarCosto(id) {
  await borrarFila("CostoUnidad", "id", id);
}

async function eliminarContenedor(id) {
  // Las fotos se borran después de la fila: si la fila no se pudo borrar,
  // el contenedor no pierde sus fotos.
  await borrarFila("contenedores_vacios", "id", id);
  try {
    const { data: archivos } = await supabase.storage.from("vacios").list(`vacios/${id}`);
    if (archivos?.length) {
      await supabase.storage.from("vacios").remove(archivos.map((f) => `vacios/${id}/${f.name}`));
    }
  } catch (_e) {
    // ignorar errores de limpieza de Storage
  }
}

async function eliminarDocumento(id) {
  const { data: doc, error } = await supabase
    .from("documentos_legales")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new Error(SIN_FILAS);
  // La fila es la fuente de verdad; el objeto se borra después para que un
  // fallo de Storage no deje el documento visible pero ya inaccesible.
  await borrarFila("documentos_legales", "id", id);
  await supabase.storage.from(BUCKET_DOCS).remove([doc.storage_path]);
}

export const ELIMINACIONES = {
  Viaje:               { etiqueta: "Viaje registrado",    pagina: "FuelViajes",         eliminar: eliminarViaje,           invalidar: [["viajes"]] },
  viajes_registrados:  { etiqueta: "Viaje del programa",  pagina: "FuelProgramaCargas", eliminar: eliminarViajeProgramado, invalidar: [["programaCargas"], ["viajesRegistrados"]] },
  ProgramaCargas:      { etiqueta: "Semana del programa", pagina: "FuelProgramaCargas", eliminar: eliminarSemana,          invalidar: [["programaCargas"], ["viajesRegistrados"]] },
  Cliente:             { etiqueta: "Cliente",             pagina: "Clientes",           eliminar: eliminarCliente,         invalidar: [["clientes"]] },
  Conductor:           { etiqueta: "Conductor",           pagina: "FuelConductores",    eliminar: eliminarConductor,       invalidar: [["conductores"]] },
  Camion:              { etiqueta: "Camión",              pagina: "FuelCamiones",       eliminar: eliminarCamion,          invalidar: [["camiones"]] },
  Remolque:            { etiqueta: "Remolque",            pagina: "FuelRemolques",      eliminar: eliminarRemolque,        invalidar: [["remolques"]] },
  CostoUnidad:         { etiqueta: "Gasto de unidad",     pagina: "CostosUnidad",       eliminar: eliminarCosto,           invalidar: [["costos"], ["panel-costos-semana"]] },
  contenedores_vacios: { etiqueta: "Contenedor (vacíos)", pagina: "ControlVacios",      eliminar: eliminarContenedor,      invalidar: [["controlVacios"], ["panel-vacios-pendientes"]] },
  documentos_legales:  { etiqueta: "Documento legal",     pagina: "DocumentacionLegal", eliminar: eliminarDocumento,       invalidar: [["documentos_legales"]] },
};

// Elimina un registro y marca como aprobada la solicitud pendiente que tenga
// (si el admin lo borra desde el módulo, la solicitud no se queda colgada).
export async function eliminarRegistro(tabla, id) {
  const config = ELIMINACIONES[tabla];
  if (!config) throw new Error(`Tipo de registro desconocido: ${tabla}`);
  await config.eliminar(id);

  const { data: { session } } = await supabase.auth.getSession();
  await supabase
    .from("solicitud_eliminacion")
    .update({ estado: "aprobada", resuelto_por: session?.user?.id ?? null, resuelto_at: new Date().toISOString() })
    .eq("tabla", tabla)
    .eq("registro_id", String(id))
    .eq("estado", "pendiente");
}

export function invalidarEliminacion(queryClient, tabla) {
  for (const queryKey of ELIMINACIONES[tabla]?.invalidar ?? []) {
    queryClient.invalidateQueries({ queryKey });
  }
  queryClient.invalidateQueries({ queryKey: ["solicitudes-eliminacion"] });
}

export function mensajeEliminacion(err) {
  if (err?.message === TIENE_VIAJES_ACTIVOS) return "Tiene viajes activos y no puede eliminarse.";
  return err?.message || "No se pudo eliminar.";
}
