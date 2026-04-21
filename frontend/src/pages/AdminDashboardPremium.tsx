import { useEffect, useState } from "react";
import { BedDouble, CreditCard, Crown, HandCoins, Loader2, ShieldCheck, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { readJson } from "../utils/http";

type DashboardStats = {
  totalUsers?: number;
  totalRooms?: number;
  totalPremiumUsers?: number;
  pendingVerifications?: number;
  pendingCreditPayments?: number;
};



type CreditRequest = {
  id: string;
  userName?: string;
  userEmail?: string;
  packageId?: string;
  amount?: number;
  utrNumber?: string;
  screenshot?: string | null;
  status?: "pending" | "approved" | "rejected";
  createdAt?: string;
};

type ReferralWithdrawal = {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  upiId: string;
  status?: "pending" | "approved" | "rejected" | "paid";
  adminNote?: string | null;
  createdAt?: string;
};

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const statusStyles = {
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  rejected: "bg-rose-50 text-rose-700 border border-rose-100",
  paid: "bg-slate-50 text-slate-700 border border-slate-200",
};

export default function AdminDashboardPremium() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [referralWithdrawals, setReferralWithdrawals] = useState<ReferralWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, creditRes, withdrawalsRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/payments/admin/manual-credit-requests", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/referral-withdrawals", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        setStats(await readJson(statsRes));
      }

      if (creditRes.ok) {
        const data = await readJson<any>(creditRes);
        setCreditRequests(data.requests || []);
      }

      if (withdrawalsRes.ok) {
        const data = await readJson<any>(withdrawalsRes);
        setReferralWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchDashboardData();
      setLoading(false);
    };

    load();
  }, [token]);



  const handleCreditRequestUpdate = async (id: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/payments/admin/manual-credit-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to update credit request", err);
    }
  };

  const handleWithdrawalUpdate = async (id: string, status: "approved" | "rejected" | "paid") => {
    try {
      const res = await fetch(`/api/admin/referral-withdrawals/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to update withdrawal request", err);
    }
  };

  const statCards = [
    {
      name: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      meta: "Registered accounts on the platform",
      iconWrap: "bg-slate-100 text-slate-700",
    },
    {
      name: "Total Rooms",
      value: stats?.totalRooms ?? 0,
      icon: BedDouble,
      meta: "Currently visible room inventory",
      iconWrap: "bg-emerald-100 text-emerald-700",
    },
    {
      name: "Premium Members",
      value: stats?.totalPremiumUsers ?? 0,
      icon: Crown,
      meta: "Users with owner-detail unlock access",
      iconWrap: "bg-amber-100 text-amber-700",
    },
    {
      name: "Pending Verifications",
      value: stats?.pendingVerifications ?? 0,
      icon: ShieldCheck,
      meta: "Profiles waiting for admin review",
      iconWrap: "bg-indigo-100 text-indigo-700",
    },
    {
      name: "Pending Credits",
      value: stats?.pendingCreditPayments ?? 0,
      icon: CreditCard,
      meta: "Manual payments waiting for approval",
      iconWrap: "bg-rose-100 text-rose-700",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.25)] backdrop-blur-xl">
        <Loader2 className="h-12 w-12 animate-spin text-[#8a6431]" />
        <p className="font-medium text-slate-500">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {previewImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.55)]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow transition hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex max-h-[85vh] items-center justify-center overflow-auto rounded-[1.5rem] bg-slate-50 p-4">
              <img src={previewImage} alt="Payment proof" className="max-h-[78vh] w-auto rounded-[1.5rem] object-contain shadow-sm" />
            </div>
          </div>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/35 bg-[linear-gradient(135deg,#16120d_0%,#2a1c11_28%,#8a6431_78%,#f6ead6_140%)] p-6 text-white shadow-[0_35px_120px_-50px_rgba(84,56,21,0.7)] sm:p-8">
        <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-amber-50/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-50/95 backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-[#f4deb1]" />
              Admin command center
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-[#f8e7bf] sm:text-4xl">Platform health with manual credit review at the center.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/85 sm:text-base">
              This dashboard now focuses on active users, inventory quality, verification queues, and manual credit approvals.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-amber-200/25 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">Pending Credits</p>
              <p className="mt-3 text-3xl font-black text-[#f8e7bf]">{creditRequests.filter((item) => item.status === "pending").length}</p>
              <p className="mt-2 text-sm text-amber-50/82">Requests waiting for action</p>
            </div>
            <div className="rounded-[1.5rem] border border-[#f4deb1]/35 bg-[linear-gradient(180deg,rgba(255,248,235,0.18)_0%,rgba(244,222,177,0.12)_100%)] p-5 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f4deb1]">Premium members</p>
              <p className="mt-3 text-3xl font-black text-[#f8e7bf]">{stats?.totalPremiumUsers ?? 0}</p>
              <p className="mt-2 text-sm text-amber-50/88">Accounts with direct contact access</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.95)_0%,rgba(255,249,240,1)_100%)] p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.35)]"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${stat.iconWrap}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">{stat.name}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{stat.value}</p>
                <p className="mt-3 text-sm text-slate-500">{stat.meta}</p>
              </div>
            </div>
          );
        })}
      </section>



      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Manual Credit Requests</h2>
            <p className="mt-1 text-sm text-slate-500">Approve manual UPI payments for credit packages.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-[#8a6431] border border-amber-100">
            <CreditCard className="h-4 w-4" />
            {creditRequests.length} credit requests
          </div>
        </div>
        <div className="luxury-table-wrap">
          <table className="luxury-table min-w-[880px]">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Package</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">UTR / Proof</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creditRequests.map((request) => (
                <tr key={request.id} className="luxury-table-row">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-950">{request.userName}</div>
                    <div className="text-sm text-slate-500">{request.userEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#b48845] uppercase tracking-tight text-xs">{request.packageId?.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-950">{formatCurrency(request.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-mono text-slate-500">{request.utrNumber}</span>
                      {request.screenshot && (
                        <button onClick={() => setPreviewImage(request.screenshot ?? null)} className="text-xs font-bold text-[#b48845] hover:underline">
                          View Screenshot
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusStyles[request.status ?? "pending"]}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreditRequestUpdate(request.id, "approved")}
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleCreditRequestUpdate(request.id, "rejected")}
                          className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {creditRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center font-medium text-slate-400"> No manual credit requests found. </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Referral Withdraw Requests</h2>
            <p className="mt-1 text-sm text-slate-500">Approve/reject withdrawals and mark payments as paid.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            <HandCoins className="h-4 w-4 text-emerald-600" />
            {referralWithdrawals.length} total requests
          </div>
        </div>
        <div className="luxury-table-wrap">
          <table className="luxury-table min-w-[980px]">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">UPI ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {referralWithdrawals.map((request) => (
                <tr key={request.id} className="luxury-table-row">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-950">{request.userName}</div>
                    <div className="text-sm text-slate-500">{request.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{request.upiId}</td>
                  <td className="px-6 py-4 font-bold text-slate-950">{formatCurrency(request.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusStyles[request.status ?? "pending"]}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWithdrawalUpdate(request.id, "approved")}
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleWithdrawalUpdate(request.id, "rejected")}
                          className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </div>
                    ) : request.status === "approved" ? (
                      <button
                        onClick={() => handleWithdrawalUpdate(request.id, "paid")}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {referralWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center font-medium text-slate-400">
                    No referral withdrawal requests found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
