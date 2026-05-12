-- SQL Script para Módulo de Liquidaciones

-- 1. Agregar porcentaje_base a Conductor (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='Conductor' AND column_name='porcentaje_base') THEN
        ALTER TABLE "Conductor" ADD COLUMN "porcentaje_base" numeric DEFAULT 16.0;
    END IF;
END $$;

-- 2. Crear tabla Liquidaciones
CREATE TABLE IF NOT EXISTS "Liquidaciones" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "conductor_id" bigint REFERENCES "Conductor"("id") ON DELETE CASCADE,
  "semana_id" uuid REFERENCES "ProgramaCargas"("id") ON DELETE CASCADE,
  "total_comisiones" numeric DEFAULT 0,
  "total_gastos" numeric DEFAULT 0,
  "total_anticipos" numeric DEFAULT 0,
  "monto_final" numeric DEFAULT 0,
  "detalle_viajes" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE "Liquidaciones" ENABLE ROW LEVEL SECURITY;

-- 4. Crear política para permitir todo (Ajustar en producción)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Liquidaciones' AND policyname = 'Permitir todo en Liquidaciones'
    ) THEN
        CREATE POLICY "Permitir todo en Liquidaciones" ON "Liquidaciones"
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
