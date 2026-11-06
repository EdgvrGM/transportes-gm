-- ════════════════════════════════════════════════════════════════════════════
-- Archivo de documentos legales — 2026-08-21
--
-- Antes: "Documentación Legal" sólo guardaba FECHAS de vencimiento
-- (venc_licencia, venc_apto_medico, venc_fisicomecanica, venc_contaminantes,
-- venc_poliza_seguro). El documento en sí vivía en una carpeta de alguien o en
-- papel: cuando lo pedía un verificador no estaba a la mano.
--
-- Este cambio agrega el archivo: una tabla de documentos escaneados ligados a
-- conductor / camión / remolque, y un bucket PRIVADO. Igual que "liquidaciones"
-- y a diferencia de "evidencias"/"vacios", NO es público: son datos personales
-- (licencias, aptos médicos, pólizas). Se accede con createSignedUrl de
-- expiración corta desde el SPA.
--
-- NO destructiva: no toca ninguna columna venc_* existente. Las fechas siguen
-- viviendo en "Conductor"/"Camion"/"Remolque" y son la fuente de verdad de los
-- semáforos; el documento sólo las respalda (el SPA sincroniza la fecha del
-- documento hacia la columna venc_* cuando el tipo corresponde).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla ─────────────────────────────────────────────────────────────────
-- Relación polimórfica (entidad_tipo, entidad_id): un solo archivo para las tres
-- entidades evita triplicar tabla, políticas y UI. Sin FK por lo mismo — la
-- limpieza al borrar un conductor/camión/remolque la hace el trigger de abajo.
create table if not exists public.documentos_legales (
  id                bigint generated always as identity primary key,
  entidad_tipo      text   not null check (entidad_tipo in ('conductor', 'camion', 'remolque')),
  entidad_id        bigint not null,
  tipo_doc          text   not null,
  nombre_archivo    text   not null,
  storage_path      text   not null unique,
  mime_type         text,
  tamano_bytes      bigint,
  fecha_vencimiento date,
  notas             text,
  created_at        timestamptz not null default now(),
  created_by        uuid default auth.uid()
);

comment on table public.documentos_legales is
  'Documentos escaneados (PDF/imagen) de conductores, camiones y remolques. El archivo vive en el bucket privado "documentos-legales"; aquí sólo la metadata + storage_path.';
comment on column public.documentos_legales.tipo_doc is
  'Slug del tipo: licencia, apto_medico, tarjeta_circulacion, fisicomecanica, contaminantes, poliza_seguro, ine, curp, otro. El catálogo vive en src/components/legal/documentosConfig.js.';
comment on column public.documentos_legales.storage_path is
  'Ruta dentro del bucket: {entidad_tipo}/{entidad_id}/{timestamp}_{nombre}. Único para no pisar archivos.';

create index if not exists documentos_legales_entidad_idx
  on public.documentos_legales (entidad_tipo, entidad_id);

create index if not exists documentos_legales_creado_idx
  on public.documentos_legales (created_at desc);

-- ── 2. RLS: sólo usuarios internos ───────────────────────────────────────────
-- Mismo criterio que el resto del ERP (ver 20260609_security_hardening.sql).
alter table public.documentos_legales enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'documentos_legales'
  loop
    execute format('drop policy if exists %I on public.documentos_legales', p.policyname);
  end loop;
end $$;

create policy "interno_full" on public.documentos_legales
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

revoke all on public.documentos_legales from anon;
grant select, insert, update, delete on public.documentos_legales to authenticated;

-- ── 3. Bucket privado ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documentos-legales', 'documentos-legales', false)
on conflict (id) do update set public = false;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'documentos_legales_%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "documentos_legales_internos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'documentos-legales' and public.es_interno())
  with check (bucket_id = 'documentos-legales' and public.es_interno());

-- ── 4. Limpieza al borrar la entidad dueña ───────────────────────────────────
-- Sin FK polimórfica, borrar un conductor dejaría filas huérfanas apuntando a
-- archivos que nadie volvería a ver. El trigger borra la metadata; el objeto en
-- Storage queda hasta que se corra la limpieza de huérfanos (ver VERIFICACIÓN).
create or replace function public.borrar_documentos_legales_de_entidad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo text;
begin
  tipo := case tg_table_name
            when 'Conductor' then 'conductor'
            when 'Camion'    then 'camion'
            when 'Remolque'  then 'remolque'
          end;
  if tipo is not null then
    delete from public.documentos_legales
    where entidad_tipo = tipo and entidad_id = old.id;
  end if;
  return old;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['Conductor', 'Camion', 'Remolque'] loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'Documentos legales: tabla omitida (no existe): %', t;
      continue;
    end if;
    execute format('drop trigger if exists trg_borrar_documentos_legales on public.%I', t);
    execute format(
      'create trigger trg_borrar_documentos_legales after delete on public.%I '
      'for each row execute function public.borrar_documentos_legales_de_entidad()',
      t
    );
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN:
--
--   -- Documentos por entidad y tipo
--   select entidad_tipo, tipo_doc, count(*)
--   from public.documentos_legales
--   group by 1, 2 order by 1, 2;
--
--   -- Objetos en Storage sin fila en la tabla (huérfanos a limpiar a mano)
--   select o.name
--   from storage.objects o
--   left join public.documentos_legales d on d.storage_path = o.name
--   where o.bucket_id = 'documentos-legales' and d.id is null;
-- ════════════════════════════════════════════════════════════════════════════
