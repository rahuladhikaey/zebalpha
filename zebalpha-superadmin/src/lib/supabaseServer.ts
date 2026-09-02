import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bprkenwmheakcqryjupi.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var for server-side Supabase operations");
}

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
