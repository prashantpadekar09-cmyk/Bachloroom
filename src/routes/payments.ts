import express from "express";
import { db } from "../db/setup.js";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const PREMIUM_AMOUNT = 99;
const UTR_REGEX = /^[A-Za-z0-9]{8,22}$/;

const isValidUtr = (value: unknown) => typeof value === "string" && UTR_REGEX.test(value.trim());

router.post("/premium", authenticateToken, (req: any, res: any) => {
  const { utrNumber, screenshot } = req.body;
  const normalizedUtr = typeof utrNumber === "string" ? utrNumber.trim().toUpperCase() : "";

  if (!isValidUtr(normalizedUtr)) {
    return res.status(400).json({ error: "Please enter a valid UTR number." });
  }

  try {
    const existingApproved = db
      .prepare("SELECT isPremium FROM users WHERE id = ?")
      .get(req.user.id) as any;

    if (existingApproved?.isPremium) {
      return res.status(400).json({ error: "Premium is already active on your account." });
    }

    const existingRequest = db
      .prepare(
        "SELECT id, status FROM premium_payments WHERE (userId = ? AND status = 'pending') OR utrNumber = ? LIMIT 1"
      )
      .get(req.user.id, normalizedUtr) as any;

    if (existingRequest) {
      return res.status(409).json({
        error:
          existingRequest.status === "pending"
            ? "A premium payment request is already pending review."
            : "This UTR number has already been submitted.",
      });
    }

    const paymentId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO premium_payments (id, userId, amount, utrNumber, screenshot, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).run(paymentId, req.user.id, PREMIUM_AMOUNT, normalizedUtr, screenshot || null);

    res.status(201).json({ message: "Payment proof submitted. Waiting for admin approval.", paymentId });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "This UTR number has already been submitted." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to submit premium payment." });
  }
});

router.get("/premium/status", authenticateToken, (req: any, res: any) => {
  try {
    const user = db
      .prepare("SELECT id, isPremium FROM users WHERE id = ?")
      .get(req.user.id) as any;

    const payment = db
      .prepare(
        `SELECT id, amount, utrNumber, screenshot, status, createdAt
         FROM premium_payments
         WHERE userId = ?
         ORDER BY createdAt DESC
         LIMIT 1`
      )
      .get(req.user.id);

    res.json({
      isPremium: Boolean(user?.isPremium),
      amount: PREMIUM_AMOUNT,
      payment: payment || null,
      paymentConfig: {
        amount: PREMIUM_AMOUNT,
        upiId: "prashantpadekar09@oksbi",
        payeeName: "Room Rental Admin",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch premium payment status." });
  }
});

router.get("/admin/premium-requests", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const requests = db
      .prepare(
        `SELECT p.*, u.name as userName, u.email as userEmail
         FROM premium_payments p
         JOIN users u ON u.id = p.userId
         ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, p.createdAt DESC`
      )
      .all();

    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch premium payment requests." });
  }
});

router.put("/admin/premium-requests/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid payment status." });
  }

  try {
    const request = db
      .prepare("SELECT id, userId, status FROM premium_payments WHERE id = ?")
      .get(req.params.id) as any;

    if (!request) {
      return res.status(404).json({ error: "Payment request not found." });
    }

    const reviewRequest = db.transaction(() => {
      db.prepare(
        "UPDATE premium_payments SET status = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(status, req.user.id, req.params.id);

      if (status === "approved") {
        db.prepare("UPDATE users SET isPremium = 1, subscriptionPlan = 'premium' WHERE id = ?").run(request.userId);
      }
    });

    reviewRequest();

    res.json({ message: `Premium payment ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update premium payment status." });
  }
});

export default router;
