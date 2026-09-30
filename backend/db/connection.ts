import pg from "pg";
import dotenv from "dotenv";
import { execSync } from "child_process";
import fs from "fs";

dotenv.config({ override: true });

const { Pool } = pg;

// Helper to ensure local PostgreSQL daemon is started if running in local Linux environment
function ensureLocalPostgresRunning(): void {
  try {
    if (fs.existsSync("/etc/init.d/postgresql")) {
      execSync("/etc/init.d/postgresql start", { stdio: "ignore" });
    }
  } catch {
    // Non-fatal if unprivileged or running against remote container/host
  }
}

// Helper to detect placeholder/dummy configuration values
function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  const upper = trimmed.toUpperCase();
  return (
    upper === "POST_URL" ||
    upper === "POST_HOST" ||
    upper === "POST_USER" ||
    upper === "POST_PASS" ||
    upper === "POST_PASSWORD" ||
    upper === "POST_DB" ||
    upper === "POSTGRES_PASSWORD" ||
    upper === "UNDEFINED" ||
    upper === "NULL" ||
    upper.startsWith("YOUR_") ||
    upper.includes("PLACEHOLDER")
  );
}

// Construct configuration from DATABASE_URL or individual PG environment variables
function getPoolConfig(): pg.PoolConfig {
  let connectionString = process.env.DATABASE_URL;
  if (isPlaceholder(connectionString)) {
    connectionString = undefined;
  }

  if (connectionString && (connectionString.startsWith("postgresql://") || connectionString.startsWith("postgres://"))) {
    return {
      connectionString,
      // Default pool limits suitable for web backend
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    };
  }

  const host = !isPlaceholder(process.env.POSTGRES_HOST)
    ? process.env.POSTGRES_HOST!
    : "localhost";

  const user = !isPlaceholder(process.env.POSTGRES_USER)
    ? process.env.POSTGRES_USER!
    : "lawllm";

  const password = !isPlaceholder(process.env.POSTGRES_PASSWORD)
    ? process.env.POSTGRES_PASSWORD!
    : "lawllm_secure_dev_pw";

  const database = !isPlaceholder(process.env.POSTGRES_DB)
    ? process.env.POSTGRES_DB!
    : "lawllm";

  const port = parseInt(process.env.POSTGRES_PORT || "5432", 10) || 5432;

  return {
    host,
    port,
    user,
    password,
    database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  };
}

// Global connection pool instance - reused across requests
let poolInstance: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool(getPoolConfig());

    poolInstance.on("error", (err) => {
      const msg = err?.message || String(err);
      if (
        msg.includes("terminating connection") ||
        msg.includes("Connection terminated") ||
        msg.includes("client has been closed") ||
        msg.includes("closed")
      ) {
        // Normal pool client lifecycle event when PostgreSQL server reloads or closes idle connections
        console.warn("ℹ️ [DB:Pool] Idle client connection closed by PostgreSQL:", msg);
      } else {
        console.warn("⚠️ [DB:Pool] Idle PostgreSQL client notice:", msg);
      }
    });
  }
  return poolInstance;
}

/**
 * Execute a query with connection pooling and transient retry support
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const pool = getDbPool();
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    const isConnErr =
      err?.message?.includes("terminating connection") ||
      err?.message?.includes("Connection terminated") ||
      err?.code === "57P01" ||
      err?.code === "57P02" ||
      err?.code === "57P03" ||
      err?.code === "ECONNRESET" ||
      err?.code === "ECONNREFUSED";

    if (isConnErr) {
      console.warn("⚠️ [DB] Connection reset detected in query, retrying once...");
      ensureLocalPostgresRunning();
      await new Promise((r) => setTimeout(r, 300));
      return pool.query<T>(text, params);
    }
    throw err;
  }
}

/**
 * Check if the database is reachable and verify pgvector extension
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  configured: boolean;
  pgvector: boolean;
  error?: string;
}> {
  const cfg = getPoolConfig();
  const hasConfig = Boolean(cfg.connectionString || (cfg.host && cfg.database));
  if (!hasConfig) {
    return { connected: false, configured: false, pgvector: false };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const pool = getDbPool();
      // Test basic connectivity with a short timeout
      const res = await pool.query("SELECT 1 as alive");
      if (!res || res.rows.length === 0) {
        return { connected: false, configured: true, pgvector: false, error: "Empty ping response" };
      }

      // Check pgvector extension status
      const extRes = await pool.query(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
      );
      const hasVector = extRes.rows.some((r) => r.extname === "vector");

      return {
        connected: true,
        configured: true,
        pgvector: hasVector,
      };
    } catch (err: any) {
      if (attempt === 1 && (cfg.host === "localhost" || cfg.host === "127.0.0.1")) {
        ensureLocalPostgresRunning();
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      return {
        connected: false,
        configured: true,
        pgvector: false,
        error: err?.message || String(err),
      };
    }
  }

  return { connected: false, configured: true, pgvector: false, error: "Connection attempt failed" };
}

/**
 * Gracefully close the connection pool on server shutdown
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
