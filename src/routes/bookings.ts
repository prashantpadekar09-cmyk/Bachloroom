import express from "express";
import crypto from "crypto";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

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

router.post("/", authenticateToken, (req: any, res: any) => {
  const { roomId, moveInDate, duration, people, serviceFee, paymentFee, totalAmount, moveInPackage } = req.body;

  if (!roomId || !moveInDate) {
    return res.status(400).json({ error: "Room ID and move-in date are required" });
  }

  const id = crypto.randomUUID();
  const safeDuration = Math.max(1, Number(duration) || 1);
  const safePeople = Math.max(1, Number(people) || 1);

  try {
    const currentUser = db.prepare("SELECT isPremium FROM users WHERE id = ?").get(req.user.id) as any;
    const stmt = db.prepare(
      "INSERT INTO bookings (id, userId, roomId, moveInDate, duration, people, premiumIncluded, serviceFee, paymentFee, totalAmount, moveInPackage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const packageStr = Array.isArray(moveInPackage) ? JSON.stringify(moveInPackage) : (moveInPackage || "");
    stmt.run(
      id,
      req.user.id,
      roomId,
      moveInDate,
      safeDuration,
      safePeople,
      currentUser?.isPremium ? 1 : 0,
      serviceFee || 0,
      paymentFee || 0,
      totalAmount || 0,
      packageStr
    );
    res.json({ id, message: "Booking created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my-bookings", authenticateToken, (req: any, res: any) => {
  try {
    const stmt = db.prepare(`
      SELECT b.*, r.title as roomTitle, r.city as roomCity, r.price as roomPrice, r.images as roomImages
      FROM bookings b
      JOIN rooms r ON b.roomId = r.id
      WHERE b.userId = ?
    `);
    const bookings = stmt.all(req.user.id).map((b: any) => {
      return {
        ...b,
        roomImages: safeParseArray(b.roomImages),
        moveInPackage: safeParseArray(b.moveInPackage)
      };
    });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner-bookings", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    let stmt;
    let bookings;
    if (req.user.role === "admin") {
      stmt = db.prepare(`
        SELECT b.*, r.title as roomTitle, u.name as userName, u.email as userEmail, u.phone as userPhone
        FROM bookings b
        JOIN rooms r ON b.roomId = r.id
        JOIN users u ON b.userId = u.id
      `);
      bookings = stmt.all();
    } else {
      stmt = db.prepare(`
        SELECT b.*, r.title as roomTitle, u.name as userName, u.email as userEmail, u.phone as userPhone
        FROM bookings b
        JOIN rooms r ON b.roomId = r.id
        JOIN users u ON b.userId = u.id
        WHERE r.ownerId = ?
      `);
      bookings = stmt.all(req.user.id);
    }

    bookings = bookings.map((b: any) => {
      return {
        ...b,
        moveInPackage: safeParseArray(b.moveInPackage)
      };
    });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/status", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { status } = req.body;
  try {
    const stmt = db.prepare("UPDATE bookings SET status = ? WHERE id = ?");
    stmt.run(status, req.params.id);
    res.json({ message: "Booking status updated" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/cancel", authenticateToken, (req: any, res: any) => {
  const userId = req.user.id;
  const bookingId = req.params.id;

  try {
    const booking = db.prepare("SELECT userId FROM bookings WHERE id = ?").get(bookingId) as any;
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
