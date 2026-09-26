import "server-only";
import pg, { type PoolClient, type QueryResultRow } from "pg";

const { Pool } = pg;

// Keep DATE and TIME columns as plain strings ("2026-09-26", "10:30:00") so a
// date never shifts by passing through a JavaScript Date in the server's timezone.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.TIME, (v) => v);

const globalForDb = globalThis as unknown as { somsPool?: pg.Pool };

function getPool() {
  if (!globalForDb.somsPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.somsPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForDb.somsPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Postgres unique_violation, e.g. two patients racing for the same slot. */
export function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
