import express from "express";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import { listReferralWithdrawalsForAdmin, updateReferralWithdrawalStatus } from "../db/referrals/index.js";
import { scheduleSupabaseSync } from "../db/supabaseMirror.js";

const router = express.Router();

// Get dashboard stats
router.get("/stats", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const roomCount = db.prepare("SELECT COUNT(*) as count FROM rooms").get() as any;
    const premiumCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE isPremium = 1").get() as any;
    const pendingVerificationCount = db.prepare(
      `SELECT COUNT(*) as count
       FROM users
       WHERE (isVerified = 0 OR isVerified IS NULL)
         AND (
           (role = 'user' AND selfieImage IS NOT NULL)
           OR (role != 'user' AND idDocument IS NOT NULL)
         )`
    ).get() as any;

    res.json({
      totalUsers: userCount.count,
      totalRooms: roomCount.count,
      totalPremiumUsers: premiumCount.count,
      pendingVerifications: pendingVerificationCount.count,
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
    const stmt = db.prepare("SELECT id, name, email, phone, role, isVerified, idDocument, selfieImage, createdAt FROM users WHERE role != 'admin'");
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
    const stmt = db.prepare(`
      SELECT id, name, email, role, idDocument, selfieImage
      FROM users
      WHERE (isVerified = 0 OR isVerified IS NULL)
        AND (
          (role = 'user' AND selfieImage IS NOT NULL)
          OR (role != 'user' AND idDocument IS NOT NULL)
        )
    `);
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
      const stmt = db.prepare("UPDATE users SET isVerified = 0 WHERE id = ?");
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
      db.prepare("DELETE FROM premium_payments WHERE userId = ? OR reviewedBy = ?").run(userId, userId);
      db.prepare("DELETE FROM referral_transactions WHERE referrerId = ? OR refereeId = ?").run(userId, userId);
      db.prepare("DELETE FROM referral_withdrawals WHERE userId = ? OR reviewedBy = ?").run(userId, userId);
      db.prepare("DELETE FROM saved_rooms WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM reviews WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM messages WHERE senderId = ? OR receiverId = ?").run(userId, userId);
      db.prepare("DELETE FROM services WHERE providerId = ?").run(userId);
      db.prepare(
        "DELETE FROM support_query_messages WHERE senderId = ? OR queryId IN (SELECT id FROM support_queries WHERE userId = ?)"
      ).run(userId, userId);
      db.prepare("DELETE FROM support_queries WHERE userId = ?").run(userId);

      if (roomIds.length > 0) {
        const placeholders = roomIds.map(() => "?").join(", ");
        db.prepare(`DELETE FROM saved_rooms WHERE roomId IN (${placeholders})`).run(...roomIds);
        db.prepare(`DELETE FROM messages WHERE roomId IN (${placeholders})`).run(...roomIds);
        db.prepare(`DELETE FROM reviews WHERE roomId IN (${placeholders})`).run(...roomIds);
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

// Mark a message as read
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

// Toggle luxury status for a room
router.patch("/rooms/:id/luxury", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { isLuxury } = req.body;
  try {
    const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });

    db.prepare("UPDATE rooms SET isLuxury = ? WHERE id = ?").run(isLuxury ? 1 : 0, req.params.id);
    res.json({ message: `Room luxury status updated to ${isLuxury}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Referral withdrawals (Admin)
router.get("/referral-withdrawals", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const status = typeof req.query?.status === "string" ? req.query.status : undefined;
    const withdrawals = listReferralWithdrawalsForAdmin({ status });
    res.json({ withdrawals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load withdrawals" });
  }
});

router.put("/referral-withdrawals/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const status = req.body?.status as string;
  const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote : null;

  if (!["approved", "rejected", "paid"].includes(status)) {
    return res.status(400).json({ error: "Invalid withdrawal status" });
  }

  try {
    updateReferralWithdrawalStatus({
      id: req.params.id,
      status: status as "approved" | "rejected" | "paid",
      adminId: req.user.id,
      adminNote,
    });
    scheduleSupabaseSync("referral withdrawal update");
    res.json({ message: `Withdrawal ${status}` });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to update withdrawal" });
  }
});

export default router;
