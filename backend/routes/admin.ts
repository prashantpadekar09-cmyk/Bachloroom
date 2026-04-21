import express from "express";
import { db } from "../../database/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import { listReferralWithdrawalsForAdmin, updateReferralWithdrawalStatus } from "../../database/referrals/index.js";
import { scheduleSupabaseSync } from "../../database/supabaseMirror.js";

const router = express.Router();

const adminOnly = (req: any, res: any, next: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  next();
};

router.get("/stats", authenticateToken, adminOnly, (req: any, res: any) => {
  try {
    const [userCount, roomCount, pendingVerificationCount, pendingCreditsCount] = [
      db.prepare("SELECT COUNT(*) as count FROM users").get() as any,
      db.prepare("SELECT COUNT(*) as count FROM rooms").get() as any,
      db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE (isVerified=0 OR isVerified IS NULL)
          AND ((role='user' AND selfieImage IS NOT NULL) OR (role!='user' AND idDocument IS NOT NULL))
      `).get() as any,
      db.prepare("SELECT COUNT(*) as count FROM manual_credit_payments WHERE status='pending'").get() as any,
    ];
    res.json({
      totalUsers: userCount.count, totalRooms: roomCount.count,
      pendingVerifications: pendingVerificationCount.count,
      pendingCreditPayments: pendingCreditsCount.count,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/messages", authenticateToken, adminOnly, (_req, res: any) => {
  try {
    const messages = db.prepare(`
      SELECT m.id, m.senderId, m.receiverId, m.roomId, m.content, m.createdAt,
             COALESCE(m.isRead,0) as isRead,
             sender.name as userName, sender.email as userEmail, sender.role as userRole
      FROM messages m
      JOIN users sender ON m.senderId = sender.id
      JOIN users receiver ON m.receiverId = receiver.id
      WHERE receiver.role='admin' AND sender.role!='admin'
      ORDER BY m.createdAt DESC
    `).all();
    res.json({ messages });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/rooms", authenticateToken, adminOnly, (_req, res: any) => {
  try {
    const rooms = db.prepare(`
      SELECT r.*, u.name as ownerName, u.email as ownerEmail
      FROM rooms r JOIN users u ON r.ownerId=u.id ORDER BY r.createdAt DESC
    `).all();
    res.json({ rooms });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/users", authenticateToken, adminOnly, (_req, res: any) => {
  try {
    const users = db.prepare(
      "SELECT id,name,email,phone,role,isVerified,idDocument,selfieImage,createdAt FROM users WHERE role!='admin'"
    ).all();
    res.json({ users });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/users/pending-verification", authenticateToken, adminOnly, (_req, res: any) => {
  try {
    const users = db.prepare(`
      SELECT id,name,email,role,idDocument,selfieImage FROM users
      WHERE (isVerified=0 OR isVerified IS NULL)
        AND ((role='user' AND selfieImage IS NOT NULL) OR (role!='user' AND idDocument IS NOT NULL))
    `).all();
    res.json({ users });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/users/:id/verify", authenticateToken, adminOnly, (req: any, res: any) => {
  const { isVerified } = req.body;
  try {
    db.prepare("UPDATE users SET isVerified=? WHERE id=?").run(isVerified ? 1 : 0, req.params.id);
    res.json({ message: "User verification updated successfully" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/users/:id", authenticateToken, adminOnly, (req: any, res: any) => {
  try {
    const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(403).json({ error: "Admin users cannot be deleted" });

    db.transaction((userId: string) => {
      const roomIds = (db.prepare("SELECT id FROM rooms WHERE ownerId=?").all(userId) as { id: string }[]).map((r) => r.id);
      db.prepare("DELETE FROM referral_transactions WHERE referrerId=? OR refereeId=?").run(userId, userId);
      db.prepare("DELETE FROM referral_withdrawals WHERE userId=? OR reviewedBy=?").run(userId, userId);
      db.prepare("DELETE FROM saved_rooms WHERE userId=?").run(userId);
      db.prepare("DELETE FROM reviews WHERE userId=?").run(userId);
      db.prepare("DELETE FROM messages WHERE senderId=? OR receiverId=?").run(userId, userId);
      db.prepare("DELETE FROM services WHERE providerId=?").run(userId);
      db.prepare("DELETE FROM support_query_messages WHERE senderId=? OR queryId IN (SELECT id FROM support_queries WHERE userId=?)").run(userId, userId);
      db.prepare("DELETE FROM support_queries WHERE userId=?").run(userId);
      
      // New credit system tables
      db.prepare("DELETE FROM credit_transactions WHERE userId=?").run(userId);
      db.prepare("DELETE FROM room_unlocks WHERE userId=? OR ownerId=?").run(userId, userId);
      db.prepare("DELETE FROM manual_credit_payments WHERE userId=? OR reviewedBy=?").run(userId, userId);
      
      // Legacy table cleanup
      try { db.prepare("DELETE FROM premium_payments WHERE userId=? OR reviewedBy=?").run(userId, userId); } catch (_) {}

      if (roomIds.length > 0) {
        const ph = roomIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM saved_rooms WHERE roomId IN (${ph})`).run(...roomIds);
        db.prepare(`DELETE FROM messages WHERE roomId IN (${ph})`).run(...roomIds);
        db.prepare(`DELETE FROM reviews WHERE roomId IN (${ph})`).run(...roomIds);
        db.prepare(`DELETE FROM room_unlocks WHERE roomId IN (${ph})`).run(...roomIds);
        db.prepare(`DELETE FROM rooms WHERE id IN (${ph})`).run(...roomIds);
      }
      db.prepare("DELETE FROM users WHERE id=? AND role!='admin'").run(userId);
    })(req.params.id);

    scheduleSupabaseSync("user delete");
    res.json({ message: "User deleted successfully" });
  } catch (e: any) { 
    console.error("[DELETE USER ERROR]", e); 
    res.status(500).json({ error: e?.message || "Internal server error" }); 
  }
});

router.patch("/users/:id/role", authenticateToken, adminOnly, (req: any, res: any) => {
  const { role } = req.body;
  if (!["user", "owner", "service_provider"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  try {
    const result = db.prepare("UPDATE users SET role=? WHERE id=? AND role!='admin'").run(role, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User role updated successfully" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/messages/:id", authenticateToken, adminOnly, (req: any, res: any) => {
  try {
    db.prepare("DELETE FROM messages WHERE id=?").run(req.params.id);
    res.json({ message: "Message deleted successfully" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/messages/:id/read", authenticateToken, adminOnly, (req: any, res: any) => {
  try {
    db.prepare("UPDATE messages SET isRead=1 WHERE id=?").run(req.params.id);
    res.json({ message: "Message marked as read" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/rooms/:id/luxury", authenticateToken, adminOnly, (req: any, res: any) => {
  const { isLuxury } = req.body;
  try {
    const room = db.prepare("SELECT id FROM rooms WHERE id=?").get(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    db.prepare("UPDATE rooms SET isLuxury=? WHERE id=?").run(isLuxury ? 1 : 0, req.params.id);
    res.json({ message: `Room luxury status updated to ${isLuxury}` });
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/referral-withdrawals", authenticateToken, adminOnly, (req: any, res: any) => {
  try {
    const status = typeof req.query?.status === "string" ? req.query.status : undefined;
    res.json({ withdrawals: listReferralWithdrawalsForAdmin({ status }) });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to load withdrawals" }); }
});

router.put("/referral-withdrawals/:id", authenticateToken, adminOnly, (req: any, res: any) => {
  const status = req.body?.status as string;
  const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote : null;
  if (!["approved", "rejected", "paid"].includes(status)) return res.status(400).json({ error: "Invalid withdrawal status" });
  try {
    updateReferralWithdrawalStatus({ id: req.params.id, status: status as "approved" | "rejected" | "paid", adminId: req.user.id, adminNote });
    scheduleSupabaseSync("referral withdrawal update");
    res.json({ message: `Withdrawal ${status}` });
  } catch (e: any) { res.status(400).json({ error: e?.message || "Failed to update withdrawal" }); }
});

export default router;
