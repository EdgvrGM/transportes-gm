-- Fix de vínculos rotos entre Viaje y viajes_registrados causados por parseInt(UUID).
-- Antes de este fix, FuelRegistrarViaje.jsx hacía parseInt(UUID) → NaN o número parcial,
-- guardando un valor que NO corresponde a ningún viajes_registrados.id real.
--
-- Estrategia:
--   1. (Diagnóstico) Contar y revisar los Viajes con FK corrupto.
--   2. Para cada huérfano, buscar match único en viajes_registrados por
--      conductor_id + camion_id en una ventana de ±7 días respecto a Viaje.fecha,
--      preferentemente entre viajes programados que aún no están vinculados a ningún Viaje.
--   3. Si hay match único → reasignar. Si hay múltiples o ninguno → setear NULL para que el
--      usuario use la re-vinculación manual desde FuelViajes.
--
-- Ejecutar bloque por bloque en el SQL editor de Supabase. Empieza por el SELECT del
-- paso 1 para ver el alcance antes de aplicar UPDATEs.

-- ========================================================
-- PASO 1 — Diagnóstico: cuántos vínculos están corruptos
-- ========================================================
-- Devuelve el conteo de Viajes con viaje_registrado_id que NO existe en viajes_registrados.
SELECT COUNT(*) AS huerfanos
FROM "Viaje" v
WHERE v.viaje_registrado_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM viajes_registrados vr
    WHERE vr.id::text = v.viaje_registrado_id::text
  );

-- Detalle (opcional): qué viajes están corruptos
SELECT v.id, v.fecha, v.conductor_id, v.camion_id, v.viaje_registrado_id
FROM "Viaje" v
WHERE v.viaje_registrado_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM viajes_registrados vr
    WHERE vr.id::text = v.viaje_registrado_id::text
  )
ORDER BY v.fecha DESC;

-- ========================================================
-- PASO 2 — Reasignar matches únicos
-- ========================================================
-- Para cada Viaje huérfano, buscar candidatos en viajes_registrados que:
--   - coincidan en conductor_id y camion_id
--   - estén dentro de ±7 días de Viaje.fecha
--   - no estén ya vinculados a ningún OTRO Viaje
-- Si hay exactamente un candidato → reasignar.

WITH huerfanos AS (
  SELECT v.id        AS viaje_id,
         v.fecha     AS fecha_viaje,
         v.conductor_id,
         v.camion_id
  FROM "Viaje" v
  WHERE v.viaje_registrado_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM viajes_registrados vr
      WHERE vr.id::text = v.viaje_registrado_id::text
    )
),
candidatos AS (
  SELECT h.viaje_id,
         vr.id AS vr_id,
         ROW_NUMBER() OVER (
           PARTITION BY h.viaje_id
           ORDER BY ABS(EXTRACT(EPOCH FROM (vr.fecha_viaje::timestamp - h.fecha_viaje::timestamp)))
         ) AS rn,
         COUNT(*) OVER (PARTITION BY h.viaje_id) AS total
  FROM huerfanos h
  JOIN viajes_registrados vr
    ON vr.conductor_id = h.conductor_id
   AND vr.camion_id   = h.camion_id
   AND ABS(EXTRACT(EPOCH FROM (vr.fecha_viaje::timestamp - h.fecha_viaje::timestamp))) <= 7 * 86400
   AND NOT EXISTS (
     SELECT 1 FROM "Viaje" v2
     WHERE v2.viaje_registrado_id::text = vr.id::text
       AND v2.id <> h.viaje_id
   )
)
UPDATE "Viaje" v
SET viaje_registrado_id = c.vr_id
FROM candidatos c
WHERE c.viaje_id = v.id
  AND c.rn = 1
  AND c.total = 1;

-- ========================================================
-- PASO 3 — Limpiar los huérfanos que quedaron sin match único
-- ========================================================
-- Setear a NULL todos los viaje_registrado_id que aún no apuntan a un viajes_registrados.id válido.
-- A partir de aquí, getRegisteredTrip caerá al fallback por fecha+conductor+camión, o el usuario
-- podrá vincular manualmente desde el Dialog de edición en FuelViajes.

UPDATE "Viaje" v
SET viaje_registrado_id = NULL
WHERE v.viaje_registrado_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM viajes_registrados vr
    WHERE vr.id::text = v.viaje_registrado_id::text
  );

-- ========================================================
-- PASO 4 — Verificación final
-- ========================================================
-- Debe devolver 0.
SELECT COUNT(*) AS huerfanos_restantes
FROM "Viaje" v
WHERE v.viaje_registrado_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM viajes_registrados vr
    WHERE vr.id::text = v.viaje_registrado_id::text
  );

-- ========================================================
-- PASO 5 (opcional) — Reconciliar combustible_registrado en viajes_registrados
-- ========================================================
-- Forzar que el flag combustible_registrado refleje el estado real basándose en el FK.
UPDATE viajes_registrados vr
SET combustible_registrado = (
  SELECT COALESCE((v.litros_combustible IS NOT NULL AND v.litros_combustible > 0), false)
  FROM "Viaje" v
  WHERE v.viaje_registrado_id::text = vr.id::text
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "Viaje" v
  WHERE v.viaje_registrado_id::text = vr.id::text
);

-- Y limpiar el flag en los que ya no tienen ningún Viaje vinculado.
UPDATE viajes_registrados vr
SET combustible_registrado = false
WHERE combustible_registrado = true
  AND NOT EXISTS (
    SELECT 1 FROM "Viaje" v
    WHERE v.viaje_registrado_id::text = vr.id::text
  );
