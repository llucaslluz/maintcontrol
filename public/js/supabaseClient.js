// ✅ Espera o supabase já ter sido carregado pela CDN
// Cria o cliente Supabase de forma correta

const SUPABASE_URL = 'https://fjgayrfizjphdrccntdg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ2F5cmZpempwaGRyY2NudGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzg0ODgsImV4cCI6MjA3MTkxNDQ4OH0.jpF84uaaAxhEFxH2mfs01VfJnBDYlfLpnrsvd_LIjvk';

// Agora usa a variável global 'supabase' já fornecida pela CDN
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exporta a instância pra usar nos outros arquivos
window.supabase = supabase;

