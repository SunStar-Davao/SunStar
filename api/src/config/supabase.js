const { createClient } = require('@supabase/supabase-js');

console.log('🔄 Initializing Supabase client...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is missing!');
}

if (!supabaseKey) {
  console.error('❌ Supabase key is missing!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase query...');
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase query successful');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    return false;
  }
};

module.exports = { supabase, testConnection };