-- ════════════════════════════════════════════════════════════════════════════
-- URGENTE — Cierre de acceso público a "Liquidaciones" (2026-08-03)
--
-- Estado encontrado:
--   Tabla public."Liquidaciones" (159 filas de nómina real) con una sola
--   política: "Permitir todo en Liquidaciones" → FOR ALL TO public
--   USING(true) WITH CHECK(true).
--
--   El rol `public` incluye `anon`, que es el rol de la anon key publicada en
--   el bundle del SPA. Es decir: cualquiera en internet podía leer, modificar
--   y borrar los recibos de nómina de todos los operadores.
--
-- Por qué se escapó del endurecimiento de 20260609_security_hardening.sql:
--   ese script listaba la tabla como 'Liquidacion' (singular) y omite en
--   silencio las que no existen. El nombre real es "Liquidaciones" (plural,
--   con mayúscula). Mismo agujero que ya se corrigió en "Evidencia".
--
-- Esta migración SOLO cierra el acceso. La ampliación del modelo de datos
-- (snapshot completo, PDF archivado, semana_id) va aparte.
-- ════════════════════════════════════════════════════════════════════════════

-- Guarda: el cierre depende de es_interno(), creada en 20260609. Si no existe,
-- abortar con un mensaje claro en vez de dejar la tabla a medio configurar.
do $$
begin
  if to_regprocedure('public.es_interno()') is null then
    raise exception
      'Falta public.es_interno(). Corre primero 20260609_security_hardening.sql.';
  end if;
end $$;

-- ── Cierre: una sola política "solo usuarios internos" ────────────────────────
-- Idempotente: borra TODAS las políticas previas de la tabla y deja una.
-- Un usuario interno = autenticado y sin fila en cuenta_cliente, así que las
-- cuentas del portal de clientes tampoco ven nómina.
do $$
declare
  p record;
begin
  if to_regclass('public."Liquidaciones"') is null then
    raise notice 'public."Liquidaciones" no existe — nada que cerrar.';
    return;
  end if;

  execute 'alter table public."Liquidaciones" enable row level security';

  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Liquidaciones'
  loop
    execute format('drop policy if exists %I on public."Liquidaciones"', p.policyname);
    raise notice 'Política eliminada: %', p.policyname;
  end loop;

  execute 'create policy "interno_full" on public."Liquidaciones" '
          'for all to authenticated '
          'using (public.es_interno()) with check (public.es_interno())';

  raise notice '"Liquidaciones" → solo usuarios internos.';
end $$;

-- ── Revocar cualquier grant directo al rol anónimo ───────────────────────────
-- Las políticas RLS no aplican si además hay GRANTs de tabla a anon; se quitan
-- por si el "permitir todo" original vino acompañado de uno.
revoke all on public."Liquidaciones" from anon;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (correr después; el resultado esperado va en cada comentario):
--
--   -- Debe devolver exactamente una fila: interno_full / {authenticated}
--   select policyname, roles::text, cmd, qual::text
--   from pg_policies where schemaname='public' and tablename='Liquidaciones';
--
--   -- Debe devolver true
--   select rowsecurity from pg_tables
--   where schemaname='public' and tablename='Liquidaciones';
--
--   -- No debe aparecer 'anon'
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='Liquidaciones';
-- ════════════════════════════════════════════════════════════════════════════
