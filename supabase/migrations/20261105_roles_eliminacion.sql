-- ════════════════════════════════════════════════════════════════════════════
-- Roles Administrativo / Operativo + solicitudes de eliminación — 2026-11-05
--
-- El operativo tiene el mismo acceso que el admin salvo ELIMINAR: crea una fila
-- en solicitud_eliminacion y el admin la aprueba desde /solicitudeseliminacion.
--
-- ANTES DE CORRER: todas las cuentas internas existentes quedarán como admin.
--   select u.email from auth.users u
--   where not exists (select 1 from public.cuenta_cliente c where c.user_id = u.id);
--
-- Idempotente: se puede volver a correr sin duplicar nada.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Perfil y rol ─────────────────────────────────────────────────────────────
-- Sin fila = operativo (menor privilegio).
create table if not exists public.perfil_usuario (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  rol        text not null default 'operativo' check (rol in ('admin', 'operativo')),
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfil_usuario where user_id = auth.uid() and rol = 'admin'
  );
$$;

revoke execute on function public.es_admin() from anon;
grant  execute on function public.es_admin() to authenticated;

insert into public.perfil_usuario (user_id, rol, email)
select u.id, 'admin', u.email
from auth.users u
where not exists (select 1 from public.cuenta_cliente c where c.user_id = u.id)
on conflict (user_id) do nothing;

alter table public.perfil_usuario enable row level security;

drop policy if exists "perfil_lectura_internos" on public.perfil_usuario;
create policy "perfil_lectura_internos" on public.perfil_usuario
  for select to authenticated using (public.es_interno());

drop policy if exists "perfil_escritura_admin" on public.perfil_usuario;
create policy "perfil_escritura_admin" on public.perfil_usuario
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ── Solicitudes de eliminación ───────────────────────────────────────────────
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

-- Una sola solicitud pendiente por registro.
create unique index if not exists solicitud_unica_pendiente
  on public.solicitud_eliminacion (tabla, registro_id) where estado = 'pendiente';

alter table public.solicitud_eliminacion enable row level security;

drop policy if exists "solicitud_lectura_internos" on public.solicitud_eliminacion;
create policy "solicitud_lectura_internos" on public.solicitud_eliminacion
  for select to authenticated using (public.es_interno());

drop policy if exists "solicitud_alta_internos" on public.solicitud_eliminacion;
create policy "solicitud_alta_internos" on public.solicitud_eliminacion
  for insert to authenticated
  with check (public.es_interno() and solicitado_por = auth.uid() and estado = 'pendiente');

drop policy if exists "solicitud_resuelve_admin" on public.solicitud_eliminacion;
create policy "solicitud_resuelve_admin" on public.solicitud_eliminacion
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ── Solo el admin elimina ────────────────────────────────────────────────────
-- Política RESTRICTIVA: se combina con AND con las permisivas existentes
-- ("interno_full"), así que no hay que reescribirlas. OJO: un DELETE bloqueado
-- por RLS NO devuelve error, solo 0 filas — el frontend debe revisarlo.
-- Exentas: avisos GPS, enlaces compartidos (revocar), tablas que se reescriben
-- con delete+insert al guardar (UnidadGPS, ViajeRuta) y telemetría del worker.
do $$
declare
  t text;
  exentas text[] := array[
    'AlertaGPS', 'EventoGeocerca', 'RastreoCompartido', 'UnidadGPS', 'ViajeRuta',
    'PosicionGPS', 'RalentiActivo', 'RalentiHistorial', 'RastreoVisita'
  ];
begin
  for t in
    select tablename from pg_tables where schemaname = 'public' and rowsecurity
  loop
    if t = any(exentas) then continue; end if;
    execute format('drop policy if exists "solo_admin_elimina" on public.%I', t);
    execute format(
      'create policy "solo_admin_elimina" on public.%I as restrictive '
      'for delete to authenticated using (public.es_admin())',
      t
    );
    raise notice 'solo_admin_elimina → %', t;
  end loop;
end $$;

-- ── Storage: el operativo solo borra lo que él subió hace < 30 min ────────────
-- (cancelar una subida no deja huérfanos; lo ya guardado requiere solicitud).
drop policy if exists "solo_admin_elimina_archivos" on storage.objects;
create policy "solo_admin_elimina_archivos" on storage.objects as restrictive
  for delete to authenticated
  using (
    public.es_admin()
    or (
      coalesce(owner_id, owner::text) = auth.uid()::text
      and created_at > now() - interval '30 minutes'
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (correr aparte):
--   -- Tablas SIN RLS: quedan sin esta protección.
--   select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
--   -- Roles asignados:
--   select email, rol from public.perfil_usuario;
-- ════════════════════════════════════════════════════════════════════════════
