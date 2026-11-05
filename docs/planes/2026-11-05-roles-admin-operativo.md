# Plan — Roles Administrativo / Operativo con solicitudes de eliminación

Diseño aprobado el 2026-11-05: dos roles. El **operativo** tiene el mismo acceso que el admin, pero no puede eliminar nada; en su lugar crea una **solicitud** que el admin aprueba con un clic desde una bandeja (opción A).

## Hallazgos que condicionan el plan

1. **Un DELETE bloqueado por RLS no da error**: Supabase devuelve 0 filas y ningún error. `FuelViajes.eliminarMutation` no revisa filas → al operativo le "funcionaría" sin borrar nada. Toda función de eliminar compartida debe usar `.select("id")` y fallar si no regresa filas.
2. **Eliminaciones implícitas** (no tienen botón "Eliminar", pero hacen DELETE):
   - Guardar una semana del Programa borra los `viajes_registrados` que se quitaron (`FuelProgramaCargas.jsx:469`).
   - `ModalConfiguracion` reescribe `UnidadGPS` con delete + insert en cada guardado.
   - `FuelViajes` reemplaza `ViajeRuta` con delete + insert al editar el tramo GPS.
   - `ControlVacios` borra del Storage las fotos que se quitan al editar.
3. Los viajes nuevos del editor ya traen `id` (timestamp de 13 dígitos) antes de guardarse; "guardado" se determina comparando con los `viajes_registrados` del programa en BD.

## Decisiones incluidas

| Caso | Decisión |
|---|---|
| Rol por defecto | Sin fila en `perfil_usuario` = **operativo** (menor privilegio). La migración registra como admin las cuentas internas que existen hoy. |
| Exentas (el operativo sí puede borrar) | `AlertaGPS`, `EventoGeocerca`, `RastreoCompartido` (revocar enlace), `UnidadGPS` y `ViajeRuta` (se reescriben al guardar), y la telemetría (`PosicionGPS`, `RalentiActivo`, `RalentiHistorial`, `RastreoVisita`). |
| Storage | El operativo solo borra archivos que **él subió hace menos de 30 min** (cancelar una subida). Las fotos ya guardadas de un contenedor: la ✕ se oculta para el operativo. |
| Viaje sin guardar en el editor de semana | El operativo lo puede quitar libremente. Si ya está guardado → "Solicitar eliminación". |
| Evidencias (archivado) y Mantenimiento (archivado) | Solo quedan protegidos por la BD; sin cambios de UI. |
| Quién ve la bandeja | Todos los internos. El operativo la ve de solo lectura (sabe si le aprobaron o rechazaron); los botones Aprobar/Rechazar y el contador del menú solo los ve el admin. |
| Crear cuentas operativas | Desde el panel de Supabase (Authentication → Add user). No se crea una pantalla de usuarios en esta fase. |

## Tareas

### T1 — Migración `supabase/migrations/20261105_roles_eliminacion.sql`

Se ejecuta en el SQL Editor de Supabase (tú). Antes de correrla, revisar cuántas cuentas internas existen; todas quedarán como admin:

```sql
select u.email from auth.users u
where not exists (select 1 from public.cuenta_cliente c where c.user_id = u.id);
```

Contenido:

```sql
-- Perfil y rol de usuarios internos
create table if not exists public.perfil_usuario (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  rol        text not null default 'operativo' check (rol in ('admin', 'operativo')),
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfil_usuario where user_id = auth.uid() and rol = 'admin');
$$;
revoke execute on function public.es_admin() from anon;
grant  execute on function public.es_admin() to authenticated;

-- Las cuentas internas que existen hoy son admin
insert into public.perfil_usuario (user_id, rol, email)
select u.id, 'admin', u.email from auth.users u
where not exists (select 1 from public.cuenta_cliente c where c.user_id = u.id)
on conflict (user_id) do nothing;

alter table public.perfil_usuario enable row level security;
create policy "perfil_lectura_internos" on public.perfil_usuario
  for select to authenticated using (public.es_interno());
create policy "perfil_escritura_admin" on public.perfil_usuario
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Solicitudes de eliminación
create table if not exists public.solicitud_eliminacion (
  id                   uuid primary key default gen_random_uuid(),
  tabla                text not null,
  registro_id          text not null,
  descripcion          text not null,
  motivo               text not null,
  estado               text not null default 'pendiente'
                       check (estado in ('pendiente', 'aprobada', 'rechazada')),
  solicitado_por       uuid not null default auth.uid() references auth.users(id),
  solicitado_por_email text,
  resuelto_por         uuid references auth.users(id),
  resuelto_at          timestamptz,
  nota_resolucion      text,
  created_at           timestamptz not null default now()
);
create unique index if not exists solicitud_unica_pendiente
  on public.solicitud_eliminacion (tabla, registro_id) where estado = 'pendiente';

alter table public.solicitud_eliminacion enable row level security;
create policy "solicitud_lectura_internos" on public.solicitud_eliminacion
  for select to authenticated using (public.es_interno());
create policy "solicitud_alta_internos" on public.solicitud_eliminacion
  for insert to authenticated
  with check (public.es_interno() and solicitado_por = auth.uid() and estado = 'pendiente');
create policy "solicitud_resuelve_admin" on public.solicitud_eliminacion
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Solo el admin elimina. Política RESTRICTIVA: se suma (AND) a las permisivas
-- existentes ("interno_full"), así que no hay que reescribirlas.
do $$
declare
  t text;
  exentas text[] := array[
    'AlertaGPS', 'EventoGeocerca', 'RastreoCompartido', 'UnidadGPS', 'ViajeRuta',
    'PosicionGPS', 'RalentiActivo', 'RalentiHistorial', 'RastreoVisita'
  ];
begin
  for t in select tablename from pg_tables where schemaname = 'public' and rowsecurity loop
    if t = any(exentas) then continue; end if;
    execute format('drop policy if exists "solo_admin_elimina" on public.%I', t);
    execute format(
      'create policy "solo_admin_elimina" on public.%I as restrictive '
      'for delete to authenticated using (public.es_admin())', t);
  end loop;
end $$;

-- Storage: el operativo solo borra lo que subió en los últimos 30 min
drop policy if exists "solo_admin_elimina_archivos" on storage.objects;
create policy "solo_admin_elimina_archivos" on storage.objects as restrictive
  for delete to authenticated
  using (
    public.es_admin()
    or (coalesce(owner_id, owner::text) = auth.uid()::text
        and created_at > now() - interval '30 minutes')
  );

-- VERIFICACIÓN: tablas SIN RLS quedan sin esta protección.
-- select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
```

### T2 — Rol en el frontend
- `src/lib/rol.js`: agregar `getRolInterno()` → `select rol from perfil_usuario where user_id = <uid>`; sin fila = `"operativo"`.
- `src/hooks/useRol.js` (nuevo): `useQuery(["rol", userId])`, regresa `{ esAdmin, rol, cargando }`. Mientras carga, `esAdmin = false`.

### T3 — Registro único de eliminaciones `src/lib/eliminaciones.js` (nuevo)
Saca la lógica de cada `mutationFn` de eliminar a funciones puras. La usan tanto el botón del módulo (admin) como la bandeja:

```js
export const ELIMINACIONES = {
  Viaje:               { etiqueta: "Viaje registrado",       pagina: "FuelViajes",          eliminar: eliminarViaje,           invalidar: [["viajes"]] },
  viajes_registrados:  { etiqueta: "Viaje del programa",     pagina: "FuelProgramaCargas",  eliminar: eliminarViajeProgramado, invalidar: [["programaCargas"], ["viajesRegistrados"]] },
  ProgramaCargas:      { etiqueta: "Semana del programa",    pagina: "FuelProgramaCargas",  eliminar: eliminarSemana,          invalidar: [["programaCargas"], ["viajesRegistrados"]] },
  Cliente:             { etiqueta: "Cliente",                pagina: "Clientes",            eliminar: eliminarCliente,         invalidar: [["clientes"]] },
  Conductor:           { etiqueta: "Conductor",              pagina: "FuelConductores",     eliminar: eliminarConductor,       invalidar: [["conductores"]] },
  Camion:              { etiqueta: "Camión",                 pagina: "FuelCamiones",        eliminar: eliminarCamion,          invalidar: [["camiones"]] },
  Remolque:            { etiqueta: "Remolque",               pagina: "FuelRemolques",       eliminar: eliminarRemolque,        invalidar: [["remolques"]] },
  CostoUnidad:         { etiqueta: "Gasto de unidad",        pagina: "CostosUnidad",        eliminar: eliminarCosto,           invalidar: [["costos"], ["panel-costos-semana"]] },
  contenedores_vacios: { etiqueta: "Contenedor (vacíos)",    pagina: "ControlVacios",       eliminar: eliminarContenedor,      invalidar: [["controlVacios"], ["panel-vacios-pendientes"]] },
  documentos_legales:  { etiqueta: "Documento legal",        pagina: "DocumentacionLegal",  eliminar: eliminarDocumento,       invalidar: [["documentos_legales"]] },
};
```

- Cada `eliminarX(id)` copia la lógica actual tal cual: la validación de viajes activos en catálogos, desligar `Viaje` históricos, `limpiarFotosDeViajes` (se mueve aquí desde `FuelProgramaCargas`) y la limpieza de Storage de vacíos y documentos.
- Todas terminan con `.delete().eq(...).select("id")`, y si no regresa filas lanzan `"No se eliminó: sin permiso o el registro ya no existe"`.
- `eliminarViajeProgramado(id)` es nueva. Lee el `ProgramaCargas` del viaje, quita la entrada con ese `id` de todos los días de `programacion`, guarda el programa, borra la fila de `viajes_registrados` y limpia sus fotos.
- Los errores que hoy se traducen (`TIENE_VIAJES_ACTIVOS`, FK de cliente) se conservan como mensajes legibles.

### T4 — Solicitudes: hooks y diálogo (`src/components/solicitudes/`)
- `useSolicitudes.js`:
  - `useSolicitudesPendientes(tabla)` → `Set` de `registro_id` pendientes, para la etiqueta.
  - `useContadorSolicitudes()` → número de pendientes para el menú (refetch 60 s).
  - `useResolverSolicitud()`: al aprobar llama `ELIMINACIONES[tabla].eliminar(registro_id)` y **luego** marca la solicitud como `aprobada` (si la eliminación falla, la solicitud sigue pendiente y se muestra el error). Rechazar pide una nota.
- `useSolicitarEliminacion(tabla)` → `{ solicitar(id, descripcion), dialogo, pendientes }`. El diálogo pide el motivo (obligatorio) e inserta con `solicitado_por_email` de la sesión. Si choca con el índice único → toast "Ya hay una solicitud pendiente".
- Toasts con `useToast`, nunca `alert()`.

### T5 — Bandeja `src/pages/SolicitudesEliminacion.jsx` (nueva)
- Tabs Pendientes / Historial. Cada tarjeta muestra el tipo (`etiqueta`), la descripción, el motivo, quién la pidió y cuándo.
- Para el admin: botones "Aprobar y eliminar" (con confirmación) y "Rechazar".
- Ruta `/solicitudeseliminacion` con `lazy` + `PAGE_NAMES` en `src/pages/index.jsx` y en `systemPages` de `Layout.jsx`.

### T6 — Menú lateral (`src/pages/Layout.jsx`)
- Entrada "Solicitudes" (ícono `Inbox`) después de Documentación Legal, con un badge rojo de pendientes solo para el admin.
- Junto al usuario, una etiqueta "Operativo" cuando aplique.

### T7–T14 — Conectar cada módulo
En cada uno, el botón de eliminar hace `esAdmin ? <flujo actual> : solicitar(id, descripcion)`, el registro muestra la etiqueta "Eliminación solicitada" si está en `pendientes`, y el `mutationFn` del admin pasa a llamar `ELIMINACIONES[tabla].eliminar`.

| # | Archivo | Detalle |
|---|---|---|
| T7 | `src/pages/FuelViajes.jsx` | Botón eliminar viaje |
| T8 | `src/pages/FuelProgramaCargas.jsx` | Eliminar semana (`:1044`). En el editor (`:1401`, `:1567`): si el viaje ya está en BD y el usuario es operativo → solicitar. Si no está guardado → se quita como hoy |
| T9 | `src/pages/Clientes.jsx` | |
| T10 | `src/pages/FuelConductores.jsx`, `FuelCamiones.jsx`, `FuelRemolques.jsx` | Mismo patrón en los tres |
| T11 | `src/components/costos/useCostos.js` + `ListaGastos.jsx` | `useEliminarCosto` usa el registro; la lista decide entre eliminar y solicitar |
| T12 | `src/pages/ControlVacios.jsx` | Eliminar contenedor; en el formulario, la ✕ de fotos ya guardadas se oculta al operativo (las de esta sesión sí se pueden quitar) |
| T13 | `src/components/legal/DocumentosDialog.jsx` | Borrar documento |
| T14 | `CLAUDE.md` | Sección "Roles y solicitudes de eliminación": tabla, regla "toda eliminación nueva se registra en `ELIMINACIONES` y se ofrece como solicitud al operativo", exentas, y la trampa de que un DELETE bloqueado no da error |

### T15 — Verificación
1. `npm run build` sin errores.
2. Tú: correr la migración (T1) en Supabase y crear una cuenta operativa de prueba en Authentication.
3. Con la cuenta admin: eliminar sigue funcionando igual en los 10 tipos de registro.
4. Con la cuenta operativa:
   - cada botón crea una solicitud y el registro muestra la etiqueta;
   - una petición DELETE directa a la API no borra nada;
   - quitar un viaje sin guardar sí funciona;
   - guardar la configuración GPS sí funciona.
5. Admin: aprobar desde la bandeja elimina el registro (incluidas sus fotos) y la solicitud pasa a "aprobada"; rechazar la deja en "rechazada" con la nota.

No puedo crear la cuenta de prueba por ti: Supabase es un servicio en producción, no local.

## Riesgo conocido
Si un operativo tiene abierto el editor de una semana mientras el admin aprueba quitar un viaje de esa semana, al guardar el editor el viaje vuelve a aparecer (el editor guarda su copia vieja de `programacion`). Es raro y no se corrige en esta fase.
