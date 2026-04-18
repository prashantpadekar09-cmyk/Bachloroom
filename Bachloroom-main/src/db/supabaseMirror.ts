import { db } from "./setup.js";
import { getSupabasePool, hasSupabaseDbConfig } from "./supabase.js";
import { supabaseSchemaStatements, supabaseTableOrder } from "./supabaseSchema.js";

type TableName = (typeof supabaseTableOrder)[number];

let mirrorEnabled = false;
let syncTimer: NodeJS.Timeout | null = null;
let syncInFlight: Promise<void> | null = null;

function quoteIdent(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function normalizeSqliteValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "boolean") {
    return Number(value);
  }
  return value;
}

const booleanColumns = new Set<string>([
  "users.isPremium",
  "users.isVerified",
  "rooms.isFeatured",
  "rooms.isLuxury",
  "messages.isRead",
]);

function normalizePostgresValue(table: TableName, column: string, value: unknown) {
  if (booleanColumns.has(`${table}.${column}`)) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return Boolean(value);
    if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
    return Boolean(value);
  }

  return value;
}

function getColumns(table: TableName) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((row) => row.name);
}

function getLocalCount(table: TableName) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count?: number };
  return row?.count ?? 0;
}

function getMeaningfulLocalUserCount() {
  const row = db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM users
        WHERE role != 'admin'
          AND email != 'services.curated@bachelorrooms.local'
          AND id NOT LIKE 'demo-%'
          AND id NOT LIKE 'showcase-%'
          AND email NOT LIKE 'demo.%@example.com'
      `
    )
    .get() as { count?: number };
  return row?.count ?? 0;
}

function getMeaningfulLocalRoomCount() {
  const row = db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM rooms
        WHERE id NOT LIKE 'demo-%'
          AND id NOT LIKE 'showcase-room-%'
      `
    )
    .get() as { count?: number };
  return row?.count ?? 0;
}

async function getRemoteCount(table: TableName) {
  const pool = getSupabasePool();
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM ${quoteIdent(table)}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function getMeaningfulRemoteUserCount() {
  const pool = getSupabasePool();
  const result = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM users
    WHERE role != 'admin'
      AND email != 'services.curated@bachelorrooms.local'
      AND id NOT LIKE 'demo-%'
      AND id NOT LIKE 'showcase-%'
      AND email NOT LIKE 'demo.%@example.com'
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function getMeaningfulRemoteRoomCount() {
  const pool = getSupabasePool();
  const result = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM rooms
    WHERE id NOT LIKE 'demo-%'
      AND id NOT LIKE 'showcase-room-%'
  `);
  return Number(result.rows[0]?.count ?? 0);
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

async function clearLocal() {
  for (const table of [...supabaseTableOrder].reverse()) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

export async function pushLocalToSupabase() {
  await ensureRemoteSchema();

  const pool = getSupabasePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of [...supabaseTableOrder].reverse()) {
      await client.query(`DELETE FROM ${quoteIdent(table)}`);
    }

    for (const table of supabaseTableOrder) {
      const columns = getColumns(table);
      const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (rows.length === 0) continue;

      const quotedColumns = columns.map(quoteIdent).join(", ");
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const insertSql = `INSERT INTO ${quoteIdent(table)} (${quotedColumns}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map((column) => normalizePostgresValue(table, column, row[column] ?? null));
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

async function pullSupabaseToLocal() {
  await ensureRemoteSchema();

  const pool = getSupabasePool();
  const client = await pool.connect();

  db.exec("BEGIN");
  try {
    await clearLocal();

    for (const table of supabaseTableOrder) {
      const columns = getColumns(table);
      const result = await client.query<Record<string, unknown>>(`SELECT * FROM ${quoteIdent(table)}`);
      if (result.rows.length === 0) continue;

      const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
      const insert = db.prepare(sql);

      for (const row of result.rows) {
        const values = columns.map((column) => normalizeSqliteValue(row[column] === undefined ? null : row[column]));
        insert.run(...values);
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initSupabaseMirror() {
  if (!hasSupabaseDbConfig()) {
    mirrorEnabled = false;
    return { enabled: false as const };
  }

  await ensureRemoteSchema();

  const localUsers = getLocalCount("users");
  const remoteUsers = await getRemoteCount("users");
  const localMeaningfulUsers = getMeaningfulLocalUserCount();
  const remoteMeaningfulUsers = await getMeaningfulRemoteUserCount();
  const localMeaningfulRooms = getMeaningfulLocalRoomCount();
  const remoteMeaningfulRooms = await getMeaningfulRemoteRoomCount();

  if (
    remoteMeaningfulUsers > localMeaningfulUsers ||
    remoteMeaningfulRooms > localMeaningfulRooms ||
    (localUsers === 0 && remoteUsers > 0)
  ) {
    await pullSupabaseToLocal();
  } else if (
    (localMeaningfulUsers > remoteMeaningfulUsers || localMeaningfulRooms > remoteMeaningfulRooms) &&
    (localMeaningfulUsers > 0 || localMeaningfulRooms > 0)
  ) {
    await pushLocalToSupabase();
  } else if (localUsers > 0 && remoteUsers === 0) {
    await pushLocalToSupabase();
  }

  mirrorEnabled = true;
  return { enabled: true as const };
}

export function scheduleSupabaseSync(reason = "manual") {
  if (!mirrorEnabled || !hasSupabaseDbConfig()) {
    return;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    const run = async () => {
      try {
        await pushLocalToSupabase();
        console.log(`[supabase] synced local SQLite to remote (${reason})`);
      } catch (error) {
        console.error("[supabase] sync failed:", error);
      }
    };

    syncInFlight = run().finally(() => {
      syncInFlight = null;
    });
  }, 1200);
}

export async function flushSupabaseSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
    await pushLocalToSupabase();
  } else if (syncInFlight) {
    await syncInFlight;
  }
}

export function isSupabaseMirrorEnabled() {
  return mirrorEnabled;
}

