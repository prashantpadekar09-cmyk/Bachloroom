import "dotenv/config";
import { db, setupDb } from "./setup.js";
import { getSupabasePool, hasSupabaseDbConfig, closeSupabasePool } from "./supabase.js";
import { supabaseSchemaStatements, supabaseTableOrder } from "./supabaseSchema.js";

type TableName = (typeof supabaseTableOrder)[number];

function quoteIdent(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function getColumns(table: TableName) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

async function ensureRemoteSchema() {
  const pool = getSupabasePool();
  const client = await pool.connect();
  try {
    for (const sql of supabaseSchemaStatements) {
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

async function clearRemote() {
  const pool = getSupabasePool();
  const client = await pool.connect();
  try {
    for (const table of [...supabaseTableOrder].reverse()) {
      await client.query(`DELETE FROM ${quoteIdent(table)}`);
    }
  } finally {
    client.release();
  }
}

async function migrateToSupabase({ replace }: { replace: boolean }) {
  if (!hasSupabaseDbConfig()) {
    throw new Error("Missing SUPABASE_DB_URL (or DATABASE_URL).");
  }

  await ensureRemoteSchema();
  if (replace) {
    await clearRemote();
  }

  const pool = getSupabasePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const table of supabaseTableOrder) {
      const columns = getColumns(table);
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (rows.length === 0) continue;

      const quotedColumns = columns.map(quoteIdent).join(", ");
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const onConflict = replace ? "" : " ON CONFLICT DO NOTHING";
      const insertSql = `INSERT INTO ${quoteIdent(table)} (${quotedColumns}) VALUES (${placeholders})${onConflict}`;

      for (const row of rows) {
        const values = columns.map((column) => row[column] ?? null);
        await client.query(insertSql, values);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const replace = process.argv.includes("--replace");

  setupDb();
  await migrateToSupabase({ replace });

  console.log(`Supabase migration complete (${replace ? "replaced remote data" : "merged without overwrites"}).`);
}

main()
  .catch((error) => {
    console.error("Supabase migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeSupabasePool();
    } catch {}
  });

