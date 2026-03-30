import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { openSqliteDatabase } from "./sqlite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, "../../data");
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

function hasColumn(tableName: string, columnName: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  if (hasColumn(tableName, columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function cleanupDemoData() {
  const demoUsers = db.prepare(`
    SELECT id
    FROM users
    WHERE role != 'admin'
      AND email != 'services.curated@bachelorrooms.local'
      AND (
        id LIKE 'demo-%'
        OR id LIKE 'showcase-%'
        OR email LIKE 'demo.%@example.com'
      )
  `).all() as { id: string }[];

  const demoUserIds = demoUsers.map((user) => user.id);
  const demoRooms = db.prepare(`
    SELECT id
    FROM rooms
    WHERE id LIKE 'demo-%'
       OR id LIKE 'showcase-room-%'
       OR ownerId IN (SELECT id FROM users WHERE id LIKE 'demo-%' OR id LIKE 'showcase-%')
  `).all() as { id: string }[];
  const demoRoomIds = demoRooms.map((room) => room.id);

  const bookingIdSet = new Set<string>();

  if (demoUserIds.length > 0) {
    const userBookingPlaceholders = demoUserIds.map(() => "?").join(", ");
    const userBookings = db
      .prepare(`SELECT id FROM bookings WHERE userId IN (${userBookingPlaceholders})`)
      .all(...demoUserIds) as { id: string }[];
    userBookings.forEach((booking) => bookingIdSet.add(booking.id));
  }

  if (demoRoomIds.length > 0) {
    const roomBookingPlaceholders = demoRoomIds.map(() => "?").join(", ");
    const roomBookings = db
      .prepare(`SELECT id FROM bookings WHERE roomId IN (${roomBookingPlaceholders})`)
      .all(...demoRoomIds) as { id: string }[];
    roomBookings.forEach((booking) => bookingIdSet.add(booking.id));
  }

  const demoBookingIds = [...bookingIdSet];

  if (demoBookingIds.length > 0) {
    const placeholders = demoBookingIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM rent_payments WHERE bookingId IN (${placeholders})`).run(...demoBookingIds);
  }

  if (demoUserIds.length > 0) {
    const placeholders = demoUserIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM premium_payments WHERE userId IN (${placeholders}) OR reviewedBy IN (${placeholders})`).run(...demoUserIds, ...demoUserIds);
    db.prepare(`DELETE FROM payouts WHERE ownerId IN (${placeholders})`).run(...demoUserIds);
    db.prepare(`DELETE FROM support_query_messages WHERE senderId IN (${placeholders})`).run(...demoUserIds);
    db.prepare(`DELETE FROM support_queries WHERE userId IN (${placeholders})`).run(...demoUserIds);
    db.prepare(`DELETE FROM messages WHERE senderId IN (${placeholders}) OR receiverId IN (${placeholders})`).run(...demoUserIds, ...demoUserIds);
    db.prepare(`DELETE FROM saved_rooms WHERE userId IN (${placeholders})`).run(...demoUserIds);
    db.prepare(`DELETE FROM reviews WHERE userId IN (${placeholders})`).run(...demoUserIds);
    db.prepare(`DELETE FROM services WHERE providerId IN (${placeholders}) OR id LIKE 'showcase-service-%'`).run(...demoUserIds);
  } else {
    db.prepare("DELETE FROM services WHERE id LIKE 'showcase-service-%'").run();
  }

  if (demoRoomIds.length > 0) {
    const placeholders = demoRoomIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM payments WHERE roomId IN (${placeholders})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM saved_rooms WHERE roomId IN (${placeholders})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM messages WHERE roomId IN (${placeholders})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM reviews WHERE roomId IN (${placeholders})`).run(...demoRoomIds);
    db.prepare(`DELETE FROM rooms WHERE id IN (${placeholders})`).run(...demoRoomIds);
  }

  if (demoBookingIds.length > 0) {
    const placeholders = demoBookingIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM payments WHERE bookingId IN (${placeholders})`).run(...demoBookingIds);
    db.prepare(`DELETE FROM bookings WHERE id IN (${placeholders})`).run(...demoBookingIds);
  }

  if (demoUserIds.length > 0) {
    const placeholders = demoUserIds.map(() => "?").join(", ");
    db.prepare(`DELETE FROM payments WHERE userId IN (${placeholders})`).run(...demoUserIds);
    db.prepare(`DELETE FROM rent_payments WHERE userId IN (${placeholders}) OR ownerId IN (${placeholders})`).run(...demoUserIds, ...demoUserIds);
    db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...demoUserIds);
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

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      moveInDate TEXT NOT NULL,
      duration INTEGER NOT NULL,
      people INTEGER NOT NULL,
      premiumIncluded BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'pending',
      serviceFee INTEGER DEFAULT 0,
      paymentFee INTEGER DEFAULT 0,
      totalAmount INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id)
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

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      bookingId TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      platformFee REAL NOT NULL,
      ownerAmount REAL NOT NULL,
      paymentStatus TEXT DEFAULT 'pending',
      paymentMethod TEXT DEFAULT 'manual',
      transactionId TEXT,
      paymentScreenshot TEXT,
      razorpayOrderId TEXT,
      razorpayPaymentId TEXT,
      razorpaySignature TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      FOREIGN KEY(bookingId) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      amount REAL NOT NULL,
      upiId TEXT,
      status TEXT DEFAULT 'pending',
      transactionId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ownerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS premium_payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 99,
      utrNumber TEXT NOT NULL,
      screenshot TEXT,
      status TEXT DEFAULT 'pending',
      reviewedBy TEXT,
      reviewedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(reviewedBy) REFERENCES users(id),
      UNIQUE(userId, utrNumber)
    );

    CREATE TABLE IF NOT EXISTS rent_payments (
      id TEXT PRIMARY KEY,
      bookingId TEXT NOT NULL,
      userId TEXT NOT NULL,
      roomId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      amount REAL NOT NULL,
      utrNumber TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      verifiedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bookingId) REFERENCES bookings(id),
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id),
      FOREIGN KEY(ownerId) REFERENCES users(id),
      UNIQUE(bookingId)
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
  `);
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
  ensureColumn("bookings", "serviceFee", "INTEGER DEFAULT 0");
  ensureColumn("bookings", "paymentFee", "INTEGER DEFAULT 0");
  ensureColumn("bookings", "totalAmount", "INTEGER DEFAULT 0");
  ensureColumn("bookings", "premiumIncluded", "BOOLEAN DEFAULT 0");
  ensureColumn("users", "isVerified", "BOOLEAN DEFAULT 0");
  ensureColumn("users", "idDocument", "TEXT");
  ensureColumn("users", "aadhaarNumber", "TEXT");
  ensureColumn("users", "selfieImage", "TEXT");
  ensureColumn("users", "googleId", "TEXT");
  ensureColumn("bookings", "moveInPackage", "TEXT");
  ensureColumn("payments", "paymentMethod", "TEXT DEFAULT 'manual'");
  ensureColumn("payments", "paymentScreenshot", "TEXT");
  ensureColumn("services", "highlights", "TEXT");
  ensureColumn("services", "priceLabel", "TEXT");
  ensureColumn("services", "providerName", "TEXT");
  ensureColumn("services", "providerPhone", "TEXT");
  ensureColumn("services", "providerEmail", "TEXT");
  ensureColumn("services", "sourceUrl", "TEXT");
  ensureColumn("services", "address", "TEXT");
  try {
    db.exec("UPDATE services SET address = sourceUrl WHERE (address IS NULL OR address = '') AND sourceUrl IS NOT NULL");
  } catch (e) { }
  ensureColumn("services", "whatsappUrl", "TEXT");
  try {
    db.exec("UPDATE services SET whatsappUrl = address WHERE (whatsappUrl IS NULL OR whatsappUrl = '') AND address IS NOT NULL");
  } catch (e) { }
  try {
    db.exec("UPDATE services SET address = whatsappUrl WHERE (address IS NULL OR address = '') AND whatsappUrl IS NOT NULL");
  } catch (e) { }
  ensureColumn("messages", "isRead", "BOOLEAN DEFAULT 0");
  ensureColumn("support_queries", "adminRepliedAt", "DATETIME");

  try {
    db.exec(`
      UPDATE support_queries
      SET adminRepliedAt = (
        SELECT MAX(createdAt)
        FROM support_query_messages
        WHERE support_query_messages.queryId = support_queries.id
          AND support_query_messages.senderRole = 'admin'
      )
      WHERE adminRepliedAt IS NULL
    `);
  } catch (e) { }

  // Create admin user if not exists
  const adminEmail = "prashantpadekar09@gmail.com";
  const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
  const hashedPassword = bcrypt.hashSync("sunita123", 10);

  if (!adminExists) {
    const adminId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)"
    ).run(adminId, "Admin", adminEmail, hashedPassword, "admin");
  } else {
    db.prepare(
      "UPDATE users SET password = ?, role = 'admin' WHERE email = ?"
    ).run(hashedPassword, adminEmail);
  }

  // Upgrade the seeded public service account in older databases so it can use
  // the provider dashboard without requiring a full reseed.
  try {
    db.prepare(
      "UPDATE users SET role = 'service_provider' WHERE email = ? AND role = 'user'"
    ).run("services.curated@bachelorrooms.local");
  } catch (e) { }

  // If support queries are empty, migrate legacy admin chat messages into support queries
  try {
    const queryCount = db.prepare("SELECT COUNT(*) as count FROM support_queries").get() as any;
    if ((queryCount?.count || 0) === 0) {
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY createdAt ASC LIMIT 1").get() as any;
      if (adminUser?.id) {
        const conversationIds = db.prepare(`
          SELECT DISTINCT
            CASE WHEN senderId = ? THEN receiverId ELSE senderId END as otherUserId
          FROM messages
          WHERE senderId = ? OR receiverId = ?
        `).all(adminUser.id, adminUser.id, adminUser.id) as { otherUserId: string }[];

        for (const row of conversationIds) {
          if (!row.otherUserId || row.otherUserId === adminUser.id) continue;
          const otherUser = db.prepare("SELECT id, role FROM users WHERE id = ?").get(row.otherUserId) as any;
          if (!otherUser || otherUser.role === "admin") continue;

          const timestamps = db.prepare(`
            SELECT MIN(createdAt) as firstMessageAt, MAX(createdAt) as lastMessageAt
            FROM messages
            WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
          `).get(row.otherUserId, adminUser.id, adminUser.id, row.otherUserId) as any;

          const queryId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO support_queries (id, userId, status, createdAt, updatedAt)
            VALUES (?, ?, 'not_resolved', ?, ?)
          `).run(queryId, row.otherUserId, timestamps?.firstMessageAt || new Date().toISOString(), timestamps?.lastMessageAt || new Date().toISOString());

          const messages = db.prepare(`
            SELECT senderId, content, createdAt
            FROM messages
            WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
            ORDER BY createdAt ASC
          `).all(row.otherUserId, adminUser.id, adminUser.id, row.otherUserId) as any[];

          for (const msg of messages) {
            const senderRole = msg.senderId === adminUser.id ? "admin" : otherUser.role || "user";
            db.prepare(`
              INSERT INTO support_query_messages (id, queryId, senderId, senderRole, text, createdAt)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(crypto.randomUUID(), queryId, msg.senderId, senderRole, msg.content, msg.createdAt);
          }
        }
      }
    }
  } catch (error) {
    console.warn("Support query migration skipped:", error);
  }

  // Create indexes for performance
  db.exec("CREATE INDEX IF NOT EXISTS idx_rooms_city ON rooms(city);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_rooms_location ON rooms(location);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_rooms_price ON rooms(price);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(userId);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(roomId);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);");

  cleanupDemoData();
}
