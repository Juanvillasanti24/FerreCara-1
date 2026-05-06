import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://leowqlyezydpsklzoszq.supabase.co';
// Limpiar la URL de posibles errores de formato
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlb3dxbHllenlkcHNrbHpvc3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODA5MTQsImV4cCI6MjA5MzY1NjkxNH0.snUsddplIsGxmzPFxPNB1WkaoRkRGYWTZd6IfqzgHTw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
