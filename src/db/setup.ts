import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

export function setupDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      aadhaarNumber TEXT,
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
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN lat REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN lng REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN isFeatured BOOLEAN DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN depositLabel TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN sourceLabel TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN sourceUrl TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN priceLabel TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE rooms ADD COLUMN billingPeriod TEXT DEFAULT 'month'");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN isPremium BOOLEAN DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN subscriptionPlan TEXT DEFAULT 'free'");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN serviceFee INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN paymentFee INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN totalAmount INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN premiumIncluded BOOLEAN DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN isVerified BOOLEAN DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN idDocument TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN aadhaarNumber TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN googleId TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE bookings ADD COLUMN moveInPackage TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE payments ADD COLUMN paymentMethod TEXT DEFAULT 'manual'");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE payments ADD COLUMN paymentScreenshot TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN highlights TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN priceLabel TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN providerName TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN providerPhone TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN providerEmail TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN sourceUrl TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN address TEXT");
  } catch (e) {}
  try {
    db.exec("UPDATE services SET address = sourceUrl WHERE (address IS NULL OR address = '') AND sourceUrl IS NOT NULL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE services ADD COLUMN whatsappUrl TEXT");
  } catch (e) {}
  try {
    db.exec("UPDATE services SET whatsappUrl = address WHERE (whatsappUrl IS NULL OR whatsappUrl = '') AND address IS NOT NULL");
  } catch (e) {}
  try {
    db.exec("UPDATE services SET address = whatsappUrl WHERE (address IS NULL OR address = '') AND whatsappUrl IS NOT NULL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE messages ADD COLUMN isRead BOOLEAN DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE support_queries ADD COLUMN adminRepliedAt DATETIME");
  } catch (e) {}

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
  } catch (e) {}

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
  } catch (e) {}

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

  // Cleanup demo data
  db.prepare("DELETE FROM bookings WHERE roomId LIKE 'demo-%'").run();
  db.prepare("DELETE FROM reviews WHERE roomId LIKE 'demo-%'").run();
  db.prepare("DELETE FROM messages WHERE roomId LIKE 'demo-%'").run();
  db.prepare("DELETE FROM rooms WHERE id LIKE 'demo-%'").run();
}
