import express from "express";
import { db } from "../../database/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

const getAdminUser = () =>
  db.prepare("SELECT id, name, role FROM users WHERE role = 'admin' ORDER BY createdAt ASC LIMIT 1")
    .get() as { id: string; name: string; role: string } | undefined;

const hasConversation = (userId: string, otherUserId: string) =>
  Boolean(
    db.prepare(
      "SELECT id FROM messages WHERE (senderId=? AND receiverId=?) OR (senderId=? AND receiverId=?) LIMIT 1"
    ).get(userId, otherUserId, otherUserId, userId)
  );

const canAccessChat = ({ currentUser, otherUserId }: { currentUser: any; otherUserId: string }) => {
  if (currentUser.role === "admin" || currentUser.id === otherUserId) return true;
  const otherUser = db.prepare("SELECT role FROM users WHERE id = ?").get(otherUserId) as { role: string } | undefined;
  if (otherUser?.role === "admin") return true;
  return hasConversation(currentUser.id, otherUserId);
};

router.get("/admin-contact", authenticateToken, (req, res) => {
  try {
    const adminUser = getAdminUser();
    if (!adminUser) return res.status(404).json({ error: "Admin account not found" });
    res.json({ user: adminUser });
  } catch (_) { res.status(500).json({ error: "Failed to fetch admin contact" }); }
});

router.get("/unread-count", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = db.prepare(
      "SELECT COUNT(*) as count FROM messages WHERE receiverId=? AND COALESCE(isRead,0)=0"
    ).get(userId) as { count: number };
    res.json({ unreadCount: result?.count || 0 });
  } catch (_) { res.status(500).json({ error: "Failed to fetch unread count" }); }
});

// Get conversations list — optimised: single query instead of N+1 loop
router.get("/conversations", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const conversations = db.prepare(`
      SELECT
        ou.id as userId, ou.name, ou.role,
        lm.content as lastContent, lm.createdAt as lastCreatedAt,
        COUNT(CASE WHEN m2.receiverId=? AND COALESCE(m2.isRead,0)=0 THEN 1 END) as unreadCount
      FROM (
        SELECT DISTINCT CASE WHEN senderId=? THEN receiverId ELSE senderId END as otherUserId
        FROM messages WHERE senderId=? OR receiverId=?
      ) as others
      JOIN users ou ON ou.id = others.otherUserId
      LEFT JOIN messages lm ON lm.id = (
        SELECT id FROM messages
        WHERE (senderId=? AND receiverId=ou.id) OR (senderId=ou.id AND receiverId=?)
        ORDER BY createdAt DESC LIMIT 1
      )
      LEFT JOIN messages m2 ON (m2.senderId=ou.id AND m2.receiverId=?)
      GROUP BY ou.id
    `).all(userId, userId, userId, userId, userId, userId, userId) as any[];

    res.json(conversations.map((c) => ({
      user: { id: c.userId, name: c.name, role: c.role },
      lastMessage: c.lastContent ? { content: c.lastContent, createdAt: c.lastCreatedAt } : null,
      unreadCount: Number(c.unreadCount || 0),
    })));
  } catch (_) { res.status(500).json({ error: "Failed to fetch conversations" }); }
});

router.get("/:otherUserId", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { otherUserId } = req.params;
    if (!canAccessChat({ currentUser: (req as any).user, otherUserId })) {
      return res.status(403).json({ error: "You do not have access to this chat" });
    }
    const messages = db.prepare(
      "SELECT * FROM messages WHERE (senderId=? AND receiverId=?) OR (senderId=? AND receiverId=?) ORDER BY createdAt ASC"
    ).all(userId, otherUserId, otherUserId, userId);

    db.prepare(
      "UPDATE messages SET isRead=1 WHERE senderId=? AND receiverId=? AND COALESCE(isRead,0)=0"
    ).run(otherUserId, userId);

    res.json(messages);
  } catch (_) { res.status(500).json({ error: "Failed to fetch messages" }); }
});

router.post("/", authenticateToken, (req, res) => {
  try {
    const senderId = (req as any).user.id;
    const { receiverId, roomId, content } = req.body;
    if (!receiverId || !content) return res.status(400).json({ error: "Receiver ID and content are required" });
    if (!canAccessChat({ currentUser: (req as any).user, otherUserId: receiverId })) {
      return res.status(403).json({ error: "You do not have access to this chat" });
    }
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO messages (id, senderId, receiverId, roomId, content) VALUES (?, ?, ?, ?, ?)").run(
      id, senderId, receiverId, roomId || null, content
    );
    const newMessage = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
    res.status(201).json(newMessage);
  } catch (_) { res.status(500).json({ error: "Failed to send message" }); }
});

export default router;
