import { createClient } from '@supabase/supabase-js'

// Datos del proyecto de Supabase (vienen del archivo .env o de Vercel)
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Nombre del bucket donde se guardan las fotos
export const BUCKET = 'fotos-fiesta'

// Si faltan las variables, la app muestra una pantalla de ayuda en vez de romperse
export const configuracionCompleta = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// Los invitados no inician sesión, así que no guardamos sesión de auth
export const supabase = configuracionCompleta
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null
