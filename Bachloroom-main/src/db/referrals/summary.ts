import { db } from "../setup.js";

export function getMyReferralSummary(userId: string) {
  const user = db
    .prepare(
      `
        SELECT id, referralCode, referredById, referralBalance, referralEarnings
        FROM users
        WHERE id = ?
      `
    )
    .get(userId) as
    | {
        id: string;
        referralCode?: string | null;
        referredById?: string | null;
        referralBalance?: number | null;
        referralEarnings?: number | null;
      }
    | undefined;

  if (!user) {
    return null;
  }

  const transactions = db
    .prepare(
      `
        SELECT id, refereeId, type, amount, roomId, createdAt
        FROM referral_transactions
        WHERE referrerId = ?
        ORDER BY createdAt DESC
        LIMIT 50
      `
    )
    .all(userId) as Array<{
    id: string;
    refereeId: string;
    type: string;
    amount: number;
    roomId?: string | null;
    createdAt: string;
  }>;

  const referredCountRow = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE referredById = ?")
    .get(userId) as { count?: number } | undefined;

  const withdrawals = db
    .prepare(
      `
        SELECT id, amount, upiId, status, adminNote, reviewedAt, paidAt, createdAt
        FROM referral_withdrawals
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT 20
      `
    )
    .all(userId) as Array<{
    id: string;
    amount: number;
    upiId: string;
    status: "pending" | "approved" | "rejected" | "paid" | string;
    adminNote?: string | null;
    reviewedAt?: string | null;
    paidAt?: string | null;
    createdAt: string;
  }>;

  return {
    referralCode: user.referralCode ?? null,
    referredById: user.referredById ?? null,
    balance: Number(user.referralBalance ?? 0),
    totalEarned: Number(user.referralEarnings ?? 0),
    referredCount: Number(referredCountRow?.count ?? 0),
    transactions,
    withdrawals,
  };
}

