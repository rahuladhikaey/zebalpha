import { createClient } from "@supabase/supabase-js";

// Customer Application reads directly from Customer DB (bprkenwmheakcqryjupi.supabase.co)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bprkenwmheakcqryjupi.supabase.co";
const supabaseKey = process.env.SUPABASE_A_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
