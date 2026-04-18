import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { createReferralWithdrawalRequest, getMyReferralSummary } from "../db/referrals/index.js";
import { scheduleSupabaseSync } from "../db/supabaseMirror.js";

const router = express.Router();

router.get("/me", authenticateToken, (req: any, res) => {
  const summary = getMyReferralSummary(req.user.id);
  if (!summary) {
    return res.status(404).json({ error: "User not found" });
  }

  const appUrl =
    (process.env.APP_URL && process.env.APP_URL.trim()) ||
    `${req.protocol}://${req.get("host")}`;

  const referralLink = summary.referralCode
    ? `${String(appUrl).replace(/\/$/, "")}/register?ref=${encodeURIComponent(summary.referralCode)}`
    : null;

  res.json({ ...summary, referralLink });
});

router.post("/withdraw", authenticateToken, (req: any, res: any) => {
  const rawAmount = req.body?.amount;
  const rawUpiId = req.body?.upiId;

  const amount = typeof rawAmount === "string" ? Number(rawAmount) : Number(rawAmount);
  const upiId = typeof rawUpiId === "string" ? rawUpiId.trim() : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Enter a valid withdrawal amount" });
  }
  if (amount < 10) {
    return res.status(400).json({ error: "Minimum withdrawal is ₹10" });
  }
  if (!upiId || upiId.length < 5 || !upiId.includes("@")) {
    return res.status(400).json({ error: "Enter a valid UPI ID" });
  }

  try {
    const created = createReferralWithdrawalRequest({ userId: req.user.id, amount: Math.floor(amount), upiId });
    scheduleSupabaseSync("referral withdrawal request");
    res.status(201).json({ id: created.id });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to create withdrawal request" });
  }
});

export default router;
