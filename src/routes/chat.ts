import express from "express";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

const getAdminUser = () => {
  return db
    .prepare("SELECT id, name, role FROM users WHERE role = 'admin' ORDER BY createdAt ASC LIMIT 1")
    .get() as { id: string; name: string; role: string } | undefined;
};

const hasConversation = (userId: string, otherUserId: string) => {
  const conversation = db
    .prepare(
      `
        SELECT id
        FROM messages
        WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
        LIMIT 1
      `
    )
    .get(userId, otherUserId, otherUserId, userId);

  return Boolean(conversation);
};

const canAccessChat = ({
  currentUser,
  otherUserId,
}: {
  currentUser: any;
  otherUserId: string;
}) => {
  if (currentUser.role === "admin" || currentUser.id === otherUserId) {
    return true;
  }

  const otherUser = db
    .prepare("SELECT id, role FROM users WHERE id = ?")
    .get(otherUserId) as { id: string; role: string } | undefined;

  if (otherUser?.role === "admin") {
    return true;
  }

  if (hasConversation(currentUser.id, otherUserId)) {
    return true;
  }

  return false;
};

router.get("/admin-contact", authenticateToken, (req, res) => {
  try {
    const adminUser = getAdminUser();
    if (!adminUser) {
      return res.status(404).json({ error: "Admin account not found" });
    }

    res.json({ user: adminUser });
  } catch (error) {
    console.error("Error fetching admin contact:", error);
    res.status(500).json({ error: "Failed to fetch admin contact" });
  }
});

router.get("/unread-count", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = db
      .prepare(
        `
          SELECT COUNT(*) as count
          FROM messages
          WHERE receiverId = ? AND COALESCE(isRead, 0) = 0
        `
      )
      .get(userId) as { count: number };

    res.json({ unreadCount: result?.count || 0 });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Get conversations list
router.get("/conversations", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    // Get unique users the current user has chatted with
    const stmt = db.prepare(`
      SELECT DISTINCT 
        CASE 
          WHEN senderId = ? THEN receiverId 
          ELSE senderId 
        END as otherUserId
      FROM messages
      WHERE senderId = ? OR receiverId = ?
    `);
    const userIds = stmt.all(userId, userId, userId) as { otherUserId: string }[];
    
    const conversations = [];
    for (const row of userIds) {
      const userStmt = db.prepare("SELECT id, name, role FROM users WHERE id = ?");
      const user = userStmt.get(row.otherUserId);
      if (user) {
        // Get last message
        const lastMsgStmt = db.prepare(`
          SELECT content, createdAt 
          FROM messages 
          WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
          ORDER BY createdAt DESC LIMIT 1
        `);
        const lastMsg = lastMsgStmt.get(userId, row.otherUserId, row.otherUserId, userId);

        const unreadStmt = db.prepare(`
          SELECT COUNT(*) as count
          FROM messages
          WHERE senderId = ? AND receiverId = ? AND COALESCE(isRead, 0) = 0
        `);
        const unread = unreadStmt.get(row.otherUserId, userId) as { count: number };
        
        conversations.push({
          user,
          lastMessage: lastMsg,
          unreadCount: unread?.count || 0,
        });
      }
    }
    
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get messages with a specific user
router.get("/:otherUserId", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { otherUserId } = req.params;

    if (!canAccessChat({ currentUser: (req as any).user, otherUserId })) {
      return res.status(403).json({ error: "You do not have access to this chat" });
    }
    
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY createdAt ASC
    `);
    const messages = stmt.all(userId, otherUserId, otherUserId, userId);

    db.prepare(`
      UPDATE messages
      SET isRead = 1
      WHERE senderId = ? AND receiverId = ? AND COALESCE(isRead, 0) = 0
    `).run(otherUserId, userId);
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/", authenticateToken, (req, res) => {
  try {
    const senderId = (req as any).user.id;
    const { receiverId, roomId, content } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: "Receiver ID and content are required" });
    }

    if (!canAccessChat({ currentUser: (req as any).user, otherUserId: receiverId })) {
      return res.status(403).json({ error: "You do not have access to this chat" });
    }
    
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO messages (id, senderId, receiverId, roomId, content)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, senderId, receiverId, roomId || null, content);
    
    const newMsgStmt = db.prepare("SELECT * FROM messages WHERE id = ?");
    const newMessage = newMsgStmt.get(id);
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
