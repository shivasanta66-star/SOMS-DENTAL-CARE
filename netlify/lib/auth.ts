import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, must } from "./db";
import { getCookie, serializeCookie } from "./http";

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
  const user = must(
    await db().from("admin_users").select("id, username, password_hash").eq("username", username.trim()).maybeSingle(),
  ) as { id: number; username: string; password_hash: string } | null;
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  return user && ok ? { id: user.id, username: user.username } : null;
}

/** Creates a session and returns the Set-Cookie header value. */
export async function startSession(req: Request, adminId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();
  must(await db().from("admin_sessions").insert({ token_hash: hashToken(token), admin_user_id: adminId, expires_at: expiresAt }));
  must(await db().from("admin_sessions").delete().lt("expires_at", new Date().toISOString()));
  return serializeCookie(req, COOKIE, token, SESSION_HOURS * 3600);
}

/** Deletes the session and returns the Set-Cookie header value that clears it. */
export async function endSession(req: Request) {
  const token = getCookie(req, COOKIE);
  if (token) must(await db().from("admin_sessions").delete().eq("token_hash", hashToken(token)));
  return serializeCookie(req, COOKIE, "", 0);
}

export async function getAdmin(req: Request): Promise<Admin | null> {
  const token = getCookie(req, COOKIE);
  if (!token) return null;
  const session = must(
    await db()
      .from("admin_sessions")
      .select("admin_user_id, admin_users(id, username)")
      .eq("token_hash", hashToken(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
  ) as { admin_user_id: number; admin_users: Admin | Admin[] | null } | null;
  const user = Array.isArray(session?.admin_users) ? session.admin_users[0] : session?.admin_users;
  return user ? { id: user.id, username: user.username } : null;
}

export async function changePassword(req: Request, adminId: number, currentPassword: string, newPassword: string) {
  const row = must(await db().from("admin_users").select("password_hash").eq("id", adminId).maybeSingle()) as { password_hash: string } | null;
  if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) return false;
  const hash = await bcrypt.hash(newPassword, 12);
  must(await db().from("admin_users").update({ password_hash: hash }).eq("id", adminId));
  // Sign out every other session.
  const token = getCookie(req, COOKIE);
  must(await db().from("admin_sessions").delete().eq("admin_user_id", adminId).neq("token_hash", token ? hashToken(token) : ""));
  return true;
}

export async function hasAdminAccount() {
  const { count, error } = await db().from("admin_users").select("id", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}
