import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDbPool, closePool } from "./connection.js";
import { seedDatabase } from "./seed.js";
import { verifyDatabase } from "./verify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

interface AppliedMigration {
  id: number;
  migration_name: string;
  applied_at: string;
}

/**
 * Ensure the migration tracking table exists
 */
async function ensureMigrationTable(): Promise<void> {
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Get all migration files from the migrations directory sorted in order
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found at: ${MIGRATIONS_DIR}`);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Get all applied migrations from schema_migrations
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  const pool = getDbPool();
  const res = await pool.query<AppliedMigration>(
    "SELECT id, migration_name, applied_at FROM schema_migrations ORDER BY id ASC;"
  );
  return res.rows;
}

/**
 * Execute all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log("🚀 [DB:MIGRATE] Connecting to PostgreSQL to execute migrations...");
  await ensureMigrationTable();

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();
  const appliedNames = new Set(applied.map((m) => m.migration_name));

  const pending = files.filter((f) => !appliedNames.has(f));

  if (pending.length === 0) {
    console.log("✨ [DB:MIGRATE] No pending migrations. Database schema is up to date.");
    return;
  }

  console.log(`📦 [DB:MIGRATE] Found ${pending.length} pending migration(s) to apply.`);

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      console.log(`▶️  [DB:MIGRATE] Executing: ${file}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1);",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✅ [DB:MIGRATE] Successfully applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ [DB:MIGRATE] Failed while executing ${file}:`, err);
        throw err;
      }
    }
    console.log("🎉 [DB:MIGRATE] All pending migrations applied successfully!");
  } finally {
    client.release();
  }
}

/**
 * Output status of all migrations
 */
export async function checkMigrationStatus(): Promise<void> {
  console.log("📋 [DB:STATUS] Checking migration status...");
  await ensureMigrationTable();

  const files = getMigrationFiles();
  const applied = await getAppliedMigrations();
  const appliedMap = new Map(applied.map((m) => [m.migration_name, m.applied_at]));

  console.log("\n--- Migration History ---");
  for (const file of files) {
    const appliedAt = appliedMap.get(file);
    if (appliedAt) {
      console.log(`  [APPLIED]  ${file}  (at: ${new Date(appliedAt).toLocaleString()})`);
    } else {
      console.log(`  [PENDING]  ${file}`);
    }
  }
  console.log("-------------------------\n");
}

/**
 * Safely reset the development database
 */
export async function resetDatabase(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const forceFlag = process.argv.includes("--force-danger");

  if (isProduction && !forceFlag) {
    console.error("🛑 [DB:RESET] DANGER: Cannot reset database in PRODUCTION environment without --force-danger flag.");
    process.exit(1);
  }

  console.log("⚠️  [DB:RESET] Resetting development database...");
  const pool = getDbPool();

  // Drop tables with cascade
  await pool.query(`
    DROP TABLE IF EXISTS ingestion_jobs CASCADE;
    DROP TABLE IF EXISTS court_sources CASCADE;
    DROP TABLE IF EXISTS document_chunks CASCADE;
    DROP TABLE IF EXISTS documents CASCADE;
    DROP TABLE IF EXISTS schema_migrations CASCADE;
  `);

  console.log("🧹 [DB:RESET] Cleaned existing tables. Re-applying all migrations from scratch...");
  await runMigrations();
  console.log("✨ [DB:RESET] Database reset complete and clean schema re-established!");
}

// CLI Command Dispatcher
async function main() {
  const command = process.argv[2] || "migrate";

  try {
    switch (command) {
      case "migrate":
        await runMigrations();
        break;
      case "status":
        await checkMigrationStatus();
        break;
      case "reset":
        await resetDatabase();
        break;
      case "seed":
        await seedDatabase();
        break;
      case "verify":
        await verifyDatabase();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log("Usage: tsx migrator.ts [migrate|status|reset|seed|verify]");
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`💥 [DB] Error during '${command}':`, err?.message || err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

if (process.argv[1]?.includes("migrator.ts")) {
  main();
}
