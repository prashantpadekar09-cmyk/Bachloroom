import type { InValue } from "@libsql/client";
import { db } from "./setup.js";
import { getTursoClient } from "./turso.js";
import { tursoSchemaStatements, tursoTableOrder } from "./tursoSchema.js";

type TableName = (typeof tursoTableOrder)[number];

let mirrorEnabled = false;
let syncTimer: NodeJS.Timeout | null = null;
let syncInFlight: Promise<void> | null = null;

function hasTursoConfig() {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim());
}

function getColumns(table: TableName) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

function getLocalCount(table: TableName) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count?: number };
  return row?.count ?? 0;
}

async function getRemoteCount(table: TableName) {
  const client = getTursoClient();
  const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function ensureRemoteSchema() {
  const client = getTursoClient();
  for (const sql of tursoSchemaStatements) {
    await client.execute(sql);
  }
}

async function clearRemote() {
  const client = getTursoClient();
  for (const table of [...tursoTableOrder].reverse()) {
    await client.execute(`DELETE FROM ${table}`);
  }
}

async function clearLocal() {
  for (const table of [...tursoTableOrder].reverse()) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

async function pushLocalToRemote() {
  const client = getTursoClient();

  await clearRemote();

  for (const table of tursoTableOrder) {
    const columns = getColumns(table);
    const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    if (rows.length === 0) {
      continue;
    }

    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
    for (const row of rows) {
      const args = columns.map((column): InValue => {
        const value = row[column];
        return typeof value === "boolean" ? Number(value) : ((value ?? null) as InValue);
      });

      await client.execute({ sql, args });
    }
  }
}

async function pullRemoteToLocal() {
  const client = getTursoClient();

  db.exec("BEGIN");
  try {
    await clearLocal();

    for (const table of tursoTableOrder) {
      const columns = getColumns(table);
      const result = await client.execute(`SELECT * FROM ${table}`);
      if (result.rows.length === 0) {
        continue;
      }

      const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
      const insert = db.prepare(sql);

      for (const row of result.rows as Record<string, unknown>[]) {
        const values = columns.map((column) => {
          const value = row[column];
          return value === undefined ? null : value;
        });
        insert.run(...values);
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function initTursoMirror() {
  if (!hasTursoConfig()) {
    mirrorEnabled = false;
    return { enabled: false as const };
  }

  await ensureRemoteSchema();

  const localUsers = getLocalCount("users");
  const remoteUsers = await getRemoteCount("users");

  if (localUsers === 0 && remoteUsers > 0) {
    await pullRemoteToLocal();
  } else if (localUsers > 0 && remoteUsers === 0) {
    await pushLocalToRemote();
  }

  mirrorEnabled = true;
  return { enabled: true as const };
}

export function scheduleTursoSync(reason = "manual") {
  if (!mirrorEnabled || !hasTursoConfig()) {
    return;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    const run = async () => {
      try {
        await pushLocalToRemote();
        console.log(`[turso] synced local SQLite to remote (${reason})`);
      } catch (error) {
        console.error("[turso] sync failed:", error);
      }
    };

    syncInFlight = run().finally(() => {
      syncInFlight = null;
    });
  }, 1200);
}

export async function flushTursoSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
    await pushLocalToRemote();
  } else if (syncInFlight) {
    await syncInFlight;
  }
}

export function isTursoMirrorEnabled() {
  return mirrorEnabled;
}
