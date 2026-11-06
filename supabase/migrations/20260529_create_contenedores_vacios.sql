-- Control de Vacíos: seguimiento de contenedores cargados en el puerto de Manzanillo
-- Tabla plana (una fila = un contenedor). No agrupada por semanas.

CREATE TABLE "contenedores_vacios" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contenedor text NOT NULL,
  fecha_carga date NOT NULL,
  cliente_id uuid REFERENCES "Cliente"(id),
  destino text,
  -- Datos de carga
  conductor_carga_id bigint REFERENCES "Conductor"(id),
  camion_carga_id bigint REFERENCES "Camion"(id),
  remolque_carga_id bigint REFERENCES "Remolque"(id),
  -- Ciclo de vida
  estatus text NOT NULL DEFAULT 'cargado'
    CHECK (estatus IN ('cargado', 'en_ruta', 'entregado', 'pendiente_vacio', 'vacio_entregado', 'en_piso')),
  -- Datos de entrega del vacío
  conductor_entrega_id bigint REFERENCES "Conductor"(id),
  camion_entrega_id bigint REFERENCES "Camion"(id),
  remolque_entrega_id bigint REFERENCES "Remolque"(id),
  fecha_entrega_vacio date,
  notas text,
  fotos_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (espejo de las demás tablas del sistema: autenticados leen y modifican)
ALTER TABLE "contenedores_vacios" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leen contenedores_vacios" ON "contenedores_vacios"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados modifican contenedores_vacios" ON "contenedores_vacios"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTA STORAGE: crear manualmente en el dashboard de Supabase un bucket público
-- llamado "vacios" (espejo del bucket "evidencias"). Las fotos se guardan en
-- vacios/{contenedor_id}/{id}_{timestamp}.{ext}
