// ✅ Certifique-se que você tem essa linha no topo:
const { createClient } = supabase;

// ✅ Agora inicializa o Supabase client corretamente:
const SUPABASE_URL = 'https://fjgayrfizjphdrccntdg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ2F5cmZpempwaGRyY2NudGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzg0ODgsImV4cCI6MjA3MTkxNDQ4OH0.jpF84uaaAxhEFxH2mfs01VfJnBDYlfLpnrsvd_LIjvk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 👇️ Exporta a variável supabase caso vá usar em outros scripts com import
// export { supabase };
