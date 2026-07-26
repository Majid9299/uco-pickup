import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

// نمرّر رابطًا وهميًا صالح الصيغة لما القاعدة غير مربوطة بعد، حتى لا تفشل
// createClient بالبناء — كل الاستخدام الفعلي محمي بفحص isSupabaseConfigured
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
