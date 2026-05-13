const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://emdctovxdnqauiffxobg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZGN0b3Z4ZG5xYXVpZmZ4b2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NTgwMjgsImV4cCI6MjA3NjIzNDAyOH0.3H_PU7omHibRIer0l6ptkg_ZemW2WZSe5VNcd2k_6SQ');

async function check() {
  const cols = ["id", "nombre", "placas", "venc_fisicomecanica", "venc_contaminantes", "venc_poliza_seguro"];
  for (const col of cols) {
    const { error } = await supabase.from('Camion').select(col).limit(1);
    if (error) {
      console.log(`Column ${col}: MISSING (${error.message})`);
    } else {
      console.log(`Column ${col}: EXISTS`);
    }
  }
}

check();
