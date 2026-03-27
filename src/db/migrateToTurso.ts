import "dotenv/config";
import type { InValue } from "@libsql/client";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { getTursoClient } from "./turso";
import { tursoSchemaStatements, tursoTableOrder } from "./tursoSchema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.resolve(__dirname, "../../data/database.sqlite");
const sourceDb = new Database(sqlitePath, { readonly: true });
const targetDb = getTursoClient();

const shouldReplace = process.argv.includes("--replace");

type TableName = (typeof tursoTableOrder)[number];

function getTableColumns(table: TableName) {
  const rows = sourceDb.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

async function ensureSchema() {
  for (const sql of tursoSchemaStatements) {
    await targetDb.execute(sql);
  }
}

async function clearTargetData() {
  const reverseOrder = [...tursoTableOrder].reverse();
  for (const table of reverseOrder) {
    await targetDb.execute(`DELETE FROM ${table}`);
  }
}

async function migrateTable(table: TableName) {
  const columns = getTableColumns(table);
  const rows = sourceDb.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log(`Skipping ${table}: no rows`);
    return;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  for (const row of rows) {
    const args = columns.map((column): InValue => {
      const value = row[column];
      return typeof value === "boolean" ? Number(value) : ((value ?? null) as InValue);
    });

    await targetDb.execute({
      sql,
      args,
    });
  }

  console.log(`Migrated ${rows.length} rows into ${table}`);
}

async function main() {
  console.log(`Using source SQLite: ${sqlitePath}`);
  console.log("Preparing Turso schema...");
  await ensureSchema();

  if (shouldReplace) {
    console.log("Replacing existing Turso data...");
    await clearTargetData();
  }

  for (const table of tursoTableOrder) {
    await migrateTable(table);
  }

  console.log("Turso migration complete.");
}

main()
  .catch((error) => {
    console.error("Turso migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    sourceDb.close();
  });
