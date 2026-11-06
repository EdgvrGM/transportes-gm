-- ════════════════════════════════════════════════════════════════════════════
-- Correcciones de la auditoría de seguridad — 2026-11-06
--
--   1. es_interno() pasa de lista negra (todo el que no es cliente) a LISTA
--      BLANCA: interno = tiene fila en perfil_usuario. Con el registro público
--      abierto, cualquiera que se diera de alta era "operativo".
--   2. "ViajeRuta" estaba legible por anónimos (no estaba en ninguna migración).
--   3. auditoria_viajes_view se saltaba el RLS (vista sin security_invoker).
--   4. Buckets evidencias / vacios: anónimos podían listar todo el árbol.
--
-- ANTES DE CORRER:
--   a) Supabase → Authentication → desactivar "Allow new users to sign up".
--   b) Correr esta consulta. Cada fila es un usuario que HOY es interno y que
--      después de esta migración ya no lo será:
--
--        select u.id, u.email, u.created_at, u.last_sign_in_at
--        from auth.users u
--        where not exists (select 1 from public.perfil_usuario p where p.user_id = u.id)
--          and not exists (select 1 from public.cuenta_cliente c where c.user_id = u.id)
--        order by u.created_at desc;
--
--      - Los que SÍ son del equipo: darles su perfil
--          insert into public.perfil_usuario (user_id, rol, email)
--          values ('<id>', 'operativo', '<email>');
--      - Los que NO reconozcas: Authentication → Users → borrar el usuario.
--
--   La migración se detiene (sin cambiar nada) mientras quede alguno sin
--   resolver, para no dejar fuera a nadie del equipo sin querer.
--
-- Idempotente: se puede volver a correr.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0) Guarda: no debe quedar ningún usuario "interno por omisión" ────────────
do $$
declare
  pendientes text;
begin
  select string_agg(coalesce(u.email, u.id::text), ', ')
    into pendientes
  from auth.users u
  where not exists (select 1 from public.perfil_usuario p where p.user_id = u.id)
    and not exists (select 1 from public.cuenta_cliente c where c.user_id = u.id);

  if pendientes is not null then
    raise exception
      'Hay usuarios sin perfil_usuario ni cuenta_cliente: %. Dales perfil (si son del equipo) o bórralos, y vuelve a correr.',
      pendientes;
  end if;
end $$;

-- ── 1) es_interno(): lista blanca ────────────────────────────────────────────
-- Se conserva la exclusión de cuenta_cliente por si alguna cuenta de portal
-- llegara a tener perfil por error.
create or replace function public.es_interno()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated'
     and exists (select 1 from public.perfil_usuario where user_id = auth.uid())
     and not exists (select 1 from public.cuenta_cliente where user_id = auth.uid());
$$;

revoke execute on function public.es_interno() from public, anon;
grant  execute on function public.es_interno() to authenticated;

-- ── 2) ViajeRuta: solo internos ──────────────────────────────────────────────
-- Sigue exenta de solo_admin_elimina: se reescribe con delete+insert al guardar.
do $$
declare
  p record;
begin
  if to_regclass('public."ViajeRuta"') is null then
    raise notice 'ViajeRuta no existe — omitido.';
    return;
  end if;

  execute 'alter table public."ViajeRuta" enable row level security';

  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'ViajeRuta'
  loop
    execute format('drop policy if exists %I on public."ViajeRuta"', p.policyname);
    raise notice 'ViajeRuta: política eliminada %', p.policyname;
  end loop;

  execute 'create policy "interno_full" on public."ViajeRuta" '
          'for all to authenticated '
          'using (public.es_interno()) with check (public.es_interno())';
  execute 'revoke all on public."ViajeRuta" from anon';
end $$;

-- ── 3) Vistas: que respeten el RLS de quien consulta ──────────────────────────
-- Una vista normal corre con los permisos de su dueño (postgres) y se salta el
-- RLS de las tablas base. Con security_invoker usa los del usuario.
do $$
declare
  v record;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  loop
    execute format('alter view public.%I set (security_invoker = true)', v.relname);
    execute format('revoke all on public.%I from anon', v.relname);
    raise notice 'Vista % → security_invoker, sin anon', v.relname;
  end loop;
end $$;

-- ── 4) Storage: nadie anónimo lista ni escribe ────────────────────────────────
-- Los buckets públicos (evidencias, vacios, logos) siguen sirviendo archivos
-- por URL pública: eso NO depende de políticas. Lo que se quita es poder
-- LISTAR el bucket (enumerar todo) y cualquier escritura anónima.
-- Se eliminan: políticas de storage.objects para anon/public, y cualquier
-- política (de cualquier rol) sobre evidencias/vacios, que se reemplazan
-- abajo por "solo internos". Las de liquidaciones, documentos-legales y
-- costos-comprobantes son "to authenticated" y no se tocan.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname not in ('solo_admin_elimina_archivos', 'evidencias_vacios_internos')
      and (
        roles && array['anon', 'public']::name[]
        or coalesce(qual, '')       ~* '(evidencias|vacios)'
        or coalesce(with_check, '') ~* '(evidencias|vacios)'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
    raise notice 'storage.objects: política eliminada %', p.policyname;
  end loop;
end $$;

drop policy if exists "evidencias_vacios_internos" on storage.objects;
create policy "evidencias_vacios_internos" on storage.objects
  for all to authenticated
  using      (bucket_id in ('evidencias', 'vacios') and public.es_interno())
  with check (bucket_id in ('evidencias', 'vacios') and public.es_interno());

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (correr aparte):
--
--   -- Debe salir vacío: tablas públicas sin RLS
--   select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
--
--   -- Debe salir vacío salvo "Unidad lectura publica"
--   select tablename, policyname, cmd from pg_policies
--   where schemaname in ('public', 'storage') and roles && array['anon','public']::name[];
--
--   -- Debe salir vacío salvo Unidad (lectura del sitio público)
--   select table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee = 'anon' order by 1;
--
--   -- Políticas de storage que quedaron
--   select policyname, permissive, roles::text, cmd from pg_policies
--   where schemaname = 'storage' order by policyname;
-- ════════════════════════════════════════════════════════════════════════════
