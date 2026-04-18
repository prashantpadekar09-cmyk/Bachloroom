import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Gift } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { readJson } from "../../utils/http";

type ReferralSummary = {
  referralCode: string | null;
  referralLink: string | null;
  balance: number;
  totalEarned: number;
  referredCount: number;
  withdrawals?: Array<{
    id: string;
    amount: number;
    upiId: string;
    status: string;
    adminNote?: string | null;
    createdAt: string;
  }>;
};

export default function ReferralCard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpiId, setWithdrawUpiId] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setSummary(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/referrals/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson<any>(res);
      if (!res.ok) throw new Error(data?.error || "Failed to load referrals");

      setSummary({
        referralCode: data.referralCode ?? null,
        referralLink: data.referralLink ?? null,
        balance: Number(data.balance ?? 0),
        totalEarned: Number(data.totalEarned ?? 0),
        referredCount: Number(data.referredCount ?? 0),
        withdrawals: Array.isArray(data.withdrawals) ? data.withdrawals : [],
      });
    } catch (error: any) {
      setSummary(null);
      setMessage(error?.message || "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const shareText = useMemo(() => {
    if (!summary?.referralLink) return "";
    return `Join Bacheloroom using my referral link: ${summary.referralLink}`;
  }, [summary?.referralLink]);

  const handleCopy = async () => {
    const text = shareText || summary?.referralCode || "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied!");
      window.setTimeout(() => setMessage(""), 1600);
    } catch {
      window.prompt("Copy your referral info:", text);
    }
  };

  const handleWithdraw = async () => {
    if (!token) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid withdrawal amount.");
      return;
    }
    if (amount < 10) {
      setMessage("Minimum withdrawal is ₹10.");
      return;
    }
    if (!withdrawUpiId.trim() || !withdrawUpiId.includes("@")) {
      setMessage("Enter a valid UPI ID.");
      return;
    }

    setWithdrawing(true);
    setMessage("");
    try {
      const res = await fetch("/api/referrals/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Math.floor(amount),
          upiId: withdrawUpiId.trim(),
        }),
      });
      const data = await readJson<any>(res);
      if (!res.ok) throw new Error(data?.error || "Withdrawal failed");

      setWithdrawAmount("");
      setMessage("Withdrawal request submitted.");
      await fetchSummary();
    } catch (error: any) {
      setMessage(error?.message || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
      window.setTimeout(() => setMessage(""), 2200);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#8a6431]">
            <Gift className="h-4 w-4" />
            Referrals
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Earn rewards by inviting users and owners.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            You earn ₹10 when a referred user unlocks an owner contact (premium reveal), and ₹15 when a referred owner lists their first room.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!summary?.referralCode}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Your Code</p>
          <p className="mt-3 text-2xl font-black text-slate-900">{loading ? "..." : summary?.referralCode || "—"}</p>
        </div>
        <div className="rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Balance</p>
          <p className="mt-3 text-2xl font-black text-slate-900">{loading ? "..." : `₹${summary?.balance ?? 0}`}</p>
        </div>
        <div className="rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">People Referred</p>
          <p className="mt-3 text-2xl font-black text-slate-900">{loading ? "..." : summary?.referredCount ?? 0}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Withdraw Referral Amount</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="number"
            min={10}
            step={1}
            className="ui-input"
            placeholder="Amount (₹)"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <input
            type="text"
            className="ui-input"
            placeholder="UPI ID (e.g. name@bank)"
            value={withdrawUpiId}
            onChange={(e) => setWithdrawUpiId(e.target.value)}
          />
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing || loading || !summary?.referralCode}
            className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {withdrawing ? "Submitting..." : "Request Withdraw"}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">Admin will review and send payment manually after approval.</p>
      </div>

      {summary?.withdrawals && summary.withdrawals.length > 0 ? (
        <div className="rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Recent Withdrawals</p>
          <div className="mt-4 space-y-3">
            {summary.withdrawals.slice(0, 6).map((w) => (
              <div
                key={w.id}
                className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    ₹{w.amount} • {w.upiId}
                  </div>
                  {w.adminNote ? <div className="text-sm text-slate-500">{w.adminNote}</div> : null}
                </div>
                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold capitalize text-slate-600">
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-amber-100/70 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-[#8a6431]">
          {message}
        </div>
      ) : null}
    </div>
  );
}

