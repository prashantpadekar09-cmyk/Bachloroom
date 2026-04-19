import crypto from "crypto";
import { db } from "../setup.js";
import type { AwardResult, ReferralRewardType } from "./constants.js";

export function awardReferralReward(params: {
  refereeId: string;
  type: ReferralRewardType;
  amount: number;
  roomId?: string | null;
}): AwardResult {
  const referee = db
    .prepare("SELECT id, referredById FROM users WHERE id = ?")
    .get(params.refereeId) as { id: string; referredById?: string | null } | undefined;

  const referrerId = referee?.referredById?.trim();
  if (!referrerId) return { awarded: false, reason: "no-referrer" };

  const referrerExists = db.prepare("SELECT id FROM users WHERE id = ?").get(referrerId) as { id: string } | undefined;
  if (!referrerExists) return { awarded: false, reason: "invalid-referrer" };

  const run = db.transaction((): AwardResult => {
    const existing = db
      .prepare("SELECT id FROM referral_transactions WHERE refereeId = ? AND type = ? LIMIT 1")
      .get(params.refereeId, params.type) as { id: string } | undefined;

    if (existing) return { awarded: false, reason: "already-awarded" };

    db.prepare(`
      INSERT INTO referral_transactions (id, referrerId, refereeId, type, amount, roomId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), referrerId, params.refereeId, params.type, params.amount, params.roomId ?? null);

    db.prepare(`
      UPDATE users
      SET referralBalance = COALESCE(referralBalance, 0) + ?,
          referralEarnings = COALESCE(referralEarnings, 0) + ?
      WHERE id = ?
    `).run(params.amount, params.amount, referrerId);

    return { awarded: true, amount: params.amount, referrerId };
  });

  return run();
}
