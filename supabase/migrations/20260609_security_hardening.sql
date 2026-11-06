-- ════════════════════════════════════════════════════════════════════════════
-- Endurecimiento de seguridad (RLS) — 2026-06-09
--
-- Corrige:
--   1. Tabla "Evidencia" abierta a anónimos (FOR ALL USING(true) → rol public).
--   2. "RastreoCompartido" con RLS desactivado (lectura/escritura pública total).
--   3. Cuentas de cliente (portal) podían leer/modificar toda la flota y el ERP
--      pegándole directo a la REST API (las políticas eran `authenticated USING(true)`).
--
-- Estrategia: una sola política "solo usuarios internos" en cada tabla operativa.
-- Un usuario interno = autenticado y SIN fila en `cuenta_cliente`. Las cuentas de
-- cliente sólo acceden a sus datos vía la Edge Function `rastreo-cliente`
-- (service_role, que bypassa RLS). El sitio público sigue leyendo `Unidad`.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Helper: ¿el usuario actual es interno (no es cuenta de cliente)? ───────────
-- SECURITY DEFINER para poder consultar cuenta_cliente sin que su propia RLS
-- bloquee la verificación. STABLE: el resultado no cambia dentro de la consulta.
create or replace function public.es_interno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated'
     and not exists (
       select 1 from public.cuenta_cliente where user_id = auth.uid()
     );
$$;

revoke execute on function public.es_interno() from anon;
grant  execute on function public.es_interno() to authenticated;

-- ── Bloqueo "solo internos" sobre todas las tablas operativas/de negocio ───────
-- Idempotente: borra TODAS las políticas previas de cada tabla y deja una sola.
-- NO incluye: "Unidad" (catálogo público del sitio), cuenta_cliente / _unidad
-- (tienen sus propias políticas self-select). Ajusta el array si falta/sobra
-- alguna tabla en tu esquema — las que no existan se omiten sin error.
do $$
declare
  t text;
  p record;
  tablas text[] := array[
    'Viaje', 'viajes_registrados', 'ProgramaCargas',
    'Cliente', 'Conductor', 'Camion', 'Remolque',
    'Liquidacion',
    'OrdenTrabajo', 'OrdenTrabajoLinea', 'CatalogoServicio', 'CatalogoServicioLinea',
    'Evidencia',
    'UnidadGPS', 'PosicionGPS', 'AlertaGPS', 'EventoGeocerca',
    'RalentiActivo', 'RalentiHistorial',
    'contenedores_vacios',
    'RastreoCompartido'
  ];
begin
  foreach t in array tablas loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'Endurecimiento: tabla omitida (no existe): %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    execute format(
      'create policy "interno_full" on public.%I '
      'for all to authenticated '
      'using (public.es_interno()) with check (public.es_interno())',
      t
    );

    raise notice 'Endurecimiento: % → solo internos', t;
  end loop;
end $$;

-- ── "Unidad": catálogo público del sitio (/unidades lo lee anónimo) ────────────
-- Mantener lectura anónima, pero escritura solo a internos.
do $$
begin
  if to_regclass('public."Unidad"') is not null then
    execute 'alter table public."Unidad" enable row level security';

    execute 'drop policy if exists "Unidad lectura publica" on public."Unidad"';
    execute 'create policy "Unidad lectura publica" on public."Unidad" '
            'for select to anon, authenticated using (true)';

    execute 'drop policy if exists "Unidad escritura internos" on public."Unidad"';
    execute 'create policy "Unidad escritura internos" on public."Unidad" '
            'for all to authenticated using (public.es_interno()) with check (public.es_interno())';
  end if;
end $$;

-- ── Lectura pública de RastreoCompartido SOLO por token exacto (vía RPC) ───────
-- La tabla queda cerrada (política interno_full de arriba). El rastreo público
-- (/rastreo/:token, /historial/:token) y la Edge Function OpenGraph leen por
-- esta función SECURITY DEFINER, que devuelve una sola fila por token exacto.
-- El token es aleatorio de 32 hex → no enumerable. No filtra expiración: la
-- página distingue "expirado" vs "inválido" como hasta ahora.
create or replace function public.rastreo_por_token(p_token text)
returns table (
  wialon_unit_id  bigint,
  wialon_nombre   text,
  expires_at      timestamptz,
  tipo            text,
  historial_desde timestamptz,
  historial_hasta timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select wialon_unit_id, wialon_nombre, expires_at, tipo, historial_desde, historial_hasta
  from public."RastreoCompartido"
  where token = p_token
  limit 1;
$$;

grant execute on function public.rastreo_por_token(text) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (ejecutar aparte para auditar el estado final):
--
--   -- Tablas SIN RLS (deberían ser muy pocas: vistas/tablas de sistema):
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by rowsecurity, tablename;
--
--   -- Políticas que aún otorguen acceso amplio (revisar manualmente):
--   select tablename, policyname, roles, qual
--   from pg_policies where schemaname = 'public' order by tablename;
-- ════════════════════════════════════════════════════════════════════════════
