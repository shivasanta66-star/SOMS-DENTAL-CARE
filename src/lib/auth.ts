import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { query } from "./db";

const COOKIE = "soms_admin";
const SESSION_HOURS = 12;
// Compared against when the username doesn't exist, so a wrong username takes
// as long as a wrong password and doesn't reveal which accounts exist.
const DUMMY_HASH = "$2b$12$7kzNeaQoUCmSHwX9TRWKHO5X6GtlYttX2wr3T7yAVxTfSYuuqT4DC";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type Admin = { id: number; username: string };

export async function verifyCredentials(username: string, password: string): Promise<Admin | null> {
  const { rows } = await query<{ id: number; username: string; password_hash: string }>(
    "SELECT id, username, password_hash FROM admin_users WHERE username = $1",
    [username.trim()],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  return user && ok ? { id: user.id, username: user.username } : null;
}

export async function startSession(adminId: number) {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO admin_sessions (token_hash, admin_user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(hours => $3))`,
    [hashToken(token), adminId, SESSION_HOURS],
  );
  await query("DELETE FROM admin_sessions WHERE expires_at < now()");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("DELETE FROM admin_sessions WHERE token_hash = $1", [hashToken(token)]);
  jar.delete(COOKIE);
}

export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query<Admin>(
    `SELECT u.id, u.username FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
});

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function changePassword(adminId: number, currentPassword: string, newPassword: string) {
  const { rows } = await query<{ password_hash: string }>("SELECT password_hash FROM admin_users WHERE id = $1", [adminId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) return false;
  const hash = await bcrypt.hash(newPassword, 12);
  await query("UPDATE admin_users SET password_hash = $2 WHERE id = $1", [adminId, hash]);
  // Sign out every other session.
  const token = (await cookies()).get(COOKIE)?.value;
  await query("DELETE FROM admin_sessions WHERE admin_user_id = $1 AND token_hash <> $2", [adminId, token ? hashToken(token) : ""]);
  return true;
}
