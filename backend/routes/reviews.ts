import express from "express";
import { db } from "../../database/setup.js";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as userName, rooms.title as roomTitle
      FROM reviews r
      JOIN users u ON r.userId = u.id
      JOIN rooms ON r.roomId = rooms.id
      ORDER BY r.createdAt DESC
    `).all();
    res.json({ reviews });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/:roomId", (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as userName
      FROM reviews r JOIN users u ON r.userId = u.id
      WHERE r.roomId = ? ORDER BY r.createdAt DESC
    `).all(req.params.roomId);
    const stats = db.prepare(
      "SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews FROM reviews WHERE roomId = ?"
    ).get(req.params.roomId) as any;
    res.json({ reviews, averageRating: stats.averageRating || 0, totalReviews: stats.totalReviews || 0 });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/", authenticateToken, (req: any, res: any) => {
  const { roomId, rating, comment } = req.body;
  if (!roomId || !rating) return res.status(400).json({ error: "Room ID and rating are required" });
  try {
    const existing = db.prepare("SELECT id FROM reviews WHERE userId = ? AND roomId = ?").get(req.user.id, roomId);
    if (existing) return res.status(400).json({ error: "You have already reviewed this room" });
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO reviews (id, userId, roomId, rating, comment) VALUES (?, ?, ?, ?, ?)").run(id, req.user.id, roomId, rating, comment);
    res.json({ id, message: "Review added successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/:id", authenticateToken, (req: any, res: any) => {
  const { rating, comment } = req.body;
  try {
    const review = db.prepare("SELECT userId FROM reviews WHERE id = ?").get(req.params.id) as any;
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    db.prepare("UPDATE reviews SET rating = ?, comment = ? WHERE id = ?").run(rating, comment, req.params.id);
    res.json({ message: "Review updated successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const review = db.prepare("SELECT userId FROM reviews WHERE id = ?").get(req.params.id) as any;
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    db.prepare("DELETE FROM reviews WHERE id = ?").run(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
