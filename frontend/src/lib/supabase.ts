/**
 * PARK — Supabase Client
 * Only used for login/signup/session management. All data reads and
 * writes go through our own FastAPI backend (see lib/api.ts).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — real login will not work until .env is configured."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
