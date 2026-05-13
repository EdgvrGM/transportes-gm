const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://emdctovxdnqauiffxobg.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZGN0b3Z4ZG5xYXVpZmZ4b2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NTgwMjgsImV4cCI6MjA3NjIzNDAyOH0.3H_PU7omHibRIer0l6ptkg_ZemW2WZSe5VNcd2k_6SQ');

async function check() {
  const { data, error } = await supabase.from('Camion').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

check();
