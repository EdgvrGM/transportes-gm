-- Control de Vacíos: equipo EXTERNO en texto libre.
-- A veces un tercero (no está en el sistema) saca o entrega contenedores con su
-- propio equipo. Para esos casos se guarda el chofer/camión/remolque como texto
-- libre en estas columnas; cuando hay texto libre, el *_id correspondiente queda NULL.

ALTER TABLE "contenedores_vacios"
  ADD COLUMN IF NOT EXISTS conductor_carga_libre text,
  ADD COLUMN IF NOT EXISTS camion_carga_libre text,
  ADD COLUMN IF NOT EXISTS remolque_carga_libre text,
  ADD COLUMN IF NOT EXISTS remolque_carga_libre_2 text,
  ADD COLUMN IF NOT EXISTS conductor_entrega_libre text,
  ADD COLUMN IF NOT EXISTS camion_entrega_libre text,
  ADD COLUMN IF NOT EXISTS remolque_entrega_libre text,
  ADD COLUMN IF NOT EXISTS remolque_entrega_libre_2 text;
