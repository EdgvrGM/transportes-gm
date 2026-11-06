-- Catálogo de servicios
CREATE TABLE "CatalogoServicio" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('preventivo', 'correctivo', 'emergencia')),
  intervalo_km integer,
  intervalo_meses integer,
  intervalo_horas_motor integer,
  aplica_toda_flota boolean NOT NULL DEFAULT true,
  instrucciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Líneas del catálogo
CREATE TABLE "CatalogoServicioLinea" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo_servicio_id uuid NOT NULL REFERENCES "CatalogoServicio"(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('refaccion', 'servicio')),
  cantidad_estimada numeric,
  unidad text,
  costo_estimado numeric,
  orden integer NOT NULL DEFAULT 0
);

-- Órdenes de trabajo  ← camion_id ahora es bigint
CREATE TABLE "OrdenTrabajo" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  camion_id bigint REFERENCES "Camion"(id),
  catalogo_servicio_id uuid REFERENCES "CatalogoServicio"(id),
  tipo text NOT NULL CHECK (tipo IN ('preventivo', 'correctivo', 'emergencia')),
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_progreso', 'en_espera', 'completada')),
  taller text,
  km_al_abrir numeric,
  horas_motor_al_abrir numeric,
  fecha_entrada date,
  fecha_salida_estimada date,
  fecha_salida_real date,
  costo_total_real numeric,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Líneas de la orden de trabajo
CREATE TABLE "OrdenTrabajoLinea" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_trabajo_id uuid NOT NULL REFERENCES "OrdenTrabajo"(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('refaccion', 'servicio')),
  cantidad numeric,
  unidad text,
  costo_unitario numeric,
  costo_total numeric GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
  orden integer NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE "CatalogoServicio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatalogoServicioLinea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrdenTrabajo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrdenTrabajoLinea" ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Autenticados leen CatalogoServicio" ON "CatalogoServicio" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados modifican CatalogoServicio" ON "CatalogoServicio" FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados leen CatalogoServicioLinea" ON "CatalogoServicioLinea" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados modifican CatalogoServicioLinea" ON "CatalogoServicioLinea" FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados leen OrdenTrabajo" ON "OrdenTrabajo" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados modifican OrdenTrabajo" ON "OrdenTrabajo" FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Autenticados leen OrdenTrabajoLinea" ON "OrdenTrabajoLinea" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados modifican OrdenTrabajoLinea" ON "OrdenTrabajoLinea" FOR ALL TO authenticated USING (true) WITH CHECK (true);