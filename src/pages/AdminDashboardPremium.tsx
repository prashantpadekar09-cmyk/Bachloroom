import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  IndianRupee,
  Loader2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

type DashboardStats = {
  totalUsers?: number;
  totalRooms?: number;
  totalBookings?: number;
  totalCommission?: number;
};

type PaymentSummary = {
  completedVolume?: number;
  pendingVolume?: number;
  ownerSettlements?: number;
};

type Transaction = {
  id: string;
  roomTitle?: string;
  userName?: string;
  ownerName?: string;
  totalAmount?: number;
  platformFee?: number;
  paymentStatus?: "pending" | "completed" | "failed";
  transactionId?: string | null;
  razorpayPaymentId?: string | null;
  paymentScreenshot?: string | null;
};

type PremiumRequest = {
  id: string;
  userName?: string;
  userEmail?: string;
  utrNumber?: string;
  amount?: number;
  screenshot?: string | null;
  status?: "pending" | "approved" | "rejected";
};

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const statusStyles = {
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  rejected: "bg-rose-50 text-rose-700 border border-rose-100",
  failed: "bg-rose-50 text-rose-700 border border-rose-100",
};

const statDecor = [
  {
    iconWrap: "bg-sky-100 text-sky-700 shadow-sky-200/70",
    panel: "bg-[linear-gradient(160deg,rgba(14,165,233,0.14)_0%,rgba(255,255,255,0.95)_42%,rgba(255,255,255,1)_100%)]",
  },
  {
    iconWrap: "bg-emerald-100 text-emerald-700 shadow-emerald-200/70",
    panel: "bg-[linear-gradient(160deg,rgba(16,185,129,0.14)_0%,rgba(255,255,255,0.95)_42%,rgba(255,255,255,1)_100%)]",
  },
  {
    iconWrap: "bg-indigo-100 text-indigo-700 shadow-indigo-200/70",
    panel: "bg-[linear-gradient(160deg,rgba(99,102,241,0.14)_0%,rgba(255,255,255,0.95)_42%,rgba(255,255,255,1)_100%)]",
  },
  {
    iconWrap: "bg-amber-100 text-amber-700 shadow-amber-200/70",
    panel: "bg-[linear-gradient(160deg,rgba(245,158,11,0.14)_0%,rgba(255,255,255,0.95)_42%,rgba(255,255,255,1)_100%)]",
  },
];

export default function AdminDashboardPremium() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [statsRes, paymentsRes, premiumRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/payments/admin-transactions", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/payments/admin/premium-requests", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPaymentSummary(data.summary);
        setTransactions(data.transactions || []);
      }

      if (premiumRes.ok) {
        const data = await premiumRes.json();
        setPremiumRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchDashboardData();
      setLoading(false);
    };

    load();

    const intervalId = window.setInterval(fetchDashboardData, 10000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handlePaymentStatusUpdate = async (id: string, status: "completed" | "failed") => {
    try {
      const token = localStorage.getItem("token");
      const transactionId = status === "completed" ? `MANUAL_OK_${Date.now()}` : null;
      const res = await fetch(`/api/payments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, transactionId }),
      });

      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to update payment", err);
    }
  };

  const handlePremiumRequestUpdate = async (id: string, status: "approved" | "rejected") => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/payments/admin/premium-requests/${id}`, {
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
      console.error("Failed to update premium request", err);
    }
  };

  const statCards = [
    { name: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, trend: "+12%", isUp: true, meta: "Growing renter base" },
    { name: "Total Rooms", value: stats?.totalRooms ?? 0, icon: BedDouble, trend: "+5%", isUp: true, meta: "Verified live inventory" },
    { name: "Total Bookings", value: stats?.totalBookings ?? 0, icon: CalendarDays, trend: "+18%", isUp: true, meta: "Strong booking momentum" },
    { name: "Total Commission", value: formatCurrency(stats?.totalCommission), icon: Wallet, trend: "+24%", isUp: true, meta: "Platform revenue" },
  ];

  const summaryCards = [
    {
      title: "Completed Volume",
      value: formatCurrency(paymentSummary?.completedVolume),
      note: "Payments successfully settled",
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Pending Volume",
      value: formatCurrency(paymentSummary?.pendingVolume),
      note: "Waiting for admin review",
      icon: Clock3,
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      title: "Owner Settlements",
      value: formatCurrency(paymentSummary?.ownerSettlements),
      note: "Owner payout commitments",
      icon: IndianRupee,
      iconClass: "bg-sky-100 text-sky-700",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.25)] backdrop-blur-xl">
        <Loader2 className="h-12 w-12 animate-spin text-sky-600" />
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

      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#60a5fa_100%)] p-6 text-white shadow-[0_35px_120px_-50px_rgba(37,99,235,0.8)] sm:p-8">
        <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              Admin command center
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">A cleaner, sharper control room for platform operations.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-base">
              Track verified growth, review premium requests, and manage bookings with a more polished overview built for daily admin workflows.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-200">Live activity</p>
              <p className="mt-3 text-3xl font-black">{stats?.totalBookings ?? 0}</p>
              <p className="mt-2 text-sm text-slate-100">Bookings currently shaping platform momentum</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-200">Premium requests</p>
              <p className="mt-3 text-3xl font-black">{premiumRequests.filter((item) => item.status === "pending").length}</p>
              <p className="mt-2 text-sm text-slate-100">Awaiting verification and approval</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const decor = statDecor[index];
          return (
            <div
              key={stat.name}
              className={`overflow-hidden rounded-[2rem] border border-white/70 ${decor.panel} p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.35)]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${decor.iconWrap} shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${stat.isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {stat.isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {stat.trend}
                </div>
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

      <section className="grid gap-5 lg:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.25)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">{card.title}</p>
                  <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${card.iconClass}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">{card.note}</p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Premium Payment Requests</h2>
            <p className="mt-1 text-sm text-slate-500">Review user upgrade submissions, screenshots, and UTR details.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            <Crown className="h-4 w-4 text-amber-500" />
            {premiumRequests.length} total requests
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">UTR</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Screenshot</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {premiumRequests.map((request) => (
                <tr key={request.id} className="transition hover:bg-sky-50/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-950">{request.userName}</div>
                    <div className="text-sm text-slate-500">{request.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{request.utrNumber}</td>
                  <td className="px-6 py-4 font-bold text-slate-950">{formatCurrency(request.amount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {request.screenshot ? (
                      <button type="button" onClick={() => setPreviewImage(request.screenshot ?? null)} className="group flex items-center gap-3 text-left">
                        <img
                          src={request.screenshot}
                          alt="Premium payment proof"
                          className="h-12 w-12 rounded-2xl border border-slate-200 object-cover shadow-sm transition group-hover:scale-105"
                        />
                        <span className="font-medium text-sky-700 group-hover:underline">View proof</span>
                      </button>
                    ) : (
                      "No screenshot"
                    )}
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
                          onClick={() => handlePremiumRequestUpdate(request.id, "approved")}
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handlePremiumRequestUpdate(request.id, "rejected")}
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
              {premiumRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center font-medium text-slate-400">
                    No premium payment requests found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Recent Payment Transactions</h2>
            <p className="mt-1 text-sm text-slate-500">Track commissions, booking proofs, and approval decisions in one place.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            <Wallet className="h-4 w-4 text-sky-600" />
            {transactions.length} transactions
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Room</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Tenant</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Owner</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Total</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Commission</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Reference</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Screenshot</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="transition hover:bg-sky-50/40">
                  <td className="px-6 py-4 font-semibold text-slate-950">{tx.roomTitle}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{tx.userName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{tx.ownerName}</td>
                  <td className="px-6 py-4 font-bold text-slate-950">{formatCurrency(tx.totalAmount)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-amber-700">{formatCurrency(tx.platformFee)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusStyles[tx.paymentStatus ?? "pending"]}`}>
                      {tx.paymentStatus === "pending" ? "Under Review" : tx.paymentStatus === "completed" ? "Confirmed" : "Rejected"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">{tx.transactionId || tx.razorpayPaymentId || "---"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {tx.paymentScreenshot ? (
                      <button type="button" onClick={() => setPreviewImage(tx.paymentScreenshot ?? null)} className="group flex items-center gap-3 text-left">
                        <img
                          src={tx.paymentScreenshot}
                          alt="Booking payment proof"
                          className="h-12 w-12 rounded-2xl border border-slate-200 object-cover shadow-sm transition group-hover:scale-105"
                        />
                        <span className="font-medium text-sky-700 group-hover:underline">View proof</span>
                      </button>
                    ) : (
                      "No screenshot"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {tx.paymentStatus === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaymentStatusUpdate(tx.id, "completed")}
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handlePaymentStatusUpdate(tx.id, "failed")}
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center font-medium text-slate-400">
                    No payment transactions found.
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
