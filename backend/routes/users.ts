import express from "express";
import { db } from "../../database/setup.js";
import { authenticateToken } from "../middleware/auth.js";
import { scheduleSupabaseSync } from "../../database/supabaseMirror.js";
import crypto from "crypto";

const router = express.Router();

router.put("/subscription", authenticateToken, (req: any, res: any) => {
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: "Plan is required" });
  try {
    db.prepare("UPDATE users SET subscriptionPlan = ? WHERE id = ?").run(plan, req.user.id);
    scheduleSupabaseSync("subscription_update");
    res.json({ message: "Subscription plan updated successfully" });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/wallet/history", authenticateToken, (req: any, res: any) => {
  try {
    const user = db.prepare("SELECT credits FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    const transactions = db.prepare(
      "SELECT * FROM credit_transactions WHERE userId = ? ORDER BY createdAt DESC"
    ).all(req.user.id);
    res.json({ credits: user.credits, history: transactions });
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

router.get("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const user = db.prepare("SELECT id, name, email, role, isVerified FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (_) { res.status(500).json({ error: "Internal server error" }); }
});

export default router;
