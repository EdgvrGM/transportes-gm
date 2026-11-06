-- ════════════════════════════════════════════════════════════════════════════
-- Registro de liquidaciones — modelo de datos + archivo de PDF (2026-08-03)
--
-- Antes: public."Liquidaciones" guardaba 4 totales y un jsonb con los viajes.
-- Se perdían gastos, anticipos por día, anticipos extras, conceptos extras y
-- la semana a la que pertenecía. El PDF sólo se descargaba al equipo de quien
-- lo generaba: no quedaba copia del documento que se firma.
--
-- Requisito: correr ANTES 20260803_liquidaciones_rls_urgente.sql.
--
-- NO destructiva: no borra ni edita ninguna liquidación existente. Los
-- duplicados heredados se marcan como anuladas (se conservan), nunca se borran.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public."Liquidaciones"') is null then
    raise exception 'No existe public."Liquidaciones".';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='Liquidaciones' and policyname='interno_full'
  ) then
    raise exception
      'Falta la política interno_full. Corre primero 20260803_liquidaciones_rls_urgente.sql.';
  end if;
end $$;

-- ── 1. Tabla duplicada vacía ─────────────────────────────────────────────────
-- public.liquidaciones (minúscula) quedó como intento paralelo con 0 filas.
-- Se elimina sólo si sigue vacía; si alguien le metió datos, se conserva.
do $$
declare
  n bigint;
begin
  if to_regclass('public.liquidaciones') is null then
    return;
  end if;
  execute 'select count(*) from public.liquidaciones' into n;
  if n = 0 then
    execute 'drop table public.liquidaciones';
    raise notice 'Tabla duplicada public.liquidaciones (0 filas) eliminada.';
  else
    raise warning 'public.liquidaciones tiene % filas: NO se eliminó. Revisar a mano.', n;
  end if;
end $$;

-- ── 2. Columnas nuevas ───────────────────────────────────────────────────────
-- semana_id (uuid) ya existía sin usarse: es el vínculo a ProgramaCargas.
alter table public."Liquidaciones"
  add column if not exists fecha_corte      date,
  add column if not exists periodo_inicio   date,
  add column if not exists periodo_fin      date,
  add column if not exists conductor_nombre text,
  add column if not exists detalle          jsonb,
  add column if not exists pdf_path         text,
  add column if not exists created_by       uuid,
  add column if not exists updated_at       timestamptz,
  add column if not exists updated_by       uuid;

comment on column public."Liquidaciones".detalle is
  'Snapshot completo al emitir: viajes, gastos, anticipos por día, extras y % aplicados.';
comment on column public."Liquidaciones".conductor_nombre is
  'Denormalizado a propósito: el histórico no debe cambiar si renombran o borran al operador.';

-- FK de la semana (las filas viejas tienen semana_id null, que la FK permite).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'liquidaciones_semana_fk'
  ) then
    alter table public."Liquidaciones"
      add constraint liquidaciones_semana_fk
      foreign key (semana_id) references public."ProgramaCargas"(id) on delete set null;
  end if;
end $$;

-- ── 3. Backfill de las 159 filas existentes ──────────────────────────────────
-- fecha_corte estaba enterrada en el jsonb; sin sacarla a columna, las
-- liquidaciones viejas no aparecerían en ningún filtro por semana.
update public."Liquidaciones"
set fecha_corte = nullif(detalle_viajes->>'fecha_corte', '')::date
where fecha_corte is null
  and detalle_viajes ? 'fecha_corte'
  and nullif(detalle_viajes->>'fecha_corte', '') is not null;

-- El periodo se deriva del corte con la misma regla que usa la app
-- (inicioPago = corte - 7, finPago = corte - 1).
update public."Liquidaciones"
set periodo_inicio = fecha_corte - 7,
    periodo_fin    = fecha_corte - 1
where fecha_corte is not null
  and (periodo_inicio is null or periodo_fin is null);

update public."Liquidaciones" l
set conductor_nombre = c.nombre
from public."Conductor" c
where l.conductor_nombre is null and c.id = l.conductor_id;

-- El detalle viejo sólo tenía viajes; se preserva tal cual bajo la llave nueva.
-- Las claves ausentes quedan como arrays vacíos para que la UI no ramifique.
update public."Liquidaciones"
set detalle = jsonb_build_object(
      'viajes',                coalesce(detalle_viajes->'viajes', '[]'::jsonb),
      'gastos',                '[]'::jsonb,
      'anticipos',             '{}'::jsonb,
      'anticipos_extras',      '[]'::jsonb,
      'conceptos_extras',      '[]'::jsonb,
      'origen',                'legacy'
    )
where detalle is null;

-- Vincular con su semana cuando el corte coincide con un programa.
-- El corte es el sábado que cierra la semana; ver sabadoDeCorte() en la app.
update public."Liquidaciones" l
set semana_id = p.id
from public."ProgramaCargas" p
where l.semana_id is null
  and l.fecha_corte is not null
  and p.fecha_fin between l.fecha_corte - 1 and l.fecha_corte;

-- ── 4. Duplicados heredados: conservar sólo la última versión ────────────────
-- Nunca hubo restricción de unicidad, así que hay varias liquidaciones para el
-- mismo operador y semana (desde doble clic hasta 12 recálculos). Decisión de
-- negocio: la última guardada es la buena; las anteriores se eliminan.
--
-- "Última" = mayor created_at (id como desempate). Antes de borrar nada se
-- copia TODO a una tabla de respaldo: la operación es reversible mientras esa
-- tabla exista. Bórrala tú cuando estés conforme (instrucción al final).
create table if not exists public."Liquidaciones_duplicados_backup" as
  select * from public."Liquidaciones" where false;

with ranked as (
  select id,
         row_number() over (
           partition by conductor_id, fecha_corte
           order by created_at desc nulls last, id desc
         ) as rn
  from public."Liquidaciones"
  where fecha_corte is not null
)
insert into public."Liquidaciones_duplicados_backup"
select l.* from public."Liquidaciones" l
join ranked r on r.id = l.id and r.rn > 1;

-- El respaldo hereda RLS desactivado por ser CREATE TABLE AS: cerrarlo igual
-- que la tabla origen (contiene los mismos datos de nómina).
alter table public."Liquidaciones_duplicados_backup" enable row level security;
drop policy if exists "interno_full" on public."Liquidaciones_duplicados_backup";
create policy "interno_full" on public."Liquidaciones_duplicados_backup"
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());
revoke all on public."Liquidaciones_duplicados_backup" from anon;

delete from public."Liquidaciones" l
using public."Liquidaciones_duplicados_backup" b
where l.id = b.id;

do $$
declare
  n_backup bigint;
  n_vivas  bigint;
begin
  select count(*) into n_backup from public."Liquidaciones_duplicados_backup";
  select count(*) into n_vivas  from public."Liquidaciones";
  raise notice 'Duplicados eliminados: % (respaldados). Liquidaciones vigentes: %.',
    n_backup, n_vivas;
end $$;

-- ── 5. Unicidad: una liquidación por operador y semana ───────────────────────
-- Con "reemplazar" (UPDATE in place) ya no se generan filas nuevas al corregir,
-- así que el índice puede ser total: cualquier duplicado futuro es un error.
create unique index if not exists liquidaciones_conductor_corte_uniq
  on public."Liquidaciones" (conductor_id, fecha_corte)
  where fecha_corte is not null;

create index if not exists liquidaciones_fecha_corte_idx
  on public."Liquidaciones" (fecha_corte desc);

-- ── 6. Bucket privado para los PDF ───────────────────────────────────────────
-- A diferencia de "evidencias" y "vacios", este NO es público: son sueldos.
-- Se accede con createSignedUrl de expiración corta desde el SPA.
insert into storage.buckets (id, name, public)
values ('liquidaciones', 'liquidaciones', false)
on conflict (id) do update set public = false;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname like 'liquidaciones_%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "liquidaciones_internos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'liquidaciones' and public.es_interno())
  with check (bucket_id = 'liquidaciones' and public.es_interno());

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN:
--
--   -- Esperado con los datos de 2026-08-03: total 86, sin_corte 0,
--   -- con_semana ≈ 86, y 73 filas en el respaldo.
--   select count(*) as total,
--          count(*) filter (where fecha_corte is null)   as sin_corte,
--          count(*) filter (where semana_id is not null) as con_semana,
--          count(distinct conductor_id)                  as operadores,
--          count(distinct fecha_corte)                   as semanas
--   from public."Liquidaciones";
--
--   -- No debe devolver ninguna fila (unicidad efectiva):
--   select conductor_id, fecha_corte, count(*) from public."Liquidaciones"
--   group by 1,2 having count(*) > 1;
--
--   -- Qué se eliminó, con montos, por si hay que revertir algo:
--   select conductor_nombre, fecha_corte, monto_final, created_at
--   from public."Liquidaciones_duplicados_backup" order by fecha_corte desc, conductor_nombre;
--
--   -- El bucket debe salir public = false:
--   select id, public from storage.buckets where id = 'liquidaciones';
--
-- REVERTIR una liquidación concreta desde el respaldo (si "la última" no era
-- la buena en algún caso). Borra primero la vigente de ese operador+semana:
--   delete from public."Liquidaciones" where conductor_id = ? and fecha_corte = ?;
--   insert into public."Liquidaciones"
--     select * from public."Liquidaciones_duplicados_backup" where id = ?;
--
-- LIMPIEZA FINAL — cuando ya hayas revisado y estés conforme:
--   drop table public."Liquidaciones_duplicados_backup";
-- ════════════════════════════════════════════════════════════════════════════
