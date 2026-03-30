import express from "express";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

router.post("/", authenticateToken, (req: any, res) => {
  const { roomId } = req.body;
  const userId = req.user.id;
  const id = crypto.randomUUID();

  try {
    const stmt = db.prepare("INSERT INTO saved_rooms (id, userId, roomId) VALUES (?, ?, ?)");
    stmt.run(id, userId, roomId);
    res.json({ message: "Room saved to wishlist" });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Room already saved" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

const safeParseArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string" && !value.trim().startsWith("[")) {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

router.get("/", authenticateToken, (req: any, res) => {
  const userId = req.user.id;

  try {
    const stmt = db.prepare(`
      SELECT sr.id as savedId, r.*
      FROM saved_rooms sr
      JOIN rooms r ON sr.roomId = r.id
      WHERE sr.userId = ?
    `);
    const rooms = stmt.all(userId).map((r: any) => ({
      ...r,
      images: safeParseArray(r.images),
      amenities: safeParseArray(r.amenities)
    }));
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const savedId = req.params.id;

  try {
    const stmt = db.prepare("DELETE FROM saved_rooms WHERE id = ? AND userId = ?");
    const result = stmt.run(savedId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Saved room not found" });
    }
    res.json({ message: "Room removed from wishlist" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
