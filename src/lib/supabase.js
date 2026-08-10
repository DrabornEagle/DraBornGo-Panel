import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const dkd_supabase_url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const dkd_supabase_key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const dkd_supabase_ready = Boolean(dkd_supabase_url && dkd_supabase_key);

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
