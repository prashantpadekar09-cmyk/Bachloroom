import express from "express";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get dashboard stats
router.get("/stats", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const roomCount = db.prepare("SELECT COUNT(*) as count FROM rooms").get() as any;
    const bookingCount = db.prepare("SELECT COUNT(*) as count FROM bookings").get() as any;
    const revenueSum = db.prepare("SELECT SUM(totalAmount) as total FROM bookings WHERE status = 'confirmed'").get() as any;
    const commissionSum = db.prepare("SELECT SUM(platformFee) as total FROM payments WHERE paymentStatus = 'completed'").get() as any;
    
    res.json({
      totalUsers: userCount.count,
      totalRooms: roomCount.count,
      totalBookings: bookingCount.count,
      totalRevenue: revenueSum.total || 0,
      totalCommission: commissionSum.total || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all messages (Admin)
router.get("/messages", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare(`
      SELECT
        m.id,
        m.senderId,
        m.receiverId,
        m.roomId,
        m.content,
        m.createdAt,
        COALESCE(m.isRead, 0) as isRead,
        sender.name as userName,
        sender.email as userEmail,
        sender.role as userRole
      FROM messages m
      JOIN users sender ON m.senderId = sender.id
      JOIN users receiver ON m.receiverId = receiver.id
      WHERE receiver.role = 'admin' AND sender.role != 'admin'
      ORDER BY m.createdAt DESC
    `);
    const messages = stmt.all();
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bookings (Admin)
router.get("/bookings", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare(`
      SELECT b.*, u.name as userName, u.email as userEmail, r.title as roomTitle, r.price as roomPrice
      FROM bookings b
      JOIN users u ON b.userId = u.id
      JOIN rooms r ON b.roomId = r.id
      ORDER BY b.createdAt DESC
    `);
    const bookings = stmt.all();
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all rooms (Admin)
router.get("/rooms", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare(`
      SELECT r.*, u.name as ownerName, u.email as ownerEmail 
      FROM rooms r 
      JOIN users u ON r.ownerId = u.id 
      ORDER BY r.createdAt DESC
    `);
    const rooms = stmt.all();
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users
router.get("/users", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare("SELECT id, name, email, phone, role, isVerified, idDocument, createdAt FROM users WHERE role != 'admin'");
    const users = stmt.all();
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users pending verification
router.get("/users/pending-verification", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare("SELECT id, name, email, role, idDocument FROM users WHERE (isVerified = 0 OR isVerified IS NULL) AND idDocument IS NOT NULL");
    const users = stmt.all();
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify or reject a user
router.post("/users/:id/verify", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { isVerified } = req.body;

  try {
    if (isVerified) {
      const stmt = db.prepare("UPDATE users SET isVerified = 1 WHERE id = ?");
      stmt.run(req.params.id);
    } else {
      // If rejected, we might want to clear the document so they can re-upload
      const stmt = db.prepare("UPDATE users SET isVerified = 0, idDocument = NULL WHERE id = ?");
      stmt.run(req.params.id);
    }
    res.json({ message: "User verification updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a user
router.delete("/users/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id) as any;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ error: "Admin users cannot be deleted" });
    }

    const deleteUserWithRelations = db.transaction((userId: string) => {
      const ownedRooms = db.prepare("SELECT id FROM rooms WHERE ownerId = ?").all(userId) as { id: string }[];
      const roomIds = ownedRooms.map((room) => room.id);
      const userBookings = db.prepare("SELECT id FROM bookings WHERE userId = ?").all(userId) as { id: string }[];
      const bookingIds = userBookings.map((booking) => booking.id);

      db.prepare(
        "DELETE FROM payments WHERE userId = ? OR bookingId IN (SELECT id FROM bookings WHERE userId = ?)"
      ).run(userId, userId);
      db.prepare("DELETE FROM premium_payments WHERE userId = ? OR reviewedBy = ?").run(userId, userId);
      db.prepare(
        "DELETE FROM rent_payments WHERE userId = ? OR ownerId = ? OR bookingId IN (SELECT id FROM bookings WHERE userId = ?)"
      ).run(userId, userId, userId);
      db.prepare("DELETE FROM saved_rooms WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM reviews WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM bookings WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM messages WHERE senderId = ? OR receiverId = ?").run(userId, userId);
      db.prepare("DELETE FROM services WHERE providerId = ?").run(userId);
      db.prepare("DELETE FROM payouts WHERE ownerId = ?").run(userId);
      db.prepare(
        "DELETE FROM support_query_messages WHERE senderId = ? OR queryId IN (SELECT id FROM support_queries WHERE userId = ?)"
      ).run(userId, userId);
      db.prepare("DELETE FROM support_queries WHERE userId = ?").run(userId);

      if (roomIds.length > 0) {
        const placeholders = roomIds.map(() => "?").join(", ");
        const roomBookings = db.prepare(`SELECT id FROM bookings WHERE roomId IN (${placeholders})`).all(...roomIds) as { id: string }[];
        const affectedBookingIds = [...bookingIds, ...roomBookings.map((booking) => booking.id)];

        if (affectedBookingIds.length > 0) {
          const bookingPlaceholders = affectedBookingIds.map(() => "?").join(", ");
          db.prepare(`DELETE FROM rent_payments WHERE bookingId IN (${bookingPlaceholders})`).run(...affectedBookingIds);
        }

        db.prepare(
          `DELETE FROM payments WHERE roomId IN (${placeholders}) OR bookingId IN (SELECT id FROM bookings WHERE roomId IN (${placeholders}))`
        ).run(...roomIds, ...roomIds);
        db.prepare(`DELETE FROM saved_rooms WHERE roomId IN (${placeholders})`).run(...roomIds);
        db.prepare(`DELETE FROM messages WHERE roomId IN (${placeholders})`).run(...roomIds);
        db.prepare(`DELETE FROM reviews WHERE roomId IN (${placeholders})`).run(...roomIds);
        db.prepare(`DELETE FROM rent_payments WHERE roomId IN (${placeholders}) OR ownerId = ?`).run(...roomIds, userId);
        db.prepare(`DELETE FROM bookings WHERE roomId IN (${placeholders})`).run(...roomIds);
        db.prepare(`DELETE FROM rooms WHERE id IN (${placeholders})`).run(...roomIds);
      }

      db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(userId);
    });

    deleteUserWithRelations(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user role
router.patch("/users/:id/role", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { role } = req.body;
  if (!["user", "owner", "service_provider"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const stmt = db.prepare("UPDATE users SET role = ? WHERE id = ? AND role != 'admin'");
    const result = stmt.run(role, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User role updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a message
router.delete("/messages/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark message as read
router.patch("/messages/:id/read", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const stmt = db.prepare("UPDATE messages SET isRead = 1 WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ message: "Message marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
