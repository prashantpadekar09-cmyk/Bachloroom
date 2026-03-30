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

function getMeaningfulLocalUserCount() {
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM users
    WHERE role != 'admin'
      AND email != 'services.curated@bachelorrooms.local'
      AND id NOT LIKE 'demo-%'
      AND id NOT LIKE 'showcase-%'
      AND email NOT LIKE 'demo.%@example.com'
  `).get() as { count?: number };
  return row?.count ?? 0;
}

function getMeaningfulLocalRoomCount() {
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM rooms
    WHERE id NOT LIKE 'demo-%'
      AND id NOT LIKE 'showcase-room-%'
  `).get() as { count?: number };
  return row?.count ?? 0;
}

async function getRemoteCount(table: TableName) {
  const client = getTursoClient();
  const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function getMeaningfulRemoteUserCount() {
  const client = getTursoClient();
  const result = await client.execute(`
    SELECT COUNT(*) as count
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
  const client = getTursoClient();
  const result = await client.execute(`
    SELECT COUNT(*) as count
    FROM rooms
    WHERE id NOT LIKE 'demo-%'
      AND id NOT LIKE 'showcase-room-%'
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function remoteHasColumn(table: string, column: string) {
  const client = getTursoClient();
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => row.name === column);
}

async function ensureRemoteColumn(table: string, column: string, definition: string) {
  if (await remoteHasColumn(table, column)) {
    return;
  }

  const client = getTursoClient();
  await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function ensureRemoteSchema() {
  const client = getTursoClient();
  for (const sql of tursoSchemaStatements) {
    await client.execute(sql);
  }

  await ensureRemoteColumn("rooms", "lat", "REAL");
  await ensureRemoteColumn("rooms", "lng", "REAL");
  await ensureRemoteColumn("rooms", "isFeatured", "BOOLEAN DEFAULT 0");
  await ensureRemoteColumn("rooms", "isLuxury", "BOOLEAN DEFAULT 0");
  await ensureRemoteColumn("rooms", "depositLabel", "TEXT");
  await ensureRemoteColumn("rooms", "sourceLabel", "TEXT");
  await ensureRemoteColumn("rooms", "sourceUrl", "TEXT");
  await ensureRemoteColumn("rooms", "priceLabel", "TEXT");
  await ensureRemoteColumn("rooms", "billingPeriod", "TEXT DEFAULT 'month'");

  await ensureRemoteColumn("users", "isPremium", "BOOLEAN DEFAULT 0");
  await ensureRemoteColumn("users", "subscriptionPlan", "TEXT DEFAULT 'free'");
  await ensureRemoteColumn("users", "isVerified", "BOOLEAN DEFAULT 0");
  await ensureRemoteColumn("users", "idDocument", "TEXT");
  await ensureRemoteColumn("users", "aadhaarNumber", "TEXT");
  await ensureRemoteColumn("users", "selfieImage", "TEXT");
  await ensureRemoteColumn("users", "googleId", "TEXT");

  await ensureRemoteColumn("bookings", "serviceFee", "INTEGER DEFAULT 0");
  await ensureRemoteColumn("bookings", "paymentFee", "INTEGER DEFAULT 0");
  await ensureRemoteColumn("bookings", "totalAmount", "INTEGER DEFAULT 0");
  await ensureRemoteColumn("bookings", "premiumIncluded", "BOOLEAN DEFAULT 0");
  await ensureRemoteColumn("bookings", "moveInPackage", "TEXT");

  await ensureRemoteColumn("payments", "paymentMethod", "TEXT DEFAULT 'manual'");
  await ensureRemoteColumn("payments", "paymentScreenshot", "TEXT");

  await ensureRemoteColumn("services", "highlights", "TEXT");
  await ensureRemoteColumn("services", "priceLabel", "TEXT");
  await ensureRemoteColumn("services", "providerName", "TEXT");
  await ensureRemoteColumn("services", "providerPhone", "TEXT");
  await ensureRemoteColumn("services", "providerEmail", "TEXT");
  await ensureRemoteColumn("services", "sourceUrl", "TEXT");
  await ensureRemoteColumn("services", "address", "TEXT");
  await ensureRemoteColumn("services", "whatsappUrl", "TEXT");

  await ensureRemoteColumn("messages", "isRead", "BOOLEAN DEFAULT 0");
  await ensureRemoteColumn("support_queries", "adminRepliedAt", "DATETIME");
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

  // Always ensure remote schema is up-to-date before pushing data
  // so that new columns (selfieImage, googleId, isLuxury, etc.) exist
  await ensureRemoteSchema();

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
  const localMeaningfulUsers = getMeaningfulLocalUserCount();
  const remoteMeaningfulUsers = await getMeaningfulRemoteUserCount();
  const localMeaningfulRooms = getMeaningfulLocalRoomCount();
  const remoteMeaningfulRooms = await getMeaningfulRemoteRoomCount();

  if (
    remoteMeaningfulUsers > localMeaningfulUsers ||
    remoteMeaningfulRooms > localMeaningfulRooms ||
    (localUsers === 0 && remoteUsers > 0)
  ) {
    await pullRemoteToLocal();
  } else if (
    (localMeaningfulUsers > remoteMeaningfulUsers || localMeaningfulRooms > remoteMeaningfulRooms) &&
    (localMeaningfulUsers > 0 || localMeaningfulRooms > 0)
  ) {
    await pushLocalToRemote();
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
