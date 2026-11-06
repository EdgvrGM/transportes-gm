ALTER TABLE "AlertaGPS"
  DROP CONSTRAINT IF EXISTS alertagps_tipo_check;

ALTER TABLE "AlertaGPS"
  ADD CONSTRAINT alertagps_tipo_check
  CHECK (tipo IN ('velocidad', 'parada', 'zona', 'ralenti', 'geocerca'));
