import express from "express";
import { db } from "../../database/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();
const providerRoles = new Set(["service_provider", "admin"]);

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

function buildPriceLabel(category: string, price: number) {
  if (price <= 0) return null;
  const unit = category === "Tiffin / Food Service" ? "/plate" : category === "Cleaning Service" ? "/visit" : "/item";
  return `Starting from Rs. ${price}${unit}`;
}

router.get("/", (req, res) => {
  const { category, city } = req.query;
  let query = `
    SELECT s.id, s.title, s.description, s.category, s.price, s.priceLabel, s.city,
      s.image, s.highlights, s.whatsappUrl,
      COALESCE(NULLIF(s.providerName,''), u.name) as providerName,
      CASE WHEN NULLIF(s.providerName,'') IS NOT NULL THEN NULLIF(s.providerEmail,'') ELSE u.email END as providerEmail,
      CASE WHEN NULLIF(s.providerName,'') IS NOT NULL THEN NULLIF(s.providerPhone,'') ELSE u.phone END as providerPhone
    FROM services s LEFT JOIN users u ON s.providerId = u.id WHERE 1=1
  `;
  const params: any[] = [];
  if (category) { query += " AND s.category = ?"; params.push(category); }
  if (city) { query += " AND s.city LIKE ?"; params.push(`%${city}%`); }
  query += " ORDER BY s.city ASC, s.category ASC, CASE WHEN s.price=0 THEN 1 ELSE 0 END, s.price ASC";

  try {
    const services = db.prepare(query).all(...params).map((s: any) => ({
      ...s, highlights: safeParseArray(s.highlights),
    }));
    res.json({ services });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/mine", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) return res.status(403).json({ error: "Unauthorized" });
  try {
    const services = db.prepare(`
      SELECT id, title, description, category, price, priceLabel, city, image, highlights,
        whatsappUrl, providerName, providerPhone, providerEmail, createdAt
      FROM services WHERE providerId=? ORDER BY createdAt DESC
    `).all(req.user.id).map((s: any) => ({ ...s, highlights: safeParseArray(s.highlights) }));
    res.json({ services });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) return res.status(403).json({ error: "Unauthorized" });
  const { title, description, category, price, city, image, highlights, whatsappUrl, providerName, providerEmail, providerPhone } = req.body;
  const numericPrice = Number(price) || 0;
  try {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO services (id, title, description, category, price, priceLabel, providerId, providerName,
        providerPhone, providerEmail, city, image, highlights, whatsappUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, category, numericPrice, buildPriceLabel(category, numericPrice),
      req.user.id, providerName || null, providerPhone || null, providerEmail || null,
      city, image || null, JSON.stringify(highlights || []), whatsappUrl || null);
    res.json({ id, message: "Service created successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/:id", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) return res.status(403).json({ error: "Unauthorized" });
  const { title, description, category, price, city, image, highlights, whatsappUrl, providerName, providerEmail, providerPhone } = req.body;
  const numericPrice = Number(price) || 0;
  try {
    const existing = db.prepare("SELECT providerId FROM services WHERE id = ?").get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: "Service not found" });
    if (req.user.role !== "admin" && existing.providerId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    db.prepare(`
      UPDATE services SET title=?, description=?, category=?, price=?, priceLabel=?,
        providerName=?, providerPhone=?, providerEmail=?, city=?, image=?, highlights=?, whatsappUrl=?
      WHERE id=?
    `).run(title, description, category, numericPrice, buildPriceLabel(category, numericPrice),
      providerName || null, providerPhone || null, providerEmail || null,
      city, image || null, JSON.stringify(highlights || []), whatsappUrl || null, req.params.id);
    res.json({ message: "Service updated successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) return res.status(403).json({ error: "Unauthorized" });
  try {
    const existing = db.prepare("SELECT providerId FROM services WHERE id = ?").get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: "Service not found" });
    if (req.user.role !== "admin" && existing.providerId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    res.json({ message: "Service deleted successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
