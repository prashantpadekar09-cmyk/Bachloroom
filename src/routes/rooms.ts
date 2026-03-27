import express from "express";
import { db } from "../db/setup.js";
import crypto from "crypto";
import { authenticateToken, verifyToken } from "../middleware/auth.js";

const router = express.Router();

const getOptionalUser = (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    return verifyToken(token) as any;
  } catch (err) {
    return null;
  }
};

const hasPremiumAccess = (userId: string) => {
  const user = db.prepare("SELECT isPremium FROM users WHERE id = ?").get(userId) as any;
  return Boolean(user?.isPremium);
};

router.get("/", (req, res) => {
  const { city, location, minPrice, maxPrice, type, minLat, maxLat, minLng, maxLng } = req.query;
  let query = "SELECT * FROM rooms WHERE 1=1";
  const params: any[] = [];

  if (city) {
    query += " AND city LIKE ?";
    params.push(`%${city}%`);
  }
  if (location) {
    query += " AND location LIKE ?";
    params.push(`%${location}%`);
  }
  if (minPrice) {
    query += " AND price >= ?";
    params.push(minPrice);
  }
  if (maxPrice) {
    query += " AND price <= ?";
    params.push(maxPrice);
  }
  if (type) {
    query += " AND type = ?";
    params.push(type);
  }
  if (minLat && maxLat && minLng && maxLng) {
    query += " AND lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?";
    params.push(minLat, maxLat, minLng, maxLng);
  }

  query += " ORDER BY isFeatured DESC, createdAt DESC";

  try {
    const stmt = db.prepare(query);
    const rooms = stmt.all(...params).map((r: any) => ({
      ...r,
      images: JSON.parse(r.images),
      amenities: JSON.parse(r.amenities)
    }));
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cities", (req, res) => {
  try {
    const stmt = db.prepare("SELECT DISTINCT city FROM rooms WHERE city IS NOT NULL AND city != '' ORDER BY city ASC");
    const cities = stmt.all().map((r: any) => r.city);
    res.json({ cities });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", (req, res) => {
  try {
    const { city, location, type } = req.query;
    if (!city || !location) {
      return res.status(400).json({ error: "City and location are required" });
    }

    let query = "SELECT AVG(price) as avgPrice, COUNT(*) as count FROM rooms WHERE city LIKE ? AND location LIKE ?";
    const params: any[] = [`%${city}%`, `%${location}%`];

    if (type) {
      query += " AND type LIKE ?";
      params.push(`%${type}%`);
    }

    const stmt = db.prepare(query);
    const result = stmt.get(...params) as { avgPrice: number, count: number };
    
    res.json(result || { avgPrice: 0, count: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM rooms WHERE id = ?");
    const room = stmt.get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });

    room.images = JSON.parse(room.images);
    room.amenities = JSON.parse(room.amenities);

    const ownerStmt = db.prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?");
    const ownerRecord = ownerStmt.get(room.ownerId) as any;
    const currentUser = getOptionalUser(req);
    const contactUnlocked =
      Boolean(currentUser) &&
      (currentUser.id === room.ownerId ||
        currentUser.role === "admin" ||
        hasPremiumAccess(currentUser.id));

    const owner = ownerRecord
      ? {
          id: ownerRecord.id,
          name: ownerRecord.name,
          role: ownerRecord.role,
          email: contactUnlocked ? ownerRecord.email : null,
          phone: contactUnlocked ? ownerRecord.phone : null,
        }
      : null;

    res.json({
      room,
      owner,
      contactUnlocked,
      requiresPlatformPayment: !contactUnlocked,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    // Check subscription limits
    if (req.user.role === "owner") {
      const userStmt = db.prepare("SELECT subscriptionPlan FROM users WHERE id = ?");
      const user = userStmt.get(req.user.id) as any;
      const plan = user?.subscriptionPlan || "basic";

      const countStmt = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE ownerId = ?");
      const { count } = countStmt.get(req.user.id) as any;

      if (plan === "basic" && count >= 2) {
        return res.status(403).json({ error: "Basic plan allows up to 2 rooms. Please upgrade." });
      }
      if (plan === "pro" && count >= 10) {
        return res.status(403).json({ error: "Pro plan allows up to 10 rooms. Please upgrade." });
      }
    }

    const { title, description, price, priceLabel, billingPeriod, deposit, location, city, images, amenities, type, lat, lng } = req.body;
    const id = crypto.randomUUID();

    const stmt = db.prepare(
      "INSERT INTO rooms (id, title, description, price, priceLabel, billingPeriod, deposit, location, city, images, amenities, ownerId, type, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      id,
      title,
      description,
      price,
      priceLabel || null,
      billingPeriod || "month",
      deposit,
      location,
      city,
      JSON.stringify(images || []),
      JSON.stringify(amenities || []),
      req.user.id,
      type || "Single Room",
      lat || null,
      lng || null
    );
    res.json({ id, message: "Room created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const checkStmt = db.prepare("SELECT ownerId FROM rooms WHERE id = ?");
    const room = checkStmt.get(req.params.id) as any;
    
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { title, description, price, priceLabel, billingPeriod, deposit, location, city, images, amenities, type, lat, lng } = req.body;
    
    const stmt = db.prepare(
      "UPDATE rooms SET title = ?, description = ?, price = ?, priceLabel = ?, billingPeriod = ?, deposit = ?, location = ?, city = ?, images = ?, amenities = ?, type = ?, lat = ?, lng = ? WHERE id = ?"
    );
    stmt.run(
      title,
      description,
      price,
      priceLabel || null,
      billingPeriod || "month",
      deposit,
      location,
      city,
      JSON.stringify(Array.isArray(images) ? images : []),
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      type,
      lat ?? null,
      lng ?? null,
      req.params.id
    );
    res.json({ message: "Room updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const checkStmt = db.prepare("SELECT ownerId FROM rooms WHERE id = ?");
    const room = checkStmt.get(req.params.id) as any;
    
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const deleteRoomWithRelations = db.transaction((roomId: string) => {
      db.prepare("DELETE FROM rent_payments WHERE roomId = ?").run(roomId);
      db.prepare(
        "DELETE FROM payments WHERE roomId = ? OR bookingId IN (SELECT id FROM bookings WHERE roomId = ?)"
      ).run(roomId, roomId);
      db.prepare("DELETE FROM saved_rooms WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM messages WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM reviews WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM bookings WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId);
    });

    deleteRoomWithRelations(req.params.id);

    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/promote", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const userStmt = db.prepare("SELECT subscriptionPlan, isPremium FROM users WHERE id = ?");
    const user = userStmt.get(req.user.id) as any;
    const hasOwnerPremium = Boolean(user?.isPremium) || user?.subscriptionPlan === "premium";

    if (req.user.role !== "admin" && !hasOwnerPremium) {
      return res.status(403).json({ error: "Owner premium is required to promote rooms" });
    }

    const checkStmt = db.prepare("SELECT ownerId FROM rooms WHERE id = ?");
    const room = checkStmt.get(req.params.id) as any;
    
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const stmt = db.prepare("UPDATE rooms SET isFeatured = 1 WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ message: "Room promoted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
