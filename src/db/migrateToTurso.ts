import "dotenv/config";
import type { InValue } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";
import { getTursoClient } from "./turso";
import { tursoSchemaStatements, tursoTableOrder } from "./tursoSchema";
import { openSqliteDatabase } from "./sqlite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.resolve(__dirname, "../../data/database.sqlite");
const sourceDb = openSqliteDatabase(sqlitePath, { readOnly: true });
const targetDb = getTursoClient();

const shouldReplace = process.argv.includes("--replace");

type TableName = (typeof tursoTableOrder)[number];

type UserIdMap = Map<string, string>;

function getTableColumns(table: TableName) {
  const rows = sourceDb.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

async function buildUserIdMap(): Promise<UserIdMap> {
  const map: UserIdMap = new Map();
  const localUsers = sourceDb.prepare("SELECT id, email FROM users").all() as { id: string; email: string }[];

  for (const user of localUsers) {
    if (!user.email) continue;
    const result = await targetDb.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
      args: [user.email],
    });
    const remoteId = result.rows[0]?.id as string | undefined;
    if (remoteId && remoteId !== user.id) {
      map.set(user.id, remoteId);
    }
  }

  return map;
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
  const userIdColumns = new Set([
    "userId",
    "ownerId",
    "senderId",
    "receiverId",
    "reviewedBy",
    "providerId",
  ]);

  const sql =
    table === "users"
      ? `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
         ON CONFLICT(email) DO UPDATE SET ${columns
           .filter((column) => column !== "id")
           .map((column) => `${column}=excluded.${column}`)
           .join(", ")}`
      : `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  for (const row of rows) {
    const args = columns.map((column): InValue => {
      let value = row[column];
      if (column !== "id" && userIdColumns.has(column) && typeof value === "string" && userIdMap.has(value)) {
        value = userIdMap.get(value);
      }
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
  console.log("Mapping existing Turso users by email...");
  userIdMap = await buildUserIdMap();

  if (shouldReplace) {
    console.log("Replacing existing Turso data...");
    await clearTargetData();
  }

  for (const table of tursoTableOrder) {
    await migrateTable(table);
  }

  console.log("Turso migration complete.");
}

let userIdMap: UserIdMap = new Map();

main()
  .catch((error) => {
    console.error("Turso migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    sourceDb.close();
  });
