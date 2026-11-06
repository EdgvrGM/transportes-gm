-- Control de Vacíos: soporte para configuración FULL (doble remolque).
-- Un viaje full saca DOS contenedores en un mismo registro: comparten conductor,
-- camión, cliente, fecha, estatus y entrega del vacío. Solo cambian el número de
-- contenedor y el remolque (uno por caja). modalidad = 'sencillo' | 'full'.

ALTER TABLE "contenedores_vacios"
  ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'sencillo'
    CHECK (modalidad IN ('sencillo', 'full')),
  ADD COLUMN IF NOT EXISTS numero_contenedor_2 text,
  ADD COLUMN IF NOT EXISTS remolque_carga_id_2 bigint REFERENCES "Remolque"(id),
  ADD COLUMN IF NOT EXISTS remolque_entrega_id_2 bigint REFERENCES "Remolque"(id);
