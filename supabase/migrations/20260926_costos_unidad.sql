-- ════════════════════════════════════════════════════════════════════════════
-- Módulo Costos por Unidad — 2026-09-26
--
-- Reemplaza al módulo Mantenimiento (archivado, sus tablas NO se tocan).
-- Objetivo: saber cuánto se invirtió en cada camión / remolque semana con
-- semana (llantas, reparaciones, refacciones, rescates en carretera, etc.).
--
-- Una fila = un gasto asignado a UNA unidad: camión o remolque, nunca ambos.
-- Dos FKs + CHECK en vez de relación polimórfica: la BD garantiza que la unidad
-- existe y no hace falta trigger de limpieza.
--
-- ON DELETE RESTRICT: no se puede borrar del catálogo una unidad con costos
-- (es historial de dinero). Para sacarla de operación se cambia su estado.
--
-- La semana (Lunes–Domingo) NO se guarda: se calcula desde `fecha` en el SPA.
--
-- Idempotente: se puede correr más de una vez sin error.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla ─────────────────────────────────────────────────────────────────
create table if not exists public."CostoUnidad" (
  id               uuid primary key default gen_random_uuid(),
  camion_id        bigint references public."Camion"(id)   on delete restrict,
  remolque_id      bigint references public."Remolque"(id) on delete restrict,
  fecha            date    not null,
  categoria        text    not null,
  concepto         text    not null,
  proveedor        text,
  monto            numeric(12,2) not null check (monto >= 0),
  km_odometro      numeric,
  comprobante_path text,
  notas            text,
  created_at       timestamptz not null default now(),
  created_by       uuid default auth.uid(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  constraint costo_unidad_una_unidad
    check ((camion_id is not null) <> (remolque_id is not null))
);

-- El catálogo de categorías vive en src/components/costos/categorias.js.
-- Si se agrega una allá, se agrega aquí (drop + create del constraint).
alter table public."CostoUnidad" drop constraint if exists costo_unidad_categoria;
alter table public."CostoUnidad" add constraint costo_unidad_categoria
  check (categoria in (
    'llantas',
    'reparacion',
    'refacciones',
    'rescate_carretera',
    'servicio_preventivo',
    'lavado',
    'otros'
  ));

comment on table public."CostoUnidad" is
  'Gastos por unidad (camión XOR remolque). Reporte semanal Lunes–Domingo calculado desde fecha.';
comment on column public."CostoUnidad".comprobante_path is
  'Ruta en el bucket privado "costos-comprobantes": {camion|remolque}/{unidad_id}/{timestamp}_{nombre}.';

create index if not exists costo_unidad_camion_fecha_idx
  on public."CostoUnidad" (camion_id, fecha) where camion_id is not null;
create index if not exists costo_unidad_remolque_fecha_idx
  on public."CostoUnidad" (remolque_id, fecha) where remolque_id is not null;
create index if not exists costo_unidad_fecha_idx
  on public."CostoUnidad" (fecha desc);

-- ── 2. updated_at automático ─────────────────────────────────────────────────
create or replace function public.costo_unidad_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists trg_costo_unidad_touch on public."CostoUnidad";
create trigger trg_costo_unidad_touch
  before update on public."CostoUnidad"
  for each row execute function public.costo_unidad_touch();

-- ── 3. RLS: sólo usuarios internos ───────────────────────────────────────────
alter table public."CostoUnidad" enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'CostoUnidad'
  loop
    execute format('drop policy if exists %I on public."CostoUnidad"', p.policyname);
  end loop;
end $$;

create policy "interno_full" on public."CostoUnidad"
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

revoke all on public."CostoUnidad" from anon;
grant select, insert, update, delete on public."CostoUnidad" to authenticated;

-- ── 4. Bucket privado de comprobantes ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('costos-comprobantes', 'costos-comprobantes', false)
on conflict (id) do update set public = false;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'costos_comprobantes_%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "costos_comprobantes_internos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'costos-comprobantes' and public.es_interno())
  with check (bucket_id = 'costos-comprobantes' and public.es_interno());

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN:
--
--   -- Debe existir la tabla con RLS y una sola política
--   select tablename, policyname from pg_policies where tablename = 'CostoUnidad';
--
--   -- Debe fallar (ninguna unidad):
--   insert into "CostoUnidad" (fecha, categoria, concepto, monto)
--   values (current_date, 'otros', 'prueba', 1);
--
--   -- Total por camión, semana Lunes–Domingo
--   select camion_id, date_trunc('week', fecha)::date as lunes, sum(monto)
--   from "CostoUnidad" where camion_id is not null
--   group by 1, 2 order by 2 desc, 3 desc;
-- ════════════════════════════════════════════════════════════════════════════
