import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Plus, CheckCircle, XCircle, Clock, MapPin, Wallet, TrendingUp, History, Crown, MessageSquare } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import {
  DashboardHero,
  DashboardLoading,
  DashboardShell,
  DashboardSurface,
  DashboardToast,
} from "../components/dashboard/DashboardTheme";

export default function OwnerDashboard() {
  const { user, token, updateUser } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [rentPayments, setRentPayments] = useState<any[]>([]);
  const [premiumStatus, setPremiumStatus] = useState<{ isPremium: boolean; payment: any | null } | null>(null);
  const [adminContact, setAdminContact] = useState<{ id: string; name: string; role: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayoutRequesting, setIsPayoutRequesting] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutUpi, setPayoutUpi] = useState("");
  const [supportQueryText, setSupportQueryText] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const addRoomFormRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const canPromoteRooms = user?.role === "admin" || Boolean(premiumStatus?.isPremium);

  const parseImageInput = (value: string) => {
    const input = value.trim();
    if (!input) {
      return [];
    }

    const matches = input.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+|https?:\/\/[^,\s]+/g);
    if (matches?.length) {
      return matches.map((item) => item.trim()).filter(Boolean);
    }

    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const [newRoom, setNewRoom] = useState({
    title: "",
    description: "",
    price: "",
    deposit: "",
    location: "",
    city: "",
    type: "Single Room",
    amenities: "",
    imageUrl1: "",
    imageUrl2: "",
    imageUrl3: "",
    uploadedImages: [] as string[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, roomsRes, earningsRes, payoutsRes, rentPaymentsRes, premiumStatusRes, adminContactRes] = await Promise.all([
          fetch("/api/bookings/owner-bookings", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/rooms`),
          fetch("/api/payments/owner-earnings", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/payments/owner-payouts", {
            headers: { Authorization: `Bearer ${token}` },
          })
          ,
          fetch("/api/payments/rent/owner", {
            headers: { Authorization: `Bearer ${token}` },
          })
          ,
          fetch("/api/payments/premium/status", {
            headers: { Authorization: `Bearer ${token}` },
          })
          ,
          fetch("/api/chat/admin-contact", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings || []);
        }
        if (roomsRes.ok) {
          const data = await roomsRes.json();
          if (user?.role === "admin") {
            setMyRooms(data.rooms || []);
          } else {
            setMyRooms(data.rooms.filter((r: any) => r.ownerId === user?.id) || []);
          }
        }
        if (earningsRes.ok) {
          const data = await earningsRes.json();
          setEarnings(data.earnings);
          setTransactions(data.transactions || []);
        }
        if (payoutsRes.ok) {
          const data = await payoutsRes.json();
          setPayouts(data || []);
        }
        if (rentPaymentsRes.ok) {
          const data = await rentPaymentsRes.json();
          setRentPayments(data.payments || []);
        }
        if (premiumStatusRes.ok) {
          const data = await premiumStatusRes.json();
          setPremiumStatus({ isPremium: Boolean(data.isPremium), payment: data.payment || null });
          updateUser({
            isPremium: Boolean(data.isPremium),
            subscriptionPlan: data.isPremium ? "premium" : user?.subscriptionPlan,
          });
        }
        if (adminContactRes.ok) {
          const data = await adminContactRes.json();
          setAdminContact(data.user || null);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    if (token && user) fetchData();
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (!token) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/chat/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!showAddRoom) {
      return;
    }

    addRoomFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showAddRoom]);

  const handlePromote = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/promote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMyRooms(myRooms.map(r => r.id === roomId ? { ...r, isFeatured: 1 } : r));
        showToast("Room promoted successfully! It will now appear as Featured.", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to promote room.", "error");
      }
    } catch (err) {
      console.error("Failed to promote room", err);
      showToast("An error occurred while promoting the room.", "error");
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings(bookings.map((b) => (b.id === id ? { ...b, status } : b)));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const amenitiesArray = newRoom.amenities.split(",").map((a) => a.trim()).filter(Boolean);
      const imagesArray = [
        ...parseImageInput(newRoom.imageUrl1),
        ...parseImageInput(newRoom.imageUrl2),
        ...parseImageInput(newRoom.imageUrl3),
        ...newRoom.uploadedImages,
      ].filter(Boolean);
      
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newRoom,
          price: parseInt(newRoom.price),
          deposit: parseInt(newRoom.deposit),
          amenities: amenitiesArray,
          images: imagesArray,
          lat: null,
          lng: null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Add the new room to the state immediately
        const addedRoom = {
          ...newRoom,
          id: data.id,
          price: parseInt(newRoom.price),
          deposit: parseInt(newRoom.deposit),
          amenities: amenitiesArray,
          images: imagesArray,
            lat: null,
            lng: null,
          ownerId: user?.id,
          isFeatured: 0,
          createdAt: new Date().toISOString()
        };
        setMyRooms([addedRoom, ...myRooms]);
        
        setShowAddRoom(false);
        setNewRoom({
          title: "",
          description: "",
          price: "",
          deposit: "",
          location: "",
          city: "",
          type: "Single Room",
          amenities: "",
          imageUrl1: "",
          imageUrl2: "",
          imageUrl3: "",
          uploadedImages: [],
        });
        showToast("Room added successfully!", "success");
      } else {
        showToast("Failed to add room.", "error");
      }
    } catch (err) {
      console.error("Failed to add room", err);
      showToast("An error occurred while adding the room.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPayoutRequesting) return;
    const trimmedUpiId = payoutUpi.trim();
    if (!trimmedUpiId) {
      showToast("Please enter your UPI ID for payout.", "error");
      return;
    }
    setIsPayoutRequesting(true);
    try {
      const res = await fetch("/api/payments/request-payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount: parseFloat(payoutAmount),
          upiId: trimmedUpiId
        }),
      });
      if (res.ok) {
        showToast("Payout requested successfully!", "success");
        setPayoutAmount("");
        setPayoutUpi("");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to request payout.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error requesting payout.", "error");
    } finally {
      setIsPayoutRequesting(false);
    }
  };

  const handleVerifyRentPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/rent/${paymentId}/verify`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        showToast("Failed to verify rent payment.", "error");
        return;
      }

      setRentPayments((current) =>
        current.map((payment) => (payment.id === paymentId ? { ...payment, status: "verified" } : payment))
      );
      setBookings((current) =>
        current.map((booking) =>
          rentPayments.find((payment) => payment.id === paymentId)?.bookingId === booking.id
            ? { ...booking, status: "paid" }
            : booking
        )
      );
      showToast("Rent payment verified successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to verify rent payment.", "error");
    }
  };

  const handleSubmitSupportQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportQueryText.trim()) return;

    try {
      setSupportSubmitting(true);
      setSupportMessage("");
      const res = await fetch("/api/support/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: supportQueryText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit query");
      }
      setSupportQueryText("");
      setSupportMessage("Query submitted. You can track replies in Support.");
    } catch (err: any) {
      setSupportMessage(err?.message || "Failed to submit query.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading your owner dashboard..." />;
  }

  return (
    <DashboardShell>
      <div className="space-y-8 pb-10">
      {toast && <DashboardToast message={toast.message} type={toast.type} />}
      <DashboardHero
        eyebrow="Owner Dashboard"
        title="Manage listings, payouts, and booking approvals with confidence."
        description="This owner workspace keeps your rooms, premium status, rent verification, and support communication in one polished control center."
        badge={premiumStatus?.isPremium ? "Premium owner" : "Free owner plan"}
        actions={
          <>
            <Link
              to="/support"
              className="inline-flex items-center justify-center rounded-2xl border border-white/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
            >
              Open Support
            </Link>
            <button
              onClick={() => setShowAddRoom(!showAddRoom)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-5 w-5" />
              {showAddRoom ? "Hide Form" : "Add New Room"}
            </button>
          </>
        }
      />

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Total Earnings</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Net Income</h3>
          <p className="text-3xl font-black text-gray-900">₹{earnings?.totalEarnings || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Total Bookings</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Stays</h3>
          <p className="text-3xl font-black text-gray-900">{earnings?.totalBookings || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <History className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Recent Transactions</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">All Transactions</h3>
          <p className="text-3xl font-black text-gray-900">{transactions.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">Total Rooms</span>
          </div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Listed Properties</h3>
          <p className="text-3xl font-black text-gray-900">{myRooms.length}</p>
        </div>
      </div>

      <DashboardSurface className="mb-8 overflow-hidden border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white">
              <Crown className="mr-2 h-4 w-4 text-amber-300" />
              Owner premium
            </div>
            <h2 className="mt-4 text-2xl font-black text-gray-900">Use the same manual payment flow to unlock owner premium.</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Pay Rs. 99, submit the UTR, and once admin approves it your owner account gets premium access. That helps with premium-only actions like promoting rooms.
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm lg:min-w-[300px]">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Current Status</p>
            <p className="mt-2 text-2xl font-black text-gray-900">
              {premiumStatus?.isPremium ? "Premium Active" : premiumStatus?.payment?.status === "pending" ? "Pending Approval" : "Free Plan"}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {premiumStatus?.isPremium
                ? "Your owner account can use premium-only features."
                : premiumStatus?.payment?.status === "pending"
                  ? `Last submitted UTR: ${premiumStatus.payment.utrNumber}`
                  : "Upgrade to premium to unlock manual premium benefits for owners too."}
            </p>
            <Link
              to="/premium-payment?redirect=/owner-dashboard"
              className="mt-5 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-amber-700"
            >
              {premiumStatus?.isPremium ? "Open Premium Page" : "Upgrade Owner Account"}
            </Link>
          </div>
        </div>
      </DashboardSurface>

      <DashboardSurface className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Payout</h2>
        <form onSubmit={handleRequestPayout} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw</label>
              <input
                type="number"
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID for Payout</label>
              <input
                type="text"
                placeholder="e.g. name@upi"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={payoutUpi}
                onChange={(e) => setPayoutUpi(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPayoutRequesting}
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isPayoutRequesting ? "Requesting..." : "Request Payout"}
          </button>
        </form>
      </DashboardSurface>

      {false && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Gross Collected</h3>
          <p className="text-3xl font-black text-gray-900">₹{earnings?.totalCollected || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Platform Commission</h3>
          <p className="text-3xl font-black text-gray-900">₹{earnings?.totalCommission || 0}</p>
        </div>
      </div>
      )}

      {/* Payout History Section */}
      {false && (
      <div className="dashboard-panel mb-8 overflow-hidden p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600">Cashflow</p>
            <h2 className="text-2xl font-black text-gray-900">Payout History</h2>
          </div>
          <p className="text-sm font-medium text-gray-500">Review every payout request and payment reference from one table.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Net Amount</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="py-4 font-bold text-gray-900">₹{payout.amount}</td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                      payout.status === 'completed' ? 'bg-green-50 text-green-600' :
                      payout.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {payout.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-sm font-mono text-gray-400">
                    {payout.transactionId || '---'}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 italic">No payout history found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Room</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-4 font-medium text-gray-900">{tx.roomTitle}</td>
                  <td className="py-4 text-sm text-gray-500">{tx.userName}</td>
                  <td className="py-4 font-bold text-emerald-600">₹{tx.ownerAmount}</td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                      tx.paymentStatus === 'completed' ? 'bg-green-50 text-green-600' :
                      tx.paymentStatus === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {tx.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {false && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Payment Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Room</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tenant</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Gross</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Commission</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Owner Net</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Booking</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Reference</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <tr key={`ledger-${tx.id}`}>
                  <td className="py-4 font-medium text-gray-900">{tx.roomTitle}</td>
                  <td className="py-4 text-sm text-gray-500">
                    <div className="font-medium text-gray-900">{tx.userName}</div>
                    <div>{tx.userEmail}</div>
                  </td>
                  <td className="py-4 font-bold text-gray-900">₹{tx.totalAmount}</td>
                  <td className="py-4 text-sm text-amber-600">₹{tx.platformFee}</td>
                  <td className="py-4 font-bold text-emerald-600">₹{tx.ownerAmount}</td>
                  <td className="py-4 text-sm text-gray-500">{tx.bookingStatus || "confirmed"}</td>
                  <td className="py-4 text-sm font-mono text-gray-400">{tx.transactionId || tx.razorpayPaymentId || "---"}</td>
                  <td className="py-4 text-sm text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 italic">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Payout History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payout History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="py-4 font-bold text-gray-900">₹{payout.amount}</td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                      payout.status === 'completed' ? 'bg-green-50 text-green-600' :
                      payout.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {payout.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date(payout.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-sm font-mono text-gray-400">
                    {payout.transactionId || '---'}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 italic">No payout history found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Status</h2>
        <p className="text-sm text-gray-500 mb-4">
          Uploading your Aadhaar photo is mandatory for verification to build trust.
        </p>
        {user?.isVerified ? (
          <div className="flex items-center text-green-600 bg-green-50 p-4 rounded-lg">
            <CheckCircle className="h-6 w-6 mr-2" />
            <span className="font-medium">Your account is verified.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              {user?.idDocument ? "Your Aadhaar photo is pending admin approval." : "Please upload your Aadhaar photo to get verified."}
            </p>
            {!user?.idDocument && (
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <span className="text-gray-600">Select Aadhaar (PNG/PDF)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        try {
                          const res = await fetch("/api/auth/upload-document", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ idDocument: base64 }),
                          });
                          if (res.ok) {
                            showToast("Aadhaar photo uploaded successfully!", "success");
                            updateUser({ idDocument: base64, isVerified: false });
                          } else {
                            showToast("Failed to upload Aadhaar photo.", "error");
                          }
                        } catch (err) {
                          console.error(err);
                          showToast("Error uploading Aadhaar photo.", "error");
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddRoom && (
        <div ref={addRoomFormRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Room</h2>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.title}
                  onChange={(e) => setNewRoom({ ...newRoom, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.type}
                  onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                >
                  <option value="Single Room">Single Room</option>
                  <option value="Shared Room">Shared Room</option>
                  <option value="PG Accommodation">PG Accommodation</option>
                  <option value="Hostel">Hostel</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (per month)</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.price}
                  onChange={(e) => setNewRoom({ ...newRoom, price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.deposit}
                  onChange={(e) => setNewRoom({ ...newRoom, deposit: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (Area)</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.location}
                  onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.city}
                  onChange={(e) => setNewRoom({ ...newRoom, city: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma separated)</label>
                <input
                  type="text"
                  required
                  placeholder="WiFi, AC, Kitchen, Parking"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newRoom.amenities}
                  onChange={(e) => setNewRoom({ ...newRoom, amenities: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Images</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    required
                    placeholder="Image URL 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newRoom.imageUrl1}
                    onChange={(e) => setNewRoom({ ...newRoom, imageUrl1: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Image URL 2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newRoom.imageUrl2}
                    onChange={(e) => setNewRoom({ ...newRoom, imageUrl2: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Image URL 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newRoom.imageUrl3}
                    onChange={(e) => setNewRoom({ ...newRoom, imageUrl3: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors flex items-center whitespace-nowrap">
                    <span>Upload & Verify AI</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          try {
                            showToast("Analyzing image with AI...", "info");
                            
                            // Extract base64 data
                            const base64Data = base64.split(',')[1];
                            const mimeType = base64.split(';')[0].split(':')[1];
                            
                            const geminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
                            if (!geminiKey) { showToast('AI image verification requires a Gemini API key.', 'error'); return; }
                            const ai = new GoogleGenAI({ apiKey: geminiKey });
                            const prompt = "Analyze this image. Is it a real photo of a room/apartment, or does it look like an AI-generated fake image? Respond with JSON: { \"isFake\": boolean, \"reason\": \"brief explanation\" }";
                            
                            const response = await ai.models.generateContent({
                              model: "gemini-2.0-flash",
                              contents: [
                                { text: prompt },
                                {
                                  inlineData: {
                                    data: base64Data,
                                    mimeType: mimeType
                                  }
                                }
                              ],
                              config: {
                                responseMimeType: "application/json",
                              }
                            });
                            
                            const data = JSON.parse(response.text || "{}");
                            
                            if (data.isFake) {
                              showToast(`AI Detection: This image appears to be fake/AI-generated. Reason: ${data.reason}`, "error");
                            } else {
                              showToast("AI Detection: Image looks authentic!", "success");
                              setNewRoom(prev => ({
                                ...prev,
                                uploadedImages: [...prev.uploadedImages, base64]
                              }));
                            }
                          } catch (err) {
                            console.error(err);
                            showToast("Error analyzing image.", "error");
                          }
                        };
                        reader.readAsDataURL(file);
                      }} 
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    {newRoom.uploadedImages.length} uploaded photo{newRoom.uploadedImages.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Add up to 3 image URLs here, or upload photos after AI verification.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={() => setShowAddRoom(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Saving...' : 'Save Room'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 mt-12 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-600">Portfolio</p>
          <h2 className="text-3xl font-black text-gray-900">My Rooms</h2>
        </div>
        <p className="text-sm font-medium text-gray-500">Your active room inventory, ready to manage and promote.</p>
      </div>
      {myRooms.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center border border-gray-100">
          <p className="text-gray-500">You haven't added any rooms yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {myRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
              <div className="relative h-48">
                <img
                  src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                  alt={room.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {room.isFeatured ? (
                  <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow">
                    Featured
                  </div>
                ) : null}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">{room.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{room.location}, {room.city}</p>
                <div className="mt-auto flex space-x-2">
                  <Link
                    to={`/rooms/${room.id}`}
                    className="flex-1 text-center bg-gray-50 hover:bg-gray-100 text-gray-900 font-medium py-2 rounded-lg transition-colors border border-gray-200"
                  >
                    View
                  </Link>
                  {!room.isFeatured && (
                    <button
                      onClick={() => handlePromote(room.id)}
                      disabled={!canPromoteRooms}
                      title={canPromoteRooms ? "Promote this room to featured" : "Owner premium is required to promote rooms"}
                      className={`flex-1 text-center font-medium py-2 rounded-lg transition-colors border ${
                        canPromoteRooms
                          ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                          : "cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                      }`}
                    >
                      {canPromoteRooms ? "Promote" : "Premium Required"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-10">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Rent UTR Verification</h2>
          <p className="mt-1 text-sm text-gray-500">Approve rent payments after checking the user's UTR reference.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{payment.roomTitle}</div>
                    <div className="text-xs text-gray-500">Move-in: {payment.moveInDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{payment.userName}</div>
                    <div className="text-sm text-gray-500">{payment.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">Rs. {payment.amount}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{payment.utrNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      payment.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {payment.status === "pending" ? (
                      <button
                        onClick={() => handleVerifyRentPayment(payment.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        Verify Payment
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Verified</span>
                    )}
                  </td>
                </tr>
              ))}
              {rentPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                    No rent UTR submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Booking Requests</h2>
      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center border border-gray-100">
          <p className="text-gray-500">No booking requests yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.roomTitle}</div>
                      <Link to={`/rooms/${booking.roomId}`} className="text-xs text-blue-600 hover:underline">View Room</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                      <div className="text-sm text-gray-500">{booking.userEmail}</div>
                      <div className="text-sm text-gray-500">{booking.userPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center mb-1">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" /> Move-in: {booking.moveInDate}
                      </div>
                      <div className="text-sm text-gray-500">Duration: {booking.duration} days</div>
                      <div className="text-sm text-gray-500">People: {booking.people}</div>
                      {booking.moveInPackage && booking.moveInPackage.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 font-semibold">Packages:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {booking.moveInPackage.map((pkg: string) => (
                              <span key={pkg} className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-medium">
                                {pkg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'pending' || booking.status === 'pending_payment' ? 'bg-amber-100 text-amber-800' :
                        booking.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'approved' || booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {booking.status === 'pending' || booking.status === 'pending_payment' || booking.status === 'under_review' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <CheckCircle className="h-5 w-5 mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <XCircle className="h-5 w-5 mr-1" /> Reject
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminContact && (
        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Submit a Query</h3>
          <p className="mt-1 text-sm text-gray-500">Send a message to admin. Track replies in Support.</p>
          <form onSubmit={handleSubmitSupportQuery} className="mt-4 space-y-3">
            <textarea
              value={supportQueryText}
              onChange={(e) => setSupportQueryText(e.target.value)}
              placeholder="Write your query..."
              rows={4}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={supportSubmitting || !supportQueryText.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {supportSubmitting ? "Submitting..." : "Send Query"}
              </button>
              <Link to="/support" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Open Support Inbox
              </Link>
            </div>
            {supportMessage && (
              <p className="text-sm text-gray-500">{supportMessage}</p>
            )}
          </form>
        </div>
      )}
      </div>
    </DashboardShell>
  );
}

