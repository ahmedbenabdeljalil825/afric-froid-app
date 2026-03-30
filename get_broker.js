import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminConfig() {
  const { data, error } = await supabase
    .from('profiles')
    .select('mqtt_config')
    .eq('role', 'ADMIN')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching admin profile:', error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data?.mqtt_config || {}, null, 2));
}

checkAdminConfig();
