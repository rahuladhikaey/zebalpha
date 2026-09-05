import { createClient } from "@supabase/supabase-js";

// Customer Application reads directly from Customer DB (qjpahzstldiatfbutvfc.supabase.co)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co";
const supabaseKey = process.env.SUPABASE_A_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Mm3pqD7ev-c76TXhkL0ajQ_ZHq325WW";

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
