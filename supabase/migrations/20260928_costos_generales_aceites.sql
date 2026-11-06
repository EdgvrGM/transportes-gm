-- ════════════════════════════════════════════════════════════════════════════
-- Costos por Unidad: gastos generales + categoría Aceites — 2026-09-28
--
-- 1. Gastos generales de flota: compras que no son de una unidad específica
--    (cubetas de aceite para rellenar a quien le haga falta, etc.). Se guardan
--    con camion_id y remolque_id ambos NULL. La regla pasa de "exactamente una
--    unidad" a "a lo más una unidad".
--
-- 2. "Rescate en carretera" se reemplaza por "Aceites". Los gastos que ya
--    estuvieran capturados como rescate pasan a "Otros" con una marca en notas,
--    para no perderlos ni reclasificarlos en silencio como aceite.
--
-- Idempotente: se puede correr más de una vez sin error.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. A lo más una unidad ───────────────────────────────────────────────────
alter table public."CostoUnidad" drop constraint if exists costo_unidad_una_unidad;
alter table public."CostoUnidad" add constraint costo_unidad_una_unidad
  check (camion_id is null or remolque_id is null);

create index if not exists costo_unidad_general_fecha_idx
  on public."CostoUnidad" (fecha)
  where camion_id is null and remolque_id is null;

comment on table public."CostoUnidad" is
  'Gastos por unidad: camión, remolque o general de flota (ambos NULL). Reporte semanal Lunes–Domingo calculado desde fecha.';

-- ── 2. Rescate en carretera → Aceites ────────────────────────────────────────
alter table public."CostoUnidad" drop constraint if exists costo_unidad_categoria;

update public."CostoUnidad"
set categoria = 'otros',
    notas = trim(both from concat('[Antes: Rescate en carretera] ', coalesce(notas, '')))
where categoria = 'rescate_carretera';

alter table public."CostoUnidad" add constraint costo_unidad_categoria
  check (categoria in (
    'llantas',
    'reparacion',
    'refacciones',
    'aceites',
    'servicio_preventivo',
    'lavado',
    'otros'
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN:
--
--   -- Debe funcionar (gasto general):
--   --   insert into "CostoUnidad" (fecha, categoria, concepto, monto)
--   --   values (current_date, 'aceites', 'prueba', 1);  -- y luego borrarlo
--
--   -- Debe fallar (dos unidades a la vez):
--   --   insert into "CostoUnidad" (camion_id, remolque_id, fecha, categoria, concepto, monto)
--   --   values (1, 1, current_date, 'otros', 'prueba', 1);
--
--   -- Gastos que venían de rescate en carretera:
--   select id, fecha, concepto, notas from "CostoUnidad" where notas like '[Antes: Rescate%';
-- ════════════════════════════════════════════════════════════════════════════
