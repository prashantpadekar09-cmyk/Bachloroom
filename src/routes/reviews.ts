import express from "express";
import { db } from "../db/setup.js";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get all reviews (Admin only)
router.get("/", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const stmt = db.prepare(`
      SELECT r.*, u.name as userName, rooms.title as roomTitle 
      FROM reviews r 
      JOIN users u ON r.userId = u.id 
      JOIN rooms ON r.roomId = rooms.id 
      ORDER BY r.createdAt DESC
    `);
    const reviews = stmt.all();
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get reviews for a room
router.get("/:roomId", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT r.*, u.name as userName 
      FROM reviews r 
      JOIN users u ON r.userId = u.id 
      WHERE r.roomId = ? 
      ORDER BY r.createdAt DESC
    `);
    const reviews = stmt.all(req.params.roomId);
    
    const statsStmt = db.prepare(`
      SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews 
      FROM reviews 
      WHERE roomId = ?
    `);
    const stats = statsStmt.get(req.params.roomId) as any;

    res.json({ 
      reviews, 
      averageRating: stats.averageRating || 0, 
      totalReviews: stats.totalReviews || 0 
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a review
router.post("/", authenticateToken, (req: any, res: any) => {
  const { roomId, rating, comment } = req.body;
  const userId = req.user.id;

  if (!roomId || !rating) {
    return res.status(400).json({ error: "Room ID and rating are required" });
  }

  try {
    // Check if user already reviewed this room
    const checkStmt = db.prepare("SELECT id FROM reviews WHERE userId = ? AND roomId = ?");
    const existing = checkStmt.get(userId, roomId);

    if (existing) {
      return res.status(400).json({ error: "You have already reviewed this room" });
    }

    const id = crypto.randomUUID();
    const stmt = db.prepare(
      "INSERT INTO reviews (id, userId, roomId, rating, comment) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, userId, roomId, rating, comment);

    res.json({ id, message: "Review added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a review
router.put("/:id", authenticateToken, (req: any, res: any) => {
  const { rating, comment } = req.body;
  const userId = req.user.id;
  const reviewId = req.params.id;

  try {
    const checkStmt = db.prepare("SELECT userId FROM reviews WHERE id = ?");
    const review = checkStmt.get(reviewId) as any;

    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const stmt = db.prepare(
      "UPDATE reviews SET rating = ?, comment = ? WHERE id = ?"
    );
    stmt.run(rating, comment, reviewId);

    res.json({ message: "Review updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a review
router.delete("/:id", authenticateToken, (req: any, res: any) => {
  const userId = req.user.id;
  const reviewId = req.params.id;

  try {
    const checkStmt = db.prepare("SELECT userId FROM reviews WHERE id = ?");
    const review = checkStmt.get(reviewId) as any;

    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const stmt = db.prepare("DELETE FROM reviews WHERE id = ?");
    stmt.run(reviewId);

    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
