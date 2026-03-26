import express from "express";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();
const providerRoles = new Set(["service_provider", "admin"]);

function buildPriceLabel(category: string, rawPrice: unknown) {
  const price = Number(rawPrice) || 0;
  if (price <= 0) {
    return null;
  }

  const unit =
    category === "Tiffin / Food Service"
      ? "/plate"
      : category === "Cleaning Service"
        ? "/visit"
        : "/item";

  return `Starting from Rs. ${price}${unit}`;
}

router.get("/", (req, res) => {
  const { category, city } = req.query;
  let query = `
    SELECT
      s.id,
      s.title,
      s.description,
      s.category,
      s.price,
      s.priceLabel,
      s.city,
      s.image,
      s.highlights,
      s.whatsappUrl,
      COALESCE(NULLIF(s.providerName, ''), u.name) as providerName,
      CASE
        WHEN NULLIF(s.providerName, '') IS NOT NULL THEN NULLIF(s.providerEmail, '')
        ELSE u.email
      END as providerEmail,
      CASE
        WHEN NULLIF(s.providerName, '') IS NOT NULL THEN NULLIF(s.providerPhone, '')
        ELSE u.phone
      END as providerPhone
    FROM services s
    LEFT JOIN users u ON s.providerId = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (category) {
    query += " AND s.category = ?";
    params.push(category);
  }
  if (city) {
    query += " AND s.city LIKE ?";
    params.push(`%${city}%`);
  }

  query += " ORDER BY s.city ASC, s.category ASC, CASE WHEN s.price = 0 THEN 1 ELSE 0 END, s.price ASC";

  try {
    const stmt = db.prepare(query);
    const services = stmt.all(...params).map((service: any) => ({
      ...service,
      highlights: service.highlights ? JSON.parse(service.highlights) : [],
    }));
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/mine", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const services = db
      .prepare(
        `
          SELECT
            id,
            title,
            description,
            category,
            price,
            priceLabel,
            city,
            image,
            highlights,
            whatsappUrl,
            providerName,
            providerPhone,
            providerEmail,
            createdAt
          FROM services
          WHERE providerId = ?
          ORDER BY createdAt DESC
        `
      )
      .all(req.user.id)
      .map((service: any) => ({
        ...service,
        highlights: service.highlights ? JSON.parse(service.highlights) : [],
      }));

    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const {
    title,
    description,
    category,
    price,
    city,
    image,
    highlights,
    whatsappUrl,
    providerName,
    providerEmail,
    providerPhone,
  } = req.body;
  const id = crypto.randomUUID();
  const numericPrice = Number(price) || 0;
  const priceLabel = buildPriceLabel(category, numericPrice);

  try {
    const stmt = db.prepare(
      `
        INSERT INTO services (
          id,
          title,
          description,
          category,
          price,
          priceLabel,
          providerId,
          providerName,
          providerPhone,
          providerEmail,
          city,
          image,
          highlights,
          whatsappUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );
    stmt.run(
      id,
      title,
      description,
      category,
      numericPrice,
      priceLabel,
      req.user.id,
      providerName || null,
      providerPhone || null,
      providerEmail || null,
      city,
      image || null,
      JSON.stringify(highlights || []),
      whatsappUrl || null
    );
    res.json({ id, message: "Service created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const {
    title,
    description,
    category,
    price,
    city,
    image,
    highlights,
    whatsappUrl,
    providerName,
    providerEmail,
    providerPhone,
  } = req.body;
  const numericPrice = Number(price) || 0;
  const priceLabel = buildPriceLabel(category, numericPrice);

  try {
    const existingService = db.prepare("SELECT providerId FROM services WHERE id = ?").get(req.params.id) as any;
    if (!existingService) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (req.user.role !== "admin" && existingService.providerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    db.prepare(
      `
        UPDATE services
        SET
          title = ?,
          description = ?,
          category = ?,
          price = ?,
          priceLabel = ?,
          providerName = ?,
          providerPhone = ?,
          providerEmail = ?,
          city = ?,
          image = ?,
          highlights = ?,
          whatsappUrl = ?
        WHERE id = ?
      `
    ).run(
      title,
      description,
      category,
      numericPrice,
      priceLabel,
      providerName || null,
      providerPhone || null,
      providerEmail || null,
      city,
      image || null,
      JSON.stringify(highlights || []),
      whatsappUrl || null,
      req.params.id
    );

    res.json({ message: "Service updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticateToken, (req: any, res: any) => {
  if (!providerRoles.has(req.user.role)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const existingService = db.prepare("SELECT providerId FROM services WHERE id = ?").get(req.params.id) as any;
    if (!existingService) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (req.user.role !== "admin" && existingService.providerId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
