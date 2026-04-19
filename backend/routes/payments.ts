import express from "express";
import { db } from "../../database/setup.js";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth.js";
import Razorpay from "razorpay";
import { scheduleSupabaseSync } from "../../database/supabaseMirror.js";

const router = express.Router();

// Razorpay is instantiated lazily to avoid crashing on missing keys
let _razorpay: Razorpay | null = null;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "test_key",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret",
    });
  }
  return _razorpay;
}

const PACKAGES: Record<string, { amount: number; credits: number; isPremium?: boolean; subscriptionPlan?: string }> = {
  credits_5:  { amount: 99 * 100,  credits: 5 },
  credits_15: { amount: 199 * 100, credits: 15, isPremium: true },
  unlimited:  { amount: 299 * 100, credits: 9999, isPremium: true, subscriptionPlan: "unlimited" },
};

const PREMIUM_AMOUNT = 99;
const UTR_REGEX = /^[A-Za-z0-9]{8,22}$/;
const isValidUtr = (value: unknown) => typeof value === "string" && UTR_REGEX.test(value.trim());

// ─── Premium (manual UPI) ────────────────────────────────────────────────────

router.post("/premium", authenticateToken, (req: any, res: any) => {
  const { utrNumber, screenshot } = req.body;
  const normalizedUtr = typeof utrNumber === "string" ? utrNumber.trim().toUpperCase() : "";
  if (!isValidUtr(normalizedUtr)) return res.status(400).json({ error: "Please enter a valid UTR number." });

  try {
    const existingUser = db.prepare("SELECT isPremium FROM users WHERE id = ?").get(req.user.id) as any;
    if (existingUser?.isPremium) return res.status(400).json({ error: "Premium is already active on your account." });

    const existingRequest = db.prepare(
      "SELECT id, status FROM premium_payments WHERE (userId=? AND status='pending') OR utrNumber=? LIMIT 1"
    ).get(req.user.id, normalizedUtr) as any;

    if (existingRequest) {
      return res.status(409).json({
        error: existingRequest.status === "pending"
          ? "A premium payment request is already pending review."
          : "This UTR number has already been submitted.",
      });
    }

    db.prepare(
      "INSERT INTO premium_payments (id, userId, amount, utrNumber, screenshot, status) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), req.user.id, PREMIUM_AMOUNT, normalizedUtr, screenshot || null, "pending");

    scheduleSupabaseSync("premium_submission");
    res.json({ message: "Payment proof submitted successfully. Admin will verify it soon." });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "This UTR number has already been submitted." });
    res.status(500).json({ error: "Failed to submit premium payment." });
  }
});

router.get("/premium/status", authenticateToken, (req: any, res: any) => {
  try {
    const payment = db.prepare(`
      SELECT id, amount, utrNumber, screenshot, status, createdAt
      FROM premium_payments WHERE userId=? ORDER BY createdAt DESC LIMIT 1
    `).get(req.user.id);

    res.json({
      isPremium: Boolean((db.prepare("SELECT isPremium FROM users WHERE id=?").get(req.user.id) as any)?.isPremium),
      amount: PREMIUM_AMOUNT,
      payment: payment || null,
      paymentConfig: { amount: PREMIUM_AMOUNT, upiId: "prashantpadekar09@oksbi", payeeName: "Room Rental Admin" },
    });
  } catch (_) { res.status(500).json({ error: "Failed to fetch premium payment status." }); }
});

router.get("/admin/premium-requests", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const requests = db.prepare(`
      SELECT p.*, u.name as userName, u.email as userEmail
      FROM premium_payments p JOIN users u ON u.id = p.userId
      ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, p.createdAt DESC
    `).all();
    res.json({ requests });
  } catch (_) { res.status(500).json({ error: "Failed to fetch premium payment requests." }); }
});

router.put("/admin/premium-requests/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid payment status." });

  try {
    const request = db.prepare("SELECT id, userId, status FROM premium_payments WHERE id = ?").get(req.params.id) as any;
    if (!request) return res.status(404).json({ error: "Payment request not found." });

    db.transaction(() => {
      db.prepare("UPDATE premium_payments SET status=?, reviewedBy=?, reviewedAt=CURRENT_TIMESTAMP WHERE id=?").run(status, req.user.id, req.params.id);
      if (status === "approved") {
        db.prepare("UPDATE users SET isPremium=1, subscriptionPlan='premium' WHERE id=?").run(request.userId);
      }
    })();

    scheduleSupabaseSync("premium_approval");
    res.json({ message: `Premium payment ${status}.` });
  } catch (_) { res.status(500).json({ error: "Failed to update premium payment status." }); }
});

// ─── Credits (Razorpay) ──────────────────────────────────────────────────────

router.post("/create-order", authenticateToken, async (req: any, res: any) => {
  const { packageId } = req.body;
  const pkg = PACKAGES[packageId];
  if (!pkg) return res.status(400).json({ error: "Invalid package" });
  try {
    const order = await getRazorpay().orders.create({
      amount: pkg.amount,
      currency: "INR",
      receipt: `rcpt_${crypto.randomUUID().slice(0, 10)}`,
    });
    res.json({ order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (_) { res.status(500).json({ error: "Failed to create order" }); }
});

router.post("/verify", authenticateToken, (req: any, res: any) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;
  const generated = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "test_secret")
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated !== razorpay_signature) return res.status(400).json({ error: "Invalid payment signature." });

  const pkg = PACKAGES[packageId];
  if (!pkg) return res.status(400).json({ error: "Invalid package" });

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE users SET credits = COALESCE(credits,0) + ?,
          isPremium = CASE WHEN ? THEN 1 ELSE isPremium END,
          subscriptionPlan = CASE WHEN ? THEN ? ELSE subscriptionPlan END
        WHERE id = ?
      `).run(pkg.credits, pkg.isPremium ? 1 : 0, pkg.subscriptionPlan ? 1 : 0, pkg.subscriptionPlan || "", req.user.id);
      db.prepare("INSERT INTO credit_transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)").run(
        crypto.randomUUID(), req.user.id, pkg.credits, "purchase", `Purchased package: ${packageId}`
      );
    })();
    scheduleSupabaseSync("razorpay_purchase");
    res.json({ message: "Payment successful", creditsAdded: pkg.credits });
  } catch (_) { res.status(500).json({ error: "Failed to process payment" }); }
});

// ─── Credits (Manual UPI) ────────────────────────────────────────────────────

router.post("/manual-credits", authenticateToken, (req: any, res: any) => {
  const { packageId, utrNumber, screenshot } = req.body;
  const pkg = PACKAGES[packageId];
  const normalizedUtr = typeof utrNumber === "string" ? utrNumber.trim().toUpperCase() : "";
  if (!pkg) return res.status(400).json({ error: "Invalid package" });
  if (!isValidUtr(normalizedUtr)) return res.status(400).json({ error: "Invalid UTR number" });

  try {
    const existing = db.prepare("SELECT id FROM manual_credit_payments WHERE utrNumber = ?").get(normalizedUtr);
    if (existing) return res.status(409).json({ error: "This UTR number has already been submitted." });

    db.prepare(
      "INSERT INTO manual_credit_payments (id, userId, packageId, amount, utrNumber, screenshot) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), req.user.id, packageId, pkg.amount / 100, normalizedUtr, screenshot || null);

    scheduleSupabaseSync("credit_submission");
    res.json({ message: "Payment proof submitted. Admin will verify and add credits soon." });
  } catch (_) { res.status(500).json({ error: "Failed to submit payment proof" }); }
});

router.get("/manual-credits/status", authenticateToken, (req: any, res: any) => {
  try {
    const payment = db.prepare(`
      SELECT id, amount, utrNumber, status, packageId, createdAt
      FROM manual_credit_payments WHERE userId=? ORDER BY createdAt DESC LIMIT 1
    `).get(req.user.id);
    res.json({ payment: payment || null });
  } catch (_) { res.status(500).json({ error: "Failed to fetch manual credit payment status." }); }
});

router.get("/admin/manual-credit-requests", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const requests = db.prepare(`
      SELECT p.*, u.name as userName, u.email as userEmail
      FROM manual_credit_payments p JOIN users u ON u.id = p.userId
      ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, p.createdAt DESC
    `).all();
    res.json({ requests });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.put("/admin/manual-credit-requests/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { status } = req.body;

  try {
    const request = db.prepare("SELECT * FROM manual_credit_payments WHERE id = ?").get(req.params.id) as any;
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ error: "Already processed" });

    const pkg = PACKAGES[request.packageId];
    if (status === "approved" && !pkg) return res.status(400).json({ error: "Invalid package associated with this request." });

    db.transaction(() => {
      db.prepare("UPDATE manual_credit_payments SET status=?, reviewedBy=?, reviewedAt=CURRENT_TIMESTAMP WHERE id=?").run(status, req.user.id, req.params.id);
      if (status === "approved" && pkg) {
        const result = db.prepare(`
          UPDATE users SET credits=COALESCE(credits,0)+?,
            isPremium=CASE WHEN ? THEN 1 ELSE isPremium END,
            subscriptionPlan=CASE WHEN ? THEN ? ELSE subscriptionPlan END
          WHERE id=?
        `).run(pkg.credits, pkg.isPremium ? 1 : 0, pkg.subscriptionPlan ? 1 : 0, pkg.subscriptionPlan || "", request.userId);
        if (result.changes > 0) {
          db.prepare("INSERT INTO credit_transactions (id, userId, amount, type, description) VALUES (?, ?, ?, ?, ?)").run(
            crypto.randomUUID(), request.userId, pkg.credits, "purchase", `Manual purchase approved: ${request.packageId}`
          );
        } else {
          throw new Error("Failed to update user balance.");
        }
      }
    })();

    scheduleSupabaseSync("credit_approval");
    res.json({ message: `Request successfully ${status}` });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
