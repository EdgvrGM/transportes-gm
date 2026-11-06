-- Control de Vacíos: datos adicionales de la entrega del vacío.
--   lugar_entrega_vacio: lugar físico donde se entrega (ej. CIMA, SSA). Texto libre.
--   entrega_con_cita: si la entrega requiere cita previa.
--   horario_cita: horario de la cita (texto libre, ej. "10:00 hrs" o "08:00 - 10:00").

ALTER TABLE "contenedores_vacios"
  ADD COLUMN IF NOT EXISTS lugar_entrega_vacio text,
  ADD COLUMN IF NOT EXISTS entrega_con_cita boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS horario_cita text;
