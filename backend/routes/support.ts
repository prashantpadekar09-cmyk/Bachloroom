import express from "express";
import { db } from "../../database/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

const formatQuerySummary = (row: any) => ({
  id: row.id,
  userId: row.userId,
  userName: row.userName,
  userEmail: row.userEmail,
  userRole: row.userRole,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  lastMessage: row.lastMessage || "",
  lastMessageAt: row.lastMessageAt || row.updatedAt,
});

const normalizeSupportQueries = () => {
  try {
    const duplicateUsers = db.prepare(`
      SELECT userId FROM support_queries GROUP BY userId HAVING COUNT(*) > 1
    `).all() as { userId: string }[];

    for (const { userId } of duplicateUsers) {
      const userQueries = db.prepare(`
        SELECT id, createdAt, updatedAt, status, adminRepliedAt
        FROM support_queries WHERE userId = ?
        ORDER BY datetime(updatedAt) DESC, datetime(createdAt) DESC
      `).all(userId) as Array<{ id: string; createdAt: string; updatedAt: string; status: string; adminRepliedAt: string | null }>;

      if (userQueries.length <= 1) continue;

      const keepId = userQueries[0].id;
      const mergedIds = userQueries.map((q) => q.id);
      const duplicateIds = mergedIds.slice(1);
      const ph = mergedIds.map(() => "?").join(", ");
      const dph = duplicateIds.map(() => "?").join(", ");

      const mergedMeta = db.prepare(`
        SELECT MIN(createdAt) as createdAt, MAX(updatedAt) as updatedAt,
          MAX(adminRepliedAt) as adminRepliedAt,
          MAX(CASE WHEN status = 'not_resolved' THEN 1 ELSE 0 END) as hasOpenQuery
        FROM support_queries WHERE id IN (${ph})
      `).get(...mergedIds) as any;

      if (duplicateIds.length > 0) {
        db.prepare(`UPDATE support_query_messages SET queryId = ? WHERE queryId IN (${dph})`).run(keepId, ...duplicateIds);
        db.prepare(`UPDATE support_queries SET createdAt=?, updatedAt=?, status=?, adminRepliedAt=? WHERE id=?`).run(
          mergedMeta.createdAt, mergedMeta.updatedAt,
          mergedMeta.hasOpenQuery ? "not_resolved" : "resolved",
          mergedMeta.adminRepliedAt, keepId
        );
        db.prepare(`DELETE FROM support_queries WHERE id IN (${dph})`).run(...duplicateIds);
      }
    }
  } catch (e) { console.warn("Failed to normalize support queries:", e); }
};

const purgeExpiredQueries = () => {
  try {
    db.prepare(`
      DELETE FROM support_query_messages WHERE queryId IN (
        SELECT id FROM support_queries
        WHERE adminRepliedAt IS NOT NULL AND adminRepliedAt <= datetime('now', '-3 days')
      )
    `).run();
    db.prepare(`
      DELETE FROM support_queries
      WHERE adminRepliedAt IS NOT NULL AND adminRepliedAt <= datetime('now', '-3 days')
    `).run();
  } catch (e) { console.warn("Failed to purge expired support queries:", e); }
};

const queryWithLastMessage = (whereClause: string, ...params: unknown[]) => db.prepare(`
  SELECT
    q.id, q.userId, u.name as userName, u.email as userEmail, u.role as userRole,
    q.status, q.createdAt, q.updatedAt,
    (SELECT sqm.text FROM support_query_messages sqm WHERE sqm.queryId = q.id ORDER BY sqm.createdAt DESC LIMIT 1) as lastMessage,
    (SELECT sqm.createdAt FROM support_query_messages sqm WHERE sqm.queryId = q.id ORDER BY sqm.createdAt DESC LIMIT 1) as lastMessageAt
  FROM support_queries q JOIN users u ON u.id = q.userId
  ${whereClause}
  ORDER BY q.updatedAt DESC
`).all(...params);

router.post("/queries", authenticateToken, (req: any, res) => {
  normalizeSupportQueries(); purgeExpiredQueries();
  if (req.user.role === "admin") return res.status(403).json({ error: "Admins cannot create support queries here" });
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Message text is required" });

  try {
    const existing = db.prepare(`
      SELECT id FROM support_queries WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1
    `).get(req.user.id) as { id: string } | undefined;

    const queryId = existing?.id ?? (() => {
      const id = crypto.randomUUID();
      db.prepare("INSERT INTO support_queries (id, userId, status) VALUES (?, ?, 'not_resolved')").run(id, req.user.id);
      return id;
    })();

    db.prepare("INSERT INTO support_query_messages (id, queryId, senderId, senderRole, text) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(), queryId, req.user.id, req.user.role, text
    );
    db.prepare(`UPDATE support_queries SET status='not_resolved', updatedAt=CURRENT_TIMESTAMP, adminRepliedAt=NULL WHERE id=?`).run(queryId);

    res.status(201).json({ id: queryId, reusedExisting: Boolean(existing), message: existing ? "Query updated successfully" : "Query created successfully" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to create support query" }); }
});

router.get("/queries/me", authenticateToken, (req: any, res) => {
  normalizeSupportQueries(); purgeExpiredQueries();
  if (req.user.role === "admin") return res.status(403).json({ error: "Admins should use the admin support route" });
  try {
    res.json({ queries: queryWithLastMessage("WHERE q.userId = ?", req.user.id).map(formatQuerySummary) });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch support queries" }); }
});

router.get("/queries/:id", authenticateToken, (req: any, res) => {
  normalizeSupportQueries(); purgeExpiredQueries();
  try {
    const query = db.prepare(`
      SELECT q.id, q.userId, q.status, q.createdAt, q.updatedAt,
             u.name as userName, u.email as userEmail, u.role as userRole
      FROM support_queries q JOIN users u ON u.id = q.userId WHERE q.id = ?
    `).get(req.params.id) as any;
    if (!query) return res.status(404).json({ error: "Query not found" });
    if (req.user.role !== "admin" && query.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const messages = db.prepare(`
      SELECT sqm.id, sqm.queryId, sqm.senderId, sqm.senderRole, sqm.text, sqm.createdAt, u.name as senderName
      FROM support_query_messages sqm JOIN users u ON u.id = sqm.senderId
      WHERE sqm.queryId = ? ORDER BY sqm.createdAt ASC
    `).all(req.params.id);

    res.json({ query: { ...query, messages } });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch support query" }); }
});

router.post("/queries/:id/messages", authenticateToken, (req: any, res) => {
  normalizeSupportQueries(); purgeExpiredQueries();
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Message text is required" });

  try {
    const query = db.prepare("SELECT id, userId, status FROM support_queries WHERE id = ?").get(req.params.id) as any;
    if (!query) return res.status(404).json({ error: "Query not found" });
    if (req.user.role !== "admin" && query.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    if (req.user.role === "admin" && query.status === "resolved") return res.status(400).json({ error: "Query is closed. Mark it as not resolved to reply again." });

    const messageId = crypto.randomUUID();
    db.prepare("INSERT INTO support_query_messages (id, queryId, senderId, senderRole, text) VALUES (?, ?, ?, ?, ?)").run(
      messageId, req.params.id, req.user.id, req.user.role, text
    );

    if (req.user.role === "admin") {
      db.prepare("UPDATE support_queries SET updatedAt=CURRENT_TIMESTAMP, adminRepliedAt=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
    } else {
      db.prepare("UPDATE support_queries SET status='not_resolved', updatedAt=CURRENT_TIMESTAMP, adminRepliedAt=NULL WHERE id=?").run(req.params.id);
    }

    const message = db.prepare(`
      SELECT sqm.id, sqm.queryId, sqm.senderId, sqm.senderRole, sqm.text, sqm.createdAt, u.name as senderName
      FROM support_query_messages sqm JOIN users u ON u.id = sqm.senderId WHERE sqm.id = ?
    `).get(messageId);

    res.status(201).json({ message });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to send message" }); }
});

router.delete("/queries/:id/messages", authenticateToken, (req: any, res) => {
  normalizeSupportQueries(); purgeExpiredQueries();
  try {
    const query = db.prepare("SELECT id, userId FROM support_queries WHERE id = ?").get(req.params.id) as any;
    if (!query) return res.status(404).json({ error: "Query not found" });
    if (req.user.role !== "admin" && query.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    db.prepare("DELETE FROM support_query_messages WHERE queryId = ?").run(req.params.id);

    if (req.user.role === "admin") {
      const deleted = db.prepare("DELETE FROM support_queries WHERE id = ?").run(req.params.id);
      if (deleted.changes === 0) return res.status(404).json({ error: "Query not found" });
      return res.json({ message: "Chat deleted successfully", deleted: true });
    }

    db.prepare("UPDATE support_queries SET updatedAt=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
    res.json({ message: "Chat cleared successfully", deleted: false });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to clear chat" }); }
});

router.get("/admin/queries", authenticateToken, (req: any, res) => {
  normalizeSupportQueries(); purgeExpiredQueries();
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  try {
    res.json({ queries: queryWithLastMessage("").map(formatQuerySummary) });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch support queries" }); }
});

router.patch("/admin/queries/:id/status", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  const status = typeof req.body?.status === "string" ? req.body.status : "";
  if (!["resolved", "not_resolved"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const result = db.prepare(`
      UPDATE support_queries
      SET status=?, updatedAt=CURRENT_TIMESTAMP,
          adminRepliedAt = CASE WHEN ? = 'resolved' THEN COALESCE(adminRepliedAt, CURRENT_TIMESTAMP) ELSE NULL END
      WHERE id=?
    `).run(status, status, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: "Query not found" });

    const updated = queryWithLastMessage("WHERE q.id = ?", req.params.id)[0];
    res.json({
      message: status === "resolved" ? "Query marked as resolved" : "Query marked as not resolved",
      deleted: false,
      query: updated ? formatQuerySummary(updated) : null,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update status" }); }
});

export default router;
