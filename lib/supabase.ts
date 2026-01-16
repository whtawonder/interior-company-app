import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// 환경변수 로드 (여러 방법 시도)
const supabaseUrl = 
  Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://efnzzofcaldjwnaqqfkv.supabase.co'  // 폴백

const supabaseAnonKey = 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_NpUkJZTBdxUBnnbcWYc1QA_iH_-MaAy'  // 폴백

console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🔑 Key exists:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경변수 누락!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})
