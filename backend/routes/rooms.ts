import express from "express";
import { db } from "../../database/setup.js";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { authenticateToken, verifyToken } from "../middleware/auth.js";
import {
  awardReferralReward,
  REFERRAL_REWARD_OWNER_LIST_RUPEES,
  REFERRAL_REWARD_USER_UNLOCK_RUPEES,
} from "../../database/referrals/index.js";
import { scheduleSupabaseSync } from "../../database/supabaseMirror.js";

const router = express.Router();
const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();

const getOptionalUser = (req: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  try { return verifyToken(token) as any; } catch { return null; }
};

const hasPremiumAccess = (userId: string) => {
  const user = db.prepare("SELECT isPremium FROM users WHERE id = ?").get(userId) as any;
  return Boolean(user?.isPremium);
};

const safeParseArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string" && !value.trim().startsWith("[")) {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch { return [value]; }
};

router.get("/", (req, res) => {
  const { city, location, minPrice, maxPrice, type, minLat, maxLat, minLng, maxLng, sort } = req.query;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  let query = "SELECT * FROM rooms WHERE 1=1";
  const params: any[] = [];

  if (city) { query += " AND city LIKE ?"; params.push(`%${city}%`); }
  if (location) { query += " AND location LIKE ?"; params.push(`%${location}%`); }
  if (minPrice) { query += " AND price >= ?"; params.push(minPrice); }
  if (maxPrice) { query += " AND price <= ?"; params.push(maxPrice); }
  if (type) { query += " AND type = ?"; params.push(type); }
  if (q) {
    query += " AND (title LIKE ? OR description LIKE ? OR location LIKE ? OR city LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (minLat && maxLat && minLng && maxLng) {
    query += " AND lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?";
    params.push(minLat, maxLat, minLng, maxLng);
  }

  const sortKey = typeof sort === "string" ? sort : "";
  if (sortKey === "price_asc") {
    query += " ORDER BY isFeatured DESC, price ASC, createdAt DESC";
  } else if (sortKey === "price_desc") {
    query += " ORDER BY isFeatured DESC, price DESC, createdAt DESC";
  } else {
    query += " ORDER BY isFeatured DESC, createdAt DESC";
  }

  try {
    const rooms = db.prepare(query).all(...params).map((r: any) => ({
      ...r, images: safeParseArray(r.images), amenities: safeParseArray(r.amenities)
    }));
    res.json({ rooms });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/cities", (req, res) => {
  try {
    const cities = db.prepare("SELECT DISTINCT city FROM rooms WHERE city IS NOT NULL AND city != '' ORDER BY city ASC").all().map((r: any) => r.city);
    res.json({ cities });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/stats", (req, res) => {
  const { city, location, type } = req.query;
  if (!city || !location) return res.status(400).json({ error: "City and location are required" });
  let query = "SELECT AVG(price) as avgPrice, COUNT(*) as count FROM rooms WHERE city LIKE ? AND location LIKE ?";
  const params: any[] = [`%${city}%`, `%${location}%`];
  if (type) { query += " AND type LIKE ?"; params.push(`%${type}%`); }
  try {
    const result = db.prepare(query).get(...params) as { avgPrice: number; count: number };
    res.json(result || { avgPrice: 0, count: 0 });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/luxury", (req, res) => {
  try {
    const rooms = db.prepare("SELECT * FROM rooms WHERE isLuxury = 1 ORDER BY createdAt DESC").all().map((r: any) => ({
      ...r, images: safeParseArray(r.images), amenities: safeParseArray(r.amenities),
    }));
    res.json({ rooms });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/:id/price-evaluation", async (req, res) => {
  try {
    const room = db.prepare("SELECT city, location, type, price, billingPeriod, amenities FROM rooms WHERE id = ?").get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });

    if (!geminiApiKey || room.billingPeriod === "night" || Number(room.price) <= 0) {
      return res.json({ evaluation: null });
    }

    const amenities = safeParseArray(room.amenities);
    const prompt = `Evaluate the rent price for this room in India:
City: ${room.city}
Location: ${room.location}
Type: ${room.type}
Price: Rs. ${room.price}/month
Amenities: ${amenities.join(", ")}

Is this price 'Fair', 'Overpriced', or a 'Good Deal'? Respond with ONLY ONE of those three phrases.`;

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const evaluation = response.text?.trim();
    res.json({ evaluation: evaluation || null });
  } catch (error) {
    console.warn("[rooms] Price evaluation failed:", (error as Error)?.message || error);
    res.json({ evaluation: null });
  }
});

router.get("/:id", (req, res) => {
  try {
    const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });

    room.images = safeParseArray(room.images);
    room.amenities = safeParseArray(room.amenities);

    const ownerRecord = db.prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?").get(room.ownerId) as any;
    const currentUser = getOptionalUser(req);
    const hasUnlockedContact = Boolean(currentUser) && Boolean(
      db.prepare("SELECT id FROM room_unlocks WHERE userId = ? AND roomId = ? AND status = 'unlocked'").get(currentUser.id, room.id)
    );

    const contactUnlocked = Boolean(currentUser) && (
      currentUser.id === room.ownerId ||
      currentUser.role === "admin" ||
      hasUnlockedContact
    );

    const partialPhone = ownerRecord ? ownerRecord.phone?.replace(/(\d{2})(\d{6})(\d{2})/, "$1XXXXXX$3") : "98XXXXXX12";
    const owner = ownerRecord
      ? { id: ownerRecord.id, name: ownerRecord.name, role: ownerRecord.role, email: contactUnlocked ? ownerRecord.email : null, phone: contactUnlocked ? ownerRecord.phone : partialPhone }
      : null;

    res.json({ room, owner, contactUnlocked, requiresPlatformPayment: !contactUnlocked });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/:id/unlock", authenticateToken, (req: any, res: any) => {
  try {
    const { id: userId } = req.user;
    const roomId = req.params.id;
    const room = db.prepare("SELECT ownerId FROM rooms WHERE id = ?").get(roomId) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });

    if (room.ownerId === userId || req.user.role === "admin") {
      return res.json({ message: "Contact already available", success: true });
    }

    const alreadyUnlocked = db.prepare("SELECT id FROM room_unlocks WHERE userId = ? AND roomId = ?").get(userId, roomId);
    if (alreadyUnlocked) return res.json({ message: "Already unlocked", success: true });

    const user = db.prepare("SELECT credits FROM users WHERE id = ?").get(userId) as any;
    if (!user || user.credits < 1) return res.status(402).json({ error: "Insufficient credits" });

    const unlockContact = db.transaction(() => {
      db.prepare("UPDATE users SET credits = COALESCE(credits, 0) - 1 WHERE id = ?").run(userId);
      db.prepare("INSERT INTO credit_transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)").run(
        crypto.randomUUID(), userId, -1, "unlock", `Unlocked contact for room ${roomId}`
      );
      db.prepare("INSERT INTO room_unlocks (id, userId, roomId, ownerId, status) VALUES (?, ?, ?, ?, ?)").run(
        crypto.randomUUID(), userId, roomId, room.ownerId, "unlocked"
      );
      const ownerRecord = db.prepare("SELECT phone FROM users WHERE id = ?").get(room.ownerId) as any;
      return ownerRecord?.phone;
    });

    const ownerPhone = unlockContact();
    
    if (req.user.role === "user") {
      try {
        const result = awardReferralReward({ refereeId: userId, type: "unlock_owner_contact", amount: REFERRAL_REWARD_USER_UNLOCK_RUPEES, roomId: room.id });
        if (result.awarded) scheduleSupabaseSync("referral unlock_owner_contact");
      } catch (e) { console.warn("Referral reward skipped:", e); }
    }

    scheduleSupabaseSync("contact_unlock");
    res.json({ message: "Contact unlocked", success: true, phone: ownerPhone });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    let wasFirstOwnerRoom = false;
    if (req.user.role === "owner") {
      const user = db.prepare("SELECT subscriptionPlan FROM users WHERE id = ?").get(req.user.id) as any;
      const plan = user?.subscriptionPlan || "basic";
      const { count } = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE ownerId = ?").get(req.user.id) as any;
      wasFirstOwnerRoom = Number(count ?? 0) === 0;
      if (plan === "basic" && count >= 2) return res.status(403).json({ error: "Basic plan allows up to 2 rooms. Please upgrade." });
      if (plan === "pro" && count >= 10) return res.status(403).json({ error: "Pro plan allows up to 10 rooms. Please upgrade." });
    }

    const { title, description, price, priceLabel, billingPeriod, deposit, location, city, images, amenities, type, lat, lng } = req.body;
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO rooms (id, title, description, price, priceLabel, billingPeriod, deposit, location, city, images, amenities, ownerId, type, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, title, description, price, priceLabel || null, billingPeriod || "month", deposit, location, city, JSON.stringify(images || []), JSON.stringify(amenities || []), req.user.id, type || "Single Room", lat || null, lng || null);

    if (req.user.role === "owner" && wasFirstOwnerRoom) {
      try { awardReferralReward({ refereeId: req.user.id, type: "owner_listed_room", amount: REFERRAL_REWARD_OWNER_LIST_RUPEES, roomId: id }); }
      catch (e) { console.warn("Referral reward skipped:", e); }
    }
    res.json({ id, message: "Room created successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const room = db.prepare("SELECT ownerId FROM rooms WHERE id = ?").get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { title, description, price, priceLabel, billingPeriod, deposit, location, city, images, amenities, type, lat, lng } = req.body;
    db.prepare(
      "UPDATE rooms SET title=?, description=?, price=?, priceLabel=?, billingPeriod=?, deposit=?, location=?, city=?, images=?, amenities=?, type=?, lat=?, lng=? WHERE id=?"
    ).run(title, description, price, priceLabel || null, billingPeriod || "month", deposit, location, city, JSON.stringify(Array.isArray(images) ? images : []), JSON.stringify(Array.isArray(amenities) ? amenities : []), type, lat ?? null, lng ?? null, req.params.id);
    res.json({ message: "Room updated successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const room = db.prepare("SELECT ownerId FROM rooms WHERE id = ?").get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    db.transaction((roomId: string) => {
      db.prepare("DELETE FROM saved_rooms WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM messages WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM reviews WHERE roomId = ?").run(roomId);
      db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId);
    })(req.params.id);
    res.json({ message: "Room deleted successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/:id/promote", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const user = db.prepare("SELECT subscriptionPlan, isPremium FROM users WHERE id = ?").get(req.user.id) as any;
    if (req.user.role !== "admin" && !Boolean(user?.isPremium) && user?.subscriptionPlan !== "premium") {
      return res.status(403).json({ error: "Owner premium is required to promote rooms" });
    }
    const room = db.prepare("SELECT ownerId FROM rooms WHERE id = ?").get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    db.prepare("UPDATE rooms SET isFeatured = 1 WHERE id = ?").run(req.params.id);
    res.json({ message: "Room promoted successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
