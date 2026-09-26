// Creates the clinic's admin account, or resets its password if it exists.
//
//   ADMIN_USERNAME=reception ADMIN_PASSWORD='a long passphrase' npm run admin:create
//
// Credentials are read from the environment (not argv) so they don't land in
// shell history or the process list.
import bcrypt from "bcryptjs";
import pg from "pg";

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("Set DATABASE_URL, ADMIN_USERNAME and ADMIN_PASSWORD.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [ADMIN_USERNAME.trim(), hash],
  );
  // A password reset should sign out every existing session for that account.
  await client.query("DELETE FROM admin_sessions WHERE admin_user_id = $1", [rows[0].id]);
  console.log(`Admin account "${ADMIN_USERNAME.trim()}" is ready.`);
} finally {
  await client.end();
}
