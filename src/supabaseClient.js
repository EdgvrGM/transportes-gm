import { createClient } from '@supabase/supabase-js'

// Obtiene las variables de entorno que configurarás en tu archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verifica que las variables de entorno estén presentes para evitar errores.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in your .env file");
}

// Crea y exporta una única instancia del cliente de Supabase.
// Puedes importar esta variable 'supabase' en cualquier componente o página de tu app
// para interactuar con tu backend de Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
