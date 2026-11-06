-- ════════════════════════════════════════════════════════════════════════════
-- Costos por Unidad: categoría Talachas — 2026-09-28
--
-- Agrega 'talachas' (reparación de ponchaduras / servicio de talachero) al
-- catálogo de categorías. No toca datos existentes.
-- Idempotente: se puede correr más de una vez sin error.
-- ════════════════════════════════════════════════════════════════════════════

alter table public."CostoUnidad" drop constraint if exists costo_unidad_categoria;
alter table public."CostoUnidad" add constraint costo_unidad_categoria
  check (categoria in (
    'llantas',
    'reparacion',
    'refacciones',
    'aceites',
    'servicio_preventivo',
    'lavado',
    'talachas',
    'otros'
  ));
