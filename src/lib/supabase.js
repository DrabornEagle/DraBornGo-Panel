import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { dkd_generated_public_env_value } from './dkd_public_env.generated';

const dkd_env_url_value = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const dkd_env_key_value = String(
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
).trim();

const dkd_shared_url_value = dkd_generated_public_env_value.EXPO_PUBLIC_SUPABASE_URL;
const dkd_shared_key_value = dkd_generated_public_env_value.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// DraBornGo Panel aynı production Supabase projesine bağlıdır. Aynı proje URL'si kullanılırken
// telefonda kalmış eski/yanlış bir .env anahtarı ortak production anahtarını ezemez.
const dkd_use_shared_project_value = !dkd_env_url_value || dkd_env_url_value === dkd_shared_url_value;
const dkd_supabase_url = dkd_use_shared_project_value ? dkd_shared_url_value : dkd_env_url_value;
const dkd_supabase_key = dkd_use_shared_project_value ? dkd_shared_key_value : dkd_env_key_value;

export const dkd_supabase_ready = Boolean(dkd_supabase_url && dkd_supabase_key);
export const dkd_supabase_project_url = dkd_supabase_url;

export const supabase = createClient(
  dkd_supabase_ready ? dkd_supabase_url : 'https://example.invalid',
  dkd_supabase_ready ? dkd_supabase_key : 'dkd_missing_public_key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
