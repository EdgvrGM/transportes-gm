-- Módulo de Documentación Legal
-- Agregar columnas de vencimiento a tablas existentes

ALTER TABLE "Conductor"
  ADD COLUMN IF NOT EXISTS "venc_licencia"    DATE,
  ADD COLUMN IF NOT EXISTS "venc_apto_medico" DATE;

ALTER TABLE "Camion"
  ADD COLUMN IF NOT EXISTS "venc_fisicomecanica"  DATE,
  ADD COLUMN IF NOT EXISTS "venc_contaminantes"   DATE,
  ADD COLUMN IF NOT EXISTS "venc_poliza_seguro"   DATE;

ALTER TABLE "Remolque"
  ADD COLUMN IF NOT EXISTS "venc_fisicomecanica" DATE;
