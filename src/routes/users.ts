import express from "express";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.put("/subscription", authenticateToken, (req: any, res: any) => {
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: "Plan is required" });

  try {
    const stmt = db.prepare("UPDATE users SET subscriptionPlan = ? WHERE id = ?");
    stmt.run(plan, req.user.id);
    res.json({ message: "Subscription plan updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticateToken, (req: any, res: any) => {
  try {
    const stmt = db.prepare("SELECT id, name, email, role, isVerified FROM users WHERE id = ?");
    const user = stmt.get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
