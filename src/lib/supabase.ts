import { createClient } from '@supabase/supabase-js';

// Lê as variáveis de ambiente do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verifica se as variáveis estão configuradas
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

// Cria o cliente Supabase ou retorna um mock para modo demo
const createSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    // Retorna um cliente mock para modo demo (não quebra o app)
    console.warn('⚠️ Supabase não configurado. Rodando em modo demo.');
    return createClient('https://demo.supabase.co', 'demo-key');
  }

  // Cria e retorna o cliente Supabase real
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Exporta o cliente Supabase
export const supabase = createSupabaseClient();
