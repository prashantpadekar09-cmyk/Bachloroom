import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Crown,
  Edit2,
  Heart,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  ArrowRightLeft,
  Clock,
  ExternalLink,
  Plus,
  Minus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  DashboardHero,
  DashboardLoading,
  DashboardShell,
  DashboardStatCard,
  DashboardSurface,
} from "../components/dashboard/DashboardTheme";
import ReferralCard from "../components/referrals/ReferralCard";
import CreditPurchaseModal from "../components/CreditPurchaseModal";

type Tab = "profile" | "wallet" | "saved" | "messages" | "settings";

const validTabs: Tab[] = ["profile", "wallet", "saved", "messages", "settings"];

export default function UserDashboard() {
  const { user, token, logout, updateUser, refreshUser } = useAuth();
  const location = useLocation();
  const requestedTab = new URLSearchParams(location.search).get("tab");
  const initialTab = validTabs.includes(requestedTab as Tab) ? (requestedTab as Tab) : "profile";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [savedRooms, setSavedRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(Boolean(user?.isPremium));
  const [premiumPayment, setPremiumPayment] = useState<any>(null);
  const [creditPayment, setCreditPayment] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportQueryText, setSupportQueryText] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  useEffect(() => {
    // Refresh user context immediately on mount to get latest credits
    refreshUser();

    const fetchData = async () => {
      setLoading(true);
      try {
        const [savedRes, premiumStatusRes, creditStatusRes] = await Promise.all([
          fetch("/api/saved-rooms", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/payments/premium/status", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/payments/manual-credits/status", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (savedRes.ok) {
          const data = await savedRes.json();
          setSavedRooms(data.rooms || []);
        }

        if (premiumStatusRes.ok) {
          const data = await premiumStatusRes.json();
          setIsPremium(Boolean(data.isPremium));
          setPremiumPayment(data.payment || null);
        }

        if (creditStatusRes.ok) {
          const data = await creditStatusRes.json();
          setCreditPayment(data.payment || null);
        }

        const historyRes = await fetch("/api/users/wallet/history", { headers: { Authorization: `Bearer ${token}` } });
        if (historyRes.ok) {
          const data = await historyRes.json();
          setWalletHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, updateUser, user?.subscriptionPlan]);

  const refreshDashboardData = async () => {
    try {
      setLoading(true);
      const [historyRes, _] = await Promise.all([
        fetch("/api/users/wallet/history", { headers: { Authorization: `Bearer ${token}` } }),
        refreshUser(),
        // Also re-fetch current status
        fetch("/api/payments/premium/status", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/payments/manual-credits/status", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setWalletHistory(data.history || []);
      }
      
      // We also need to re-scan for the specific payment states if necessary,
      // but refreshUser() handles the global 'user' fields.
    } catch (err) {
      console.error("Failed to refresh dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

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

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });

      if (!res.ok) {
        return;
      }

      updateUser({
        name: profileForm.name,
        phone: profileForm.phone,
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setPasswordMessage({ type: "success", text: "Password updated successfully" });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Failed to update password" });
      }
    } catch (err) {
      setPasswordMessage({ type: "error", text: "An error occurred" });
    }
  };

  const handleSubmitSupportQuery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supportQueryText.trim()) {
      return;
    }

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

  const handleRemoveSaved = async (savedId: string) => {
    try {
      const res = await fetch(`/api/saved-rooms/${savedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedRooms((current) => current.filter((room) => room.savedId !== savedId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading your renter dashboard..." />;
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "saved", label: "Saved", icon: Heart },
    { id: "messages", label: "Support", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ] as const;

  const dashboardStats = [
    {
      icon: Heart,
      label: "Saved Rooms",
      value: savedRooms.length,
      accent: "rose" as const,
      hint: savedRooms.length ? "Your shortlist is ready for quick comparison." : "Save rooms to compare them later.",
    },
    {
      icon: Wallet,
      label: "Wallet",
      value: `${user?.credits || 0} Credits`,
      accent: "amber" as const,
      hint: user?.credits ? "You have credits available to unlock room contacts." : "Refill your credits to unlock room contacts.",
    },
    {
      icon: ShieldCheck,
      label: "Account",
      value: "Active",
      accent: "emerald" as const,
      hint: "Your account is ready for room discovery, wishlisting, and support.",
    },
    {
      icon: MessageSquare,
      label: "Support",
      value: unreadCount,
      accent: "blue" as const,
      hint: unreadCount ? "You have unread support messages." : "No unread support replies right now.",
    },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8 pb-10">
        <DashboardHero
          eyebrow="Renter Dashboard"
          title={user?.name ? `${user.name}, your room search is cleaner now.` : "Your renter dashboard is cleaner now."}
          description="This dashboard now focuses on premium owner-contact unlocks, saved rooms, profile settings, and support in one cleaner workspace."
          badge={isPremium ? "Premium access active" : "Free plan"}
          actions={
            <>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center rounded-2xl border border-white/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
              >
                Explore Rooms
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <div key={stat.label}>
              <DashboardStatCard
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                accent={stat.accent}
                hint={stat.hint}
              />
            </div>
          ))}
        </div>

        <DashboardSurface>
          <ReferralCard />
        </DashboardSurface>

        {premiumPayment && premiumPayment.status === 'pending' && (
          <DashboardSurface className="p-6 border-amber-200 bg-amber-50/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl animate-pulse">
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">Premium Upgrade Pending</h3>
                <p className="text-sm text-gray-600">
                  Your premium membership request (₹{premiumPayment.amount}) is under review. UTR: {premiumPayment.utrNumber}.
                </p>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                Pending Review
              </div>
            </div>
          </DashboardSurface>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="flex-shrink-0 lg:w-64">
            <DashboardSurface className="p-2 lg:p-3">
              <nav className="hide-scrollbar flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all lg:w-full ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "text-gray-600 hover:bg-white hover:text-blue-600"
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {tab.id === "messages" && unreadCount > 0 ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-rose-500 text-white"}`}>
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </nav>
            </DashboardSurface>
          </div>

          <div className="flex-grow space-y-6">
            {activeTab === "profile" ? (
              <DashboardSurface className="p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                  <button onClick={() => setIsEditingProfile((current) => !current)} className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700">
                    <Edit2 className="h-4 w-4" />
                    {isEditingProfile ? "Cancel" : "Edit Profile"}
                  </button>
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700">
                      Save Changes
                    </button>
                  </form>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Full Name</p>
                      <p className="mt-3 text-lg font-bold text-gray-900">{user?.name || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Email Address</p>
                      <p className="mt-3 text-lg font-bold text-gray-900">{user?.email || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Phone Number</p>
                      <p className="mt-3 text-lg font-bold text-gray-900">{user?.phone || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Account Role</p>
                      <p className="mt-3 text-lg font-bold text-gray-900 capitalize">{user?.role || "user"}</p>
                    </div>
                  </div>
                )}
              </DashboardSurface>
            ) : null}

            {activeTab === "wallet" ? (
              <div className="space-y-6">
                <DashboardSurface className="overflow-hidden bg-[linear-gradient(135deg,#fff7ed_0%,#fffbeb_100%)] p-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white">
                        <Wallet className="mr-2 h-4 w-4 text-amber-300" />
                        Wallet Balance
                      </div>
                      <h2 className="mt-5 text-3xl font-black text-gray-900">{user?.credits || 0} Credits</h2>
                      <p className="mt-3 text-sm leading-7 text-gray-600">
                        Use credits to unlock direct contact details of room owners. 1 unlock costs 1 credit.
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsPurchaseModalOpen(true)}
                      className="rounded-3xl bg-blue-600 px-8 py-4 font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Add Credits
                    </button>
                  </div>
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Total Unlocks</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{walletHistory.filter(h => h.type === 'unlock').length}</p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Plan</p>
                      <p className="mt-2 text-2xl font-black text-gray-900 capitalize">{user?.subscriptionPlan || 'Basic'}</p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Premium Status</p>
                      <p className="mt-2 text-2xl font-black text-gray-900">{user?.isPremium ? 'Active' : 'Free'}</p>
                    </div>
                  </div>
                </DashboardSurface>

                {creditPayment && creditPayment.status === 'pending' && (
                  <DashboardSurface className="p-6 border-amber-200 bg-amber-50/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl animate-pulse">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Credit Purchase Pending</h3>
                        <p className="text-sm text-gray-600">
                          Your payment of ₹{creditPayment.amount} for {creditPayment.packageId.replace('_', ' ')} is under review (UTR: {creditPayment.utrNumber}).
                        </p>
                      </div>
                    </div>
                  </DashboardSurface>
                )}

                <DashboardSurface className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
                      <p className="text-sm text-gray-500">Track your credit purchases and usage.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <Clock className="h-6 w-6 text-slate-400" />
                    </div>
                  </div>

                  {walletHistory.length === 0 ? (
                    <div className="py-12 text-center">
                      <ArrowRightLeft className="mx-auto h-12 w-12 text-slate-100 mb-4" />
                      <p className="text-slate-400 font-medium">No transactions yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {walletHistory.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${item.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                              {item.amount > 0 ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{item.description}</p>
                              <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className={`text-lg font-black ${item.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {item.amount > 0 ? '+' : ''}{item.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardSurface>
              </div>
            ) : null}

            {activeTab === "saved" ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {savedRooms.length === 0 ? (
                  <DashboardSurface className="col-span-full p-12 text-center">
                    <Heart className="mx-auto mb-4 h-12 w-12 text-gray-200" />
                    <p className="mb-4 text-gray-500">Your wishlist is empty.</p>
                    <Link to="/explore" className="font-medium text-blue-600 hover:underline">
                      Browse Rooms
                    </Link>
                  </DashboardSurface>
                ) : (
                  savedRooms.map((room) => (
                    <div key={room.savedId}>
                      <DashboardSurface className="overflow-hidden p-0 group">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-blue-600 backdrop-blur-sm">
                            Rs. {room.price}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="mb-1 text-lg font-bold text-gray-900 line-clamp-1">{room.title}</h3>
                          <p className="mb-4 flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {room.city}
                          </p>
                          <div className="flex items-center gap-2">
                            <Link to={`/rooms/${room.id}`} className="flex-grow rounded-xl border border-gray-100 bg-gray-50 py-2 text-center font-medium text-gray-900 transition-colors hover:bg-gray-100">
                              View Details
                            </Link>
                            <button
                              onClick={() => handleRemoveSaved(room.savedId)}
                              className="rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </DashboardSurface>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === "messages" ? (
              <DashboardSurface>
                <h2 className="text-xl font-bold text-gray-900">Submit a query</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Send your question to admin. You can track replies in the Support inbox.
                </p>
                <form onSubmit={handleSubmitSupportQuery} className="mt-4 space-y-3">
                  <textarea
                    value={supportQueryText}
                    onChange={(event) => setSupportQueryText(event.target.value)}
                    placeholder="Write your query..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
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
                  {supportMessage ? <p className="text-sm text-gray-500">{supportMessage}</p> : null}
                </form>
              </DashboardSurface>
            ) : null}

            {activeTab === "settings" ? (
              <div className="space-y-6">
                <DashboardSurface className="p-8">
                  <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
                    <Lock className="h-5 w-5 text-gray-400" />
                    Change Password
                  </h2>
                  <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                    {passwordMessage.text ? (
                      <div className={`rounded-lg p-3 text-sm font-medium ${passwordMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {passwordMessage.text}
                      </div>
                    ) : null}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-gray-900 py-2 font-medium text-white transition-colors hover:bg-black">
                      Update Password
                    </button>
                  </form>
                </DashboardSurface>

                <DashboardSurface className="p-8">
                  <h2 className="mb-4 text-xl font-bold text-gray-900">Account Summary</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Mail className="h-4 w-4" />
                        Email
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{user?.email || "Not provided"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Phone className="h-4 w-4" />
                        Phone
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{user?.phone || "Not provided"}</p>
                    </div>
                  </div>
                </DashboardSurface>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <CreditPurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        onSuccess={refreshDashboardData}
      />
    </DashboardShell>
  );
}
