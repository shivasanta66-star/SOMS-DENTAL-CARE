// Creates the clinic's admin account, or resets its password if it exists.
// (Alternative to running SELECT public.set_admin_password(...) in the
// Supabase SQL Editor.)
//
// With the Netlify CLI linked to the site, it picks up SUPABASE_URL and
// SUPABASE_SECRET_KEY from Netlify automatically:
//   ADMIN_USERNAME=reception ADMIN_PASSWORD='a long passphrase' npx netlify dev:exec npm run admin:create
//
// Credentials are read from the environment (not argv) so they don't land in
// the process list.
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("Set SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_USERNAME and ADMIN_PASSWORD.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const username = ADMIN_USERNAME.trim();
const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

const { data, error } = await supabase
  .from("admin_users")
  .upsert({ username, password_hash: hash }, { onConflict: "username" })
  .select("id")
  .single();
if (error) {
  console.error(`Could not save the admin account: ${error.message}`);
  process.exit(1);
}
// A password reset should sign out every existing session for that account.
await supabase.from("admin_sessions").delete().eq("admin_user_id", data.id);
console.log(`Admin account "${username}" is ready.`);
