-- ════════════════════════════════════════════════════════════════════════════
-- Módulo Carta Porte — 2026-11-05
--
-- La factura de flete (CFDI 4.0 de Ingreso) ya trae timbrado el complemento
-- Carta Porte 3.x. El módulo sólo guarda ese XML y genera al vuelo una
-- representación impresa SIN importes (el operador la lleva en el viaje y no
-- debe mostrar cuánto se cobró el flete).
--
-- El XML se guarda como texto en la fila (pesa ~8 KB): sin bucket no hay
-- archivos huérfanos ni URLs firmadas. El PDF no se guarda; se regenera del
-- XML cada vez, así siempre refleja exactamente lo timbrado.
--
-- Las columnas de búsqueda (folio, servicio, placas, operador…) se extraen del
-- XML en el SPA al subirlo; el XML es la fuente de verdad.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.carta_porte (
  id               bigint generated always as identity primary key,
  uuid             text not null unique,
  id_ccp           text,
  version_cp       text,
  serie            text,
  folio            text,
  fecha_emision    timestamp,
  referencia_tipo  text,
  referencia       text,
  referencia_editada boolean not null default false,
  contenedores     text,
  receptor_nombre  text,
  receptor_rfc     text,
  origen           text,
  destino          text,
  fecha_salida     timestamp,
  fecha_llegada    timestamp,
  placas           text,
  operador_nombre  text,
  operador_rfc     text,
  xml              text not null,
  created_at       timestamptz not null default now(),
  created_by       uuid default auth.uid()
);

comment on table public.carta_porte is
  'XML de facturas de flete con complemento Carta Porte. El PDF sin importes se genera en el SPA desde la columna xml.';
comment on column public.carta_porte.uuid is
  'Folio fiscal (UUID del Timbre Fiscal Digital) en mayúsculas. Único: cada factura se carga una sola vez.';
comment on column public.carta_porte.fecha_emision is
  'Hora local de México tal como viene en el XML (sin zona horaria).';

-- Si la tabla ya se había creado con la primera versión (columna num_servicio),
-- se convierte a referencia + tipo sin perder lo capturado.
alter table public.carta_porte add column if not exists referencia_tipo text;
alter table public.carta_porte add column if not exists referencia text;
alter table public.carta_porte add column if not exists referencia_editada boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'carta_porte' and column_name = 'num_servicio'
  ) then
    execute $q$
      update public.carta_porte
      set referencia = num_servicio, referencia_tipo = 'servicio'
      where referencia is null and num_servicio is not null
    $q$;
    alter table public.carta_porte drop column num_servicio;
  end if;
end $$;

alter table public.carta_porte drop constraint if exists carta_porte_referencia_tipo;
alter table public.carta_porte add constraint carta_porte_referencia_tipo
  check (referencia_tipo is null or referencia_tipo in ('servicio', 'remision', 'lccp'));

comment on column public.carta_porte.referencia is
  'Número de servicio, remisión o L-CCP. Se extrae del concepto de la factura al subir el XML; referencia_editada = true si se corrigió a mano (el PDF usa este valor, no el del XML).';

create index if not exists carta_porte_salida_idx on public.carta_porte (fecha_salida desc);

alter table public.carta_porte enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'carta_porte'
  loop
    execute format('drop policy if exists %I on public.carta_porte', p.policyname);
  end loop;
end $$;

create policy "interno_full" on public.carta_porte
  for all to authenticated
  using (public.es_interno()) with check (public.es_interno());

-- Igual que el resto del ERP (20261105_roles_eliminacion.sql): sólo el admin
-- borra; el operativo crea una solicitud.
create policy "solo_admin_elimina" on public.carta_porte as restrictive
  for delete to authenticated using (public.es_admin());

revoke all on public.carta_porte from anon;
grant select, insert, update, delete on public.carta_porte to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN:
--   select folio, referencia_tipo, referencia, placas, operador_nombre, fecha_salida
--   from public.carta_porte order by fecha_salida desc limit 20;
-- ════════════════════════════════════════════════════════════════════════════
