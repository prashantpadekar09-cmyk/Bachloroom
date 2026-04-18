import crypto from "crypto";
import { db } from "../setup.js";

export function createReferralWithdrawalRequest(params: { userId: string; amount: number; upiId: string }) {
  const run = db.transaction(() => {
    const user = db
      .prepare("SELECT id, referralBalance FROM users WHERE id = ?")
      .get(params.userId) as { id: string; referralBalance?: number | null } | undefined;

    if (!user) {
      throw new Error("User not found");
    }

    const balance = Number(user.referralBalance ?? 0);
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error("Invalid withdrawal amount");
    }
    if (params.amount > balance) {
      throw new Error("Insufficient referral balance");
    }

    const id = crypto.randomUUID();
    db.prepare(
      `
        INSERT INTO referral_withdrawals (id, userId, amount, upiId, status)
        VALUES (?, ?, ?, ?, 'pending')
      `
    ).run(id, params.userId, params.amount, params.upiId.trim());

    db.prepare("UPDATE users SET referralBalance = COALESCE(referralBalance, 0) - ? WHERE id = ?").run(
      params.amount,
      params.userId
    );

    return { id };
  });

  return run();
}

export function listReferralWithdrawalsForAdmin(params?: { status?: string }) {
  const status = params?.status?.trim();
  const where = status ? "WHERE w.status = ?" : "";
  const args = status ? [status] : [];

  const rows = db
    .prepare(
      `
        SELECT
          w.id,
          w.userId,
          w.amount,
          w.upiId,
          w.status,
          w.adminNote,
          w.reviewedBy,
          w.reviewedAt,
          w.paidAt,
          w.createdAt,
          u.name as userName,
          u.email as userEmail
        FROM referral_withdrawals w
        JOIN users u ON u.id = w.userId
        ${where}
        ORDER BY
          CASE w.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'paid' THEN 2 ELSE 3 END,
          w.createdAt DESC
        LIMIT 200
      `
    )
    .all(...args) as Array<Record<string, unknown>>;

  return rows;
}

export function updateReferralWithdrawalStatus(params: {
  id: string;
  status: "approved" | "rejected" | "paid";
  adminId: string;
  adminNote?: string | null;
}) {
  const run = db.transaction(() => {
    const withdrawal = db
      .prepare("SELECT id, userId, amount, status FROM referral_withdrawals WHERE id = ?")
      .get(params.id) as { id: string; userId: string; amount: number; status: string } | undefined;

    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status === params.status) {
      return { updated: true as const };
    }

    if (withdrawal.status !== "pending" && params.status !== "paid") {
      throw new Error("Only pending withdrawals can be approved/rejected");
    }

    if (params.status === "rejected" && withdrawal.status === "pending") {
      db.prepare("UPDATE users SET referralBalance = COALESCE(referralBalance, 0) + ? WHERE id = ?").run(
        withdrawal.amount,
        withdrawal.userId
      );
    }

    if (params.status === "paid" && withdrawal.status !== "approved" && withdrawal.status !== "paid") {
      throw new Error("Only approved withdrawals can be marked paid");
    }

    const note = typeof params.adminNote === "string" ? params.adminNote : null;

    if (params.status === "paid") {
      db.prepare(
        `
          UPDATE referral_withdrawals
          SET status = ?, adminNote = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP, paidAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      ).run(params.status, note, params.adminId, params.id);
    } else {
      db.prepare(
        `
          UPDATE referral_withdrawals
          SET status = ?, adminNote = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      ).run(params.status, note, params.adminId, params.id);
    }

    return { updated: true as const };
  });

  return run();
}

