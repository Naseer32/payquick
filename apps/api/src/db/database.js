/**
 * database.js
 *
 * Single pg Pool shared across the application.
 * pool.on("error") is registered in server.js after import so the error
 * handler is in place before any requests are handled.
 */

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. The API will not be able to connect to the database."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep a small pool size for serverless/Render free-tier environments.
  // Override via PG_POOL_MAX env var for higher-throughput deployments.
  max: parseInt(process.env.PG_POOL_MAX || "10", 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export function query(text, params) {
  return pool.query(text, params);
}

export default pool;
