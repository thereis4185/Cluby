// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// 중요: 이 값들은 Supabase 대시보드의 API 설정에서 가져오세요.
const supabaseUrl = "https://dcofzphctplowbqobsgx.supabase.co"
const supabaseAnonKey = "sb_publishable_V_UeHobeTFg5HquJNKewdg_Gap1pHLh"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)