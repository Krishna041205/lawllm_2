import { query, checkDatabaseHealth, closePool } from "./connection.js";

/**
 * Verify database health, pgvector extension, and schema integrity
 */
export async function verifyDatabase(): Promise<boolean> {
  console.log("🔍 [DB:VERIFY] Testing PostgreSQL connection and pgvector extension...");

  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.error("❌ [DB:VERIFY] Database is not reachable:", health.error || "Connection refused");
    console.log("💡 Tip: Start PostgreSQL with: docker compose up -d");
    return false;
  }

  console.log("✅ [DB:VERIFY] PostgreSQL connection established successfully.");

  // Verify pgvector extension
  const vectorRes = await query(
    "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
  );
  if (vectorRes.rows.length === 0) {
    console.error("❌ [DB:VERIFY] pgvector extension is NOT installed or enabled.");
    console.log("💡 Tip: Run 'npm run db:migrate' to enable pgvector extension.");
    return false;
  }

  console.log(`✅ [DB:VERIFY] pgvector extension verified! (Version: ${vectorRes.rows[0].extversion})`);

  // Verify core tables
  const tablesRes = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('schema_migrations', 'documents', 'document_chunks');
  `);

  const foundTables = tablesRes.rows.map((r) => r.table_name);
  console.log(`📊 [DB:VERIFY] Verified tables present in public schema: [${foundTables.join(", ")}]`);

  if (!foundTables.includes("documents") || !foundTables.includes("document_chunks")) {
    console.warn("⚠️ [DB:VERIFY] Some tables are missing. Please run: npm run db:migrate");
    return false;
  }

  // Count existing records
  const docCount = await query("SELECT COUNT(*)::int as count FROM documents;");
  const chunkCount = await query("SELECT COUNT(*)::int as count FROM document_chunks;");

  console.log(`📄 [DB:VERIFY] Current documents count: ${docCount.rows[0]?.count || 0}`);
  console.log(`🧩 [DB:VERIFY] Current document chunks count: ${chunkCount.rows[0]?.count || 0}`);
  console.log("🎉 [DB:VERIFY] All verification checks passed!");

  return true;
}

// Allow standalone execution
if (process.argv[1]?.includes("verify.ts")) {
  verifyDatabase()
    .then((success) => {
      closePool();
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("❌ [DB:VERIFY] Unexpected verification error:", err);
      closePool();
      process.exit(1);
    });
}
