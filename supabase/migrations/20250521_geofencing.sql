CREATE TABLE "EventoGeocerca" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wialon_unit_id bigint NOT NULL,
  wialon_nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  lat numeric,
  lng numeric,
  fuera_de_horario boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "EventoGeocerca" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer eventos de geocerca"
  ON "EventoGeocerca" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados pueden insertar eventos de geocerca"
  ON "EventoGeocerca" FOR INSERT
  TO authenticated
  WITH CHECK (true);
