import { useState, useEffect } from "react";
import { Wallet, CheckCircle, XCircle, Clock, Loader2, ArrowUpRight, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AdminPageHero, AdminSurface } from "../components/admin/AdminTheme";

const DEFAULT_OWNER_UPI = "prashantpadekar09@oksbi";

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/payments/all-payouts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayouts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    const transactionId = status === "completed" ? `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null;
    try {
      const res = await fetch(`/api/payments/payouts/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, transactionId }),
      });
      if (res.ok) {
        setPayouts(payouts.map(p => p.id === id ? { ...p, status, transactionId } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDisplayUpi = (upiId?: string | null) => {
    const trimmedUpi = (upiId || "").trim();
    if (!trimmedUpi || trimmedUpi.toLowerCase() === DEFAULT_OWNER_UPI) {
      return "";
    }
    return trimmedUpi;
  };

  const filteredPayouts = payouts.filter(p => 
    p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getDisplayUpi(p.upiId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Loading payout requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Finance Ops"
        title="Payout Management"
        description="Review owner withdrawal requests and process settlements from one premium finance panel."
        badge={`${filteredPayouts.length} requests`}
      >
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/65" />
          <input
            type="text"
            placeholder="Search by owner name or ID..."
            className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-12 pr-4 text-white placeholder:text-white/60 outline-none backdrop-blur-md transition focus:border-white/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </AdminPageHero>

      <AdminSurface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Owner</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">UPI ID</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayouts.map((payout) => (
                <tr key={payout.id} className="group transition-colors hover:bg-sky-50/40">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {payout.ownerName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{payout.ownerName}</p>
                        <p className="text-xs text-gray-400 font-medium">ID: {payout.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-lg font-black text-gray-900">₹{payout.amount}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="inline-block break-all rounded-lg bg-blue-50 px-2 py-1 text-sm font-mono font-bold text-blue-600">
                      {getDisplayUpi(payout.upiId) || "N/A"}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                      payout.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      payout.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {payout.status === 'pending' && <Clock className="h-3.5 w-3.5" />}
                      {payout.status === 'completed' && <CheckCircle className="h-3.5 w-3.5" />}
                      {payout.status === 'failed' && <XCircle className="h-3.5 w-3.5" />}
                      {payout.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    {payout.status === 'pending' ? (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStatusUpdate(payout.id, 'completed')}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                          title="Approve & Mark Paid"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(payout.id, 'failed')}
                          className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                          title="Reject Request"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Processed</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Wallet className="h-12 w-12 text-gray-200" />
                      <p className="text-gray-400 font-bold">No payout requests found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSurface>
    </div>
  );
}
