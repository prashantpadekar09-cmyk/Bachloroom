import { useState, useEffect } from "react";
import { Users, BedDouble, CalendarDays, Loader2, ArrowUpRight, ArrowDownRight, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, paymentsRes, premiumRes] = await Promise.all([
        fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/payments/admin-transactions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/payments/admin/premium-requests", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
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

    const intervalId = window.setInterval(() => {
      fetchDashboardData();
    }, 10000);

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
      const transactionId = status === "completed" ? `MANUAL_OK_${Date.now()}` : null;
      const res = await fetch(`/api/payments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, transactionId }),
      });

      if (!res.ok) {
        return;
      }

      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to update payment", err);
    }
  };

  const handlePremiumRequestUpdate = async (id: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/payments/admin/premium-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        return;
      }

      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to update premium request", err);
    }
  };

  const statCards = [
    { 
      name: "Total Users", 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: "blue",
      trend: "+12%",
      isUp: true 
    },
    { 
      name: "Total Rooms", 
      value: stats?.totalRooms || 0, 
      icon: BedDouble, 
      color: "emerald",
      trend: "+5%",
      isUp: true 
    },
    { 
      name: "Total Bookings", 
      value: stats?.totalBookings || 0, 
      icon: CalendarDays, 
      color: "indigo",
      trend: "+18%",
      isUp: true 
    },
    { 
      name: "Total Commission", 
      value: `₹${stats?.totalCommission || 0}`, 
      icon: ArrowUpRight, 
      color: "amber",
      trend: "+24%",
      isUp: true 
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white p-4 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 shadow transition-colors hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex max-h-[85vh] items-center justify-center overflow-auto rounded-2xl bg-gray-50 p-4">
              <img src={previewImage} alt="Payment proof" className="max-h-[78vh] w-auto rounded-2xl object-contain shadow-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stat.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {stat.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.trend}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.name}</h3>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Volume</h3>
          <p className="text-3xl font-black text-gray-900">₹{paymentSummary?.completedVolume || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Volume</h3>
          <p className="text-3xl font-black text-gray-900">₹{paymentSummary?.pendingVolume || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Owner Settlements</h3>
          <p className="text-3xl font-black text-gray-900">₹{paymentSummary?.ownerSettlements || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Premium Payment Requests</h2>
        </div>
        <div className="luxury-table-wrap">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">UTR</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Screenshot</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {premiumRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{request.userName}</div>
                    <div className="text-sm text-gray-500">{request.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{request.utrNumber}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">Rs. {request.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {request.screenshot ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(request.screenshot)}
                        className="group flex items-center gap-3 text-left"
                      >
                        <img
                          src={request.screenshot}
                          alt="Premium payment proof"
                          className="h-12 w-12 rounded-xl border border-gray-200 object-cover shadow-sm transition-transform group-hover:scale-105"
                        />
                        <span className="text-blue-600 hover:underline">View proof</span>
                      </button>
                    ) : (
                      "No screenshot"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold capitalize text-gray-700">{request.status}</td>
                  <td className="px-6 py-4">
                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePremiumRequestUpdate(request.id, "approved")}
                          className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handlePremiumRequestUpdate(request.id, "rejected")}
                          className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-gray-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {premiumRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    No premium payment requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Recent Payment Transactions</h2>
        </div>
        <div className="luxury-table-wrap">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Room</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tenant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Commission</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reference</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Screenshot</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{tx.roomTitle}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tx.userName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tx.ownerName}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">₹{tx.totalAmount}</td>
                  <td className="px-6 py-4 text-sm text-amber-600">₹{tx.platformFee}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                    {tx.paymentStatus === "pending" ? "Under Review" : tx.paymentStatus === "completed" ? "Confirmed" : "Rejected"}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-400">{tx.transactionId || tx.razorpayPaymentId || "---"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tx.paymentScreenshot ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(tx.paymentScreenshot)}
                        className="group flex items-center gap-3 text-left"
                      >
                        <img
                          src={tx.paymentScreenshot}
                          alt="Booking payment proof"
                          className="h-12 w-12 rounded-xl border border-gray-200 object-cover shadow-sm transition-transform group-hover:scale-105"
                        />
                        <span className="text-blue-600 hover:underline">View proof</span>
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
                          className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handlePaymentStatusUpdate(tx.id, "failed")}
                          className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-gray-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 font-medium">No payment transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
