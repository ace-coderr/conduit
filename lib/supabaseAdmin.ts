import { createClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as { supabaseAdmin: ReturnType<typeof createClient> | undefined };

export const supabaseAdmin =
  globalForSupabase.supabaseAdmin ??
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

if (process.env.NODE_ENV !== "production") globalForSupabase.supabaseAdmin = supabaseAdmin;

export const AVATAR_BUCKET = "avatars";
