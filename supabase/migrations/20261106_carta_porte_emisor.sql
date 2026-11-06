-- ════════════════════════════════════════════════════════════════════════════
-- Carta Porte — emisor y distancia en la fila (2026-11-06)
--
-- Se factura con dos razones sociales (Edgar José González Contreras y María
-- de la Luz Montelongo Estrada). La lista distingue y filtra por emisor y
-- muestra la distancia del traslado; ambos datos vivían sólo dentro del XML.
-- Las filas ya cargadas se rellenan desde su propio XML.
--
-- Se puede correr más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.carta_porte add column if not exists emisor_rfc text;
alter table public.carta_porte add column if not exists emisor_nombre text;
alter table public.carta_porte add column if not exists distancia_total numeric;

update public.carta_porte
set
  emisor_rfc      = coalesce(emisor_rfc, substring(xml from '<[A-Za-z0-9]+:Emisor\s[^>]*\sRfc="([^"]+)"')),
  emisor_nombre   = coalesce(emisor_nombre, substring(xml from '<[A-Za-z0-9]+:Emisor\s[^>]*\sNombre="([^"]*)"')),
  distancia_total = coalesce(distancia_total, nullif(substring(xml from ':CartaPorte\s[^>]*\sTotalDistRec="([0-9.]+)"'), '')::numeric)
where emisor_rfc is null or emisor_nombre is null or distancia_total is null;

create index if not exists carta_porte_emisor_idx on public.carta_porte (emisor_rfc);

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN:
--   select emisor_rfc, emisor_nombre, count(*), sum(distancia_total)
--   from public.carta_porte group by 1, 2;
-- ════════════════════════════════════════════════════════════════════════════
