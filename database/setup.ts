import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { openSqliteDatabase } from "./sqlite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory is at database/data or custom DATA_DIR for Render Disk
const dbDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, "./data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "database.sqlite");
const rollbackJournalPath = `${dbPath}-journal`;

// OneDrive on Windows can hold onto SQLite rollback journals long enough to
// trigger SQLITE_IOERR_DELETE during startup writes. Remove any stale journal
// and prefer WAL mode so SQLite no longer needs to delete the journal file on
// each transaction.
if (fs.existsSync(rollbackJournalPath)) {
  try {
    fs.unlinkSync(rollbackJournalPath);
  } catch (error) {
    console.warn("Could not remove stale SQLite journal file:", error);
  }
}

export const db = openSqliteDatabase(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -8000"); // 8MB page cache for faster reads
db.pragma("temp_store = MEMORY");

function hasColumn(tableName: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  if (hasColumn(tableName, columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function cleanupDemoData() {
  const demoUsers = db.prepare(`
    SELECT id FROM users
    WHERE role != 'admin'
      AND email != 'services.curated@bachelorrooms.local'
      AND (
        id LIKE 'demo-%'
        OR id LIKE 'showcase-%'
        OR email LIKE 'demo.%@example.com'
      )
  `).all() as { id: string }[];

  const demoUserIds = demoUsers.map((u) => u.id);
  const demoRooms = db.prepare(`
    SELECT id FROM rooms
    WHERE id LIKE 'demo-%'
       OR id LIKE 'showcase-room-%'
       OR ownerId IN (SELECT id FROM users WHERE id LIKE 'demo-%' OR id LIKE 'showcase-%')
  `).all() as { id: string }[];
  const demoRoomIds = demoRooms.map((r) => r.id);

  if (demoUserIds.length > 0) {
    const ph = demoUserIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM support_query_messages WHERE senderId IN (${ph})`).run(...demoUserIds);
    db.prepare(`DELETE FROM support_queries WHERE userId IN (${ph})`).run(...demoUserIds);
    db.prepare(`DELETE FROM referral_transactions WHERE referrerId IN (${ph}) OR refereeId IN (${ph})`).run(...demoUserIds, ...demoUserIds);
    db.prepare(`DELETE FROM referral_withdrawals WHERE userId IN (${ph}) OR reviewedBy IN (${ph})`).run(...demoUserIds, ...demoUserIds);
    db.prepare(`DELETE FROM messages WHERE senderId IN (${ph}) OR receiverId IN (${ph})`).run(...demoUserIds, ...demoUserIds);
    db.prepare(`DELETE FROM saved_rooms WHERE userId IN (${ph})`).run(...demoUserIds);
    db.prepare(`DELETE FROM reviews WHERE userId IN (${ph})`).run(...demoUserIds);
    db.prepare(`DELETE FROM services WHERE providerId IN (${ph}) OR id LIKE 'showcase-service-%'`).run(...demoUserIds);
  } else {
    db.prepare("DELETE FROM services WHERE id LIKE 'showcase-service-%'").run();
  }

  if (demoRoomIds.length > 0) {
    const ph = demoRoomIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM saved_rooms WHERE roomId IN (${ph})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM messages WHERE roomId IN (${ph})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM reviews WHERE roomId IN (${ph})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM rooms WHERE id IN (${ph})`).run(...demoRoomIds);
  }

  if (demoUserIds.length > 0) {
    const ph = demoUserIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...demoUserIds);
  }
}

export function setupDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      aadhaarNumber TEXT,
      selfieImage TEXT,
      role TEXT DEFAULT 'user',
      isPremium BOOLEAN DEFAULT 0,
      subscriptionPlan TEXT DEFAULT 'free',
      referralCode TEXT,
      referredById TEXT,
      referralBalance INTEGER DEFAULT 0,
      referralEarnings INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      priceLabel TEXT,
      billingPeriod TEXT DEFAULT 'month',
      deposit INTEGER NOT NULL,
      depositLabel TEXT,
      location TEXT NOT NULL,
      city TEXT NOT NULL,
      type TEXT DEFAULT 'Single Room',
      images TEXT NOT NULL,
      amenities TEXT NOT NULL,
      sourceLabel TEXT,
      sourceUrl TEXT,
      ownerId TEXT NOT NULL,
      lat REAL,
      lng REAL,
      isFeatured BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      senderId TEXT NOT NULL,
      receiverId TEXT NOT NULL,
      roomId TEXT,
      content TEXT NOT NULL,
      isRead BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senderId) REFERENCES users(id),
      FOREIGN KEY (receiverId) REFERENCES users(id),
      FOREIGN KEY (roomId) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      priceLabel TEXT,
      providerId TEXT NOT NULL,
      providerName TEXT,
      providerPhone TEXT,
      providerEmail TEXT,
      city TEXT NOT NULL,
      image TEXT,
      highlights TEXT,
      address TEXT,
      sourceUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(providerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS saved_rooms (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      UNIQUE(userId, roomId)
    );



    CREATE TABLE IF NOT EXISTS manual_credit_payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      packageId TEXT NOT NULL,
      amount REAL NOT NULL,
      utrNumber TEXT NOT NULL,
      screenshot TEXT,
      status TEXT DEFAULT 'pending',
      reviewedBy TEXT,
      reviewedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(reviewedBy) REFERENCES users(id),
      UNIQUE(utrNumber)
    );

    CREATE TABLE IF NOT EXISTS support_queries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      status TEXT DEFAULT 'not_resolved',
      adminRepliedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS support_query_messages (
      id TEXT PRIMARY KEY,
      queryId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(queryId) REFERENCES support_queries(id),
      FOREIGN KEY(senderId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS referral_transactions (
      id TEXT PRIMARY KEY,
      referrerId TEXT NOT NULL,
      refereeId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      roomId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(referrerId) REFERENCES users(id),
      FOREIGN KEY(refereeId) REFERENCES users(id),
      UNIQUE(refereeId, type)
    );

    CREATE TABLE IF NOT EXISTS referral_withdrawals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      upiId TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      adminNote TEXT,
      reviewedBy TEXT,
      reviewedAt DATETIME,
      paidAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(reviewedBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS room_unlocks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      status TEXT DEFAULT 'unlocked',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      FOREIGN KEY(ownerId) REFERENCES users(id),
      UNIQUE(userId, roomId)
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  // Schema migrations (safe, idempotent)
  ensureColumn("rooms", "lat", "REAL");
  ensureColumn("rooms", "lng", "REAL");
  ensureColumn("rooms", "isFeatured", "BOOLEAN DEFAULT 0");
  ensureColumn("rooms", "isLuxury", "BOOLEAN DEFAULT 0");
  ensureColumn("rooms", "depositLabel", "TEXT");
  ensureColumn("rooms", "sourceLabel", "TEXT");
  ensureColumn("rooms", "sourceUrl", "TEXT");
  ensureColumn("rooms", "priceLabel", "TEXT");
  ensureColumn("rooms", "billingPeriod", "TEXT DEFAULT 'month'");
  ensureColumn("users", "isPremium", "BOOLEAN DEFAULT 0");
  ensureColumn("users", "subscriptionPlan", "TEXT DEFAULT 'free'");
  ensureColumn("users", "credits", "INTEGER DEFAULT 0");
  ensureColumn("users", "isVerified", "BOOLEAN DEFAULT 0");
  ensureColumn("users", "idDocument", "TEXT");
  ensureColumn("users", "aadhaarNumber", "TEXT");
  ensureColumn("users", "selfieImage", "TEXT");
  ensureColumn("users", "googleId", "TEXT");
  ensureColumn("users", "referralCode", "TEXT");
  ensureColumn("users", "referredById", "TEXT");
  ensureColumn("users", "referralBalance", "INTEGER DEFAULT 0");
  ensureColumn("users", "referralEarnings", "INTEGER DEFAULT 0");
  ensureColumn("services", "highlights", "TEXT");
  ensureColumn("services", "priceLabel", "TEXT");
  ensureColumn("services", "providerName", "TEXT");
  ensureColumn("services", "providerPhone", "TEXT");
  ensureColumn("services", "providerEmail", "TEXT");
  ensureColumn("services", "sourceUrl", "TEXT");
  ensureColumn("services", "address", "TEXT");
  ensureColumn("services", "whatsappUrl", "TEXT");
  ensureColumn("messages", "isRead", "BOOLEAN DEFAULT 0");
  ensureColumn("support_queries", "adminRepliedAt", "DATETIME");

  try {
    db.exec("UPDATE services SET whatsappUrl = address WHERE (whatsappUrl IS NULL OR whatsappUrl = '') AND address IS NOT NULL");
    db.exec("UPDATE services SET address = whatsappUrl WHERE (address IS NULL OR address = '') AND whatsappUrl IS NOT NULL");
  } catch (_) {}

  // Indexes for performance
  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referralCode);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referredById);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer ON referral_transactions(referrerId);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_referral_transactions_referee ON referral_transactions(refereeId);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_user ON referral_withdrawals(userId);"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_referral_withdrawals_status ON referral_withdrawals(status);"); } catch (_) {}
  db.exec("CREATE INDEX IF NOT EXISTS idx_rooms_city ON rooms(city);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_rooms_price ON rooms(price);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);");

  // Backfill admin user
  const adminEmail = "prashantpadekar09@gmail.com";
  const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  const hashedPassword = bcrypt.hashSync("sunita123", 10);

  if (!adminExists) {
    const adminId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)").run(
      adminId, "Admin", adminEmail, hashedPassword, "admin"
    );
  } else {
    db.prepare("UPDATE users SET password = ?, role = 'admin' WHERE email = ?").run(hashedPassword, adminEmail);
  }

  try {
    db.prepare("UPDATE users SET role = 'service_provider' WHERE email = ? AND role = 'user'").run(
      "services.curated@bachelorrooms.local"
    );
  } catch (_) {}

  // Migrate legacy support queries from messages table
  try {
    db.exec(`
      UPDATE support_queries
      SET adminRepliedAt = (
        SELECT MAX(createdAt) FROM support_query_messages
        WHERE support_query_messages.queryId = support_queries.id
          AND support_query_messages.senderRole = 'admin'
      )
      WHERE adminRepliedAt IS NULL
    `);
  } catch (_) {}

  // Backfill missing referral codes
  try {
    const missing = db.prepare("SELECT id FROM users WHERE referralCode IS NULL OR referralCode = ''").all() as { id: string }[];
    const existingCodes = new Set(
      (db.prepare("SELECT referralCode FROM users WHERE referralCode IS NOT NULL AND referralCode != ''").all() as { referralCode: string }[]).map(
        (r) => r.referralCode
      )
    );
    const createCode = () => `BR${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    for (const row of missing) {
      let code = "";
      for (let attempt = 0; attempt < 12; attempt++) {
        const candidate = createCode();
        if (!existingCodes.has(candidate)) { code = candidate; break; }
      }
      if (!code) continue;
      db.prepare("UPDATE users SET referralCode = ? WHERE id = ?").run(code, row.id);
      existingCodes.add(code);
    }
  } catch (_) {}

  cleanupDemoData();
}
