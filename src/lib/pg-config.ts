/**
 * node-postgres pool config, as consumed by `@prisma/adapter-pg`.
 * Either a full connection string or discrete fields.
 */
export interface PgConnectionConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

/**
 * Resolve the Postgres connection config for the Prisma pg adapter.
 *
 * Prefers discrete `PG*` env vars (PGHOST / PGPORT / PGUSER / PGPASSWORD /
 * PGDATABASE) over `DATABASE_URL`. Passing the password as its own value
 * sidesteps connection-string URL parsing entirely, so reserved characters
 * (`$ : @ / ? #` …) in the password never need percent-encoding and cannot
 * be misinterpreted by the driver.
 *
 * Falls back to `DATABASE_URL` when no `PGHOST` is set (local dev, tests).
 */
export function resolvePgConfig(): PgConnectionConfig {
  const host = process.env.PGHOST ?? process.env.POSTGRES_HOST;

  if (host) {
    return {
      host,
      port: Number(process.env.PGPORT ?? "5432"),
      user: process.env.PGUSER ?? process.env.POSTGRES_USER,
      password: process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD,
      database: process.env.PGDATABASE ?? process.env.POSTGRES_DB,
    };
  }

  return { connectionString: process.env.DATABASE_URL };
}
